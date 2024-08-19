import type {
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
  ExtractAbiFunctions,
} from "abitype";
import {
  error,
  json,
  Router,
  type IRequest,
  type RouterOptions,
} from "itty-router";
import {
  decodeFunctionData,
  encodeFunctionResult,
  getAbiItem,
  isAddress,
  isHex,
  toFunctionSelector,
  type Abi,
  type AbiFunction,
  type AbiItemName,
  type Address,
  type Hex,
} from "viem";

type CcipRouterOptions<abi extends Abi> = {
  abi: abi;
} & Pick<RouterOptions, "before" | "catch" | "finally" | "base">;

type RpcRequest = {
  to: Address;
  data: Hex;
};

type RpcResponse = {
  status: number;
  body: unknown;
};

export type AbiFunctionHandler<abiFunc extends AbiFunction> = (
  args: AbiParametersToPrimitiveTypes<abiFunc["inputs"]>,
  req: RpcRequest
) =>
  | Promise<AbiParametersToPrimitiveTypes<abiFunc["outputs"]>>
  | AbiParametersToPrimitiveTypes<abiFunc["outputs"]>;
type AbiHandler<abiFunc extends AbiFunction> = {
  type: abiFunc;
  handle: AbiFunctionHandler<abiFunc>;
};

export const CcipRouter = <
  const abi extends Abi,
  abiFunctions extends ExtractAbiFunctions<abi> = ExtractAbiFunctions<abi>,
  abiFunctionNames extends ExtractAbiFunctionNames<abi> = ExtractAbiFunctionNames<abi>
>({
  abi,
  base,
  before,
  catch: catchFn,
  finally: finallyFn,
}: CcipRouterOptions<abi>) => {
  const router = Router<IRequest, [], Response>({
    base,
    before,
    catch: catchFn,
    finally: finallyFn,
  });
  const handlers = new Map<Hex, AbiHandler<abiFunctions>>();

  const call = async ({ to, data }: RpcRequest): Promise<RpcResponse> => {
    const selector = data.slice(0, 10).toLowerCase() as Hex;

    // Find a function handler for this selector
    const handler = handlers.get(selector);
    if (!handler)
      return {
        status: 404,
        body: {
          data: {
            error: `No implementation for function with selector ${selector}`,
          },
        },
      };

    // Decode function arguments
    const { args } = decodeFunctionData({ abi: [handler.type], data });

    // Call the handler
    const result = await handler.handle(
      args as AbiParametersToPrimitiveTypes<(typeof handler)["type"]["inputs"]>,
      { to, data }
    );

    // Encode return data
    return {
      status: 200,
      body: {
        data: handler.type.outputs
          ? encodeFunctionResult<readonly [unknown]>({
              abi: [handler.type],
              result: result as readonly unknown[],
            })
          : "0x",
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
      return error(400, "Invalid request format");

    try {
      const response = await call({ to: sender, data: callData });
      return json(response.body, { status: response.status });
    } catch (e) {
      return json(
        { data: { error: `Internal server error: ${(e as any).toString()}` } },
        { status: 500 }
      );
    }
  };

  const add = ({
    name,
    handler,
  }: {
    [key in abiFunctionNames]: {
      name: key;
      handler: AbiFunctionHandler<ExtractAbiFunction<abi, key>>;
    };
  }[abiFunctionNames]) => {
    const fn = getAbiItem<Abi, AbiItemName<Abi>>({ abi, name }) as
      | abiFunctions
      | undefined;
    if (!fn) throw new Error("ABI function not found");

    const selector = toFunctionSelector(fn);
    if (handlers.has(selector)) throw new Error("Handler already exists");

    handlers.set(selector, { type: fn, handle: handler });
  };

  router.get("/:sender/:callData", handleRequest);
  router.post("/", handleRequest);

  return {
    add,
    call,
    fetch: router.fetch,
  };
};
