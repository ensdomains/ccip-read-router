// // test/index.spec.ts
import { SELF } from "cloudflare:test";
import { encodeFunctionData, zeroAddress, type Address, type Hex } from "viem";
import { expect, it } from "vitest";

const abi = [
  {
    type: "function",
    name: "foo",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "bar",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "nonexistent",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "pure",
  },
] as const;

const createRequest = ({
  method,
  to = zeroAddress,
  data,
}: {
  method: "GET" | "POST";
  to?: Address;
  data: Hex;
}) => {
  if (method === "GET")
    return new Request(`http://localhost/${to}/${data}.json`);
  return new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ sender: to, data }),
  });
};

it("returns correct value", async () => {
  const response = await SELF.fetch(
    createRequest({
      method: "GET",
      data: encodeFunctionData({ abi, functionName: "foo" }),
    })
  );
  expect(await response.json()).toMatchInlineSnapshot(`
      {
        "data": "0x000000000000000000000000000000000000000000000000000000000000002a",
      }
    `);
});

it("returns an error when the function does not exist", async () => {
  const response = await SELF.fetch(
    createRequest({
      method: "GET",
      data: encodeFunctionData({ abi, functionName: "nonexistent" }),
    })
  );
  expect(await response.json()).toMatchInlineSnapshot(`
    {
      "message": "No implementation for function with selector 0xfa2cc503",
    }
  `);
});
