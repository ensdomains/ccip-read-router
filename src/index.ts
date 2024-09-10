import type { AbiParametersToPrimitiveTypes } from "abitype";
import { json, Router, type IRequest, type RouterOptions } from "itty-router";
import {
  decodeFunctionData,
  encodeFunctionResult,
  isAddress,
  isHex,
  parseAbiItem,
  toFunctionSelector,
  type AbiFunction,
  type Address,
  type Hex,
  type ParseAbiItem,
} from "viem";

export type CcipReadRouterOptions = Exclude<RouterOptions, "routes">;

type RpcRequest = {
  to: Address;
  data: Hex;
};

type RpcResponse = {
  status: number;
  body: unknown;
};

export type AbiFunctionHandler<
  abiFunc extends AbiFunction,
  returnType extends AbiParametersToPrimitiveTypes<abiFunc["outputs"]> | Hex =
    | AbiParametersToPrimitiveTypes<abiFunc["outputs"]>
    | Hex
> = (
  args: AbiParametersToPrimitiveTypes<abiFunc["inputs"]>,
  req: RpcRequest
) => Promise<returnType> | returnType;

type ParseAbiFunction<signature extends string> =
  ParseAbiItem<signature> extends AbiFunction ? ParseAbiItem<signature> : never;

type AddAbiHandlerParameters<abiFunction extends string | AbiFunction> = {
  type: abiFunction;
  handle: AbiFunctionHandler<
    abiFunction extends string ? ParseAbiFunction<abiFunction> : abiFunction
  >;
};

type AbiHandler<abiFunc extends AbiFunction> = {
  type: abiFunc;
  handle: AbiFunctionHandler<abiFunc>;
};

const error = ({ status, message }: { status: number; message: string }) =>
  json({ message }, { status });

export const CcipReadRouter = <const options extends CcipReadRouterOptions>(
  {
    base,
    before,
    catch: catchFn,
    finally: finallyFn,
    ...options
  }: options = {} as options
) => {
  const router = Router<IRequest, [], Response>({
    base,
    before,
    catch: catchFn,
    finally: finallyFn,
  });
  const handlers = new Map<Hex, AbiHandler<AbiFunction>>();

  const call = async ({ to, data }: RpcRequest): Promise<RpcResponse> => {
    const selector = data.slice(0, 10).toLowerCase() as Hex;

    // Find a function handler for this selector
    const handler = handlers.get(selector);
    if (!handler)
      return {
        status: 404,
        body: {
          message: `No implementation for function with selector ${selector}`,
        },
      };

    // Decode function arguments
    const { args } = decodeFunctionData({ abi: [handler.type], data });

    // Call the handler
    const result = await handler.handle(
      args as AbiParametersToPrimitiveTypes<(typeof handler)["type"]["inputs"]>,
      { to, data }
    );

    const returnBytes = (() => {
      if (typeof result === "string") {
        if (!isHex(result))
          throw new Error("Return value must be a hex string");
        return result;
      }

      if (handler.type.outputs)
        return encodeFunctionResult<readonly [unknown]>({
          abi: [handler.type],
          result: result as readonly unknown[],
        });

      return "0x";
    })();

    // Encode return data
    return {
      status: 200,
      body: {
        data: returnBytes,
      },
    };
  };

  const handleRequest = async (req: IRequest) => {
    const [sender, callData] =
      req.method === "GET"
        ? [req.params.sender, req.params.callData]
        : await req
            .json<{ sender?: Address; data?: Hex }>()
            .then(({ sender, data }) => [sender, data]);

    if (!sender || !callData || !isAddress(sender) || !isHex(callData))
      return error({ status: 400, message: "Invalid request format" });

    try {
      const response = await call({ to: sender, data: callData });
      return json(response.body, { status: response.status });
    } catch (e) {
      return error({
        status: 500,
        message: `Internal server error: ${(e as any).toString()}`,
      });
    }
  };

  const add = <abiFunction extends string | AbiFunction>({
    type,
    handle,
  }: AddAbiHandlerParameters<abiFunction>) => {
    const abiFunction = (
      typeof type === "string" ? parseAbiItem(type as string) : type
    ) as AbiFunction;

    const selector = toFunctionSelector(abiFunction);
    if (handlers.has(selector)) throw new Error("Handler already exists");

    handlers.set(selector, {
      type: abiFunction,
      handle: handle as AbiFunctionHandler<AbiFunction>,
    });
  };

  router.get("/:sender/:callData.json", handleRequest);
  router.post("/", handleRequest);

  return {
    ...options,
    add,
    call,
    fetch: router.fetch,
  };
};
