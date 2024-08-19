import { encodeFunctionData, zeroAddress, type Address, type Hex } from "viem";
import { expect, test } from "vitest";
import { CcipRouter } from "../../src";

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
  if (method === "GET") return new Request(`http://localhost/${to}/${data}`);
  return new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ sender: to, data }),
  });
};

test("returns correct value for single function - get", async () => {
  const router = CcipRouter();
  router.add({
    type: "function foo() pure returns (uint256)",
    handle: async () => {
      return [42n];
    },
  });

  const request = createRequest({
    method: "GET",
    data: encodeFunctionData({ abi, functionName: "foo" }),
  });
  const response = await router.fetch(request);
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result).toMatchInlineSnapshot(`
    {
      "data": "0x000000000000000000000000000000000000000000000000000000000000002a",
    }
  `);
});

test("returns correct value for single function - post", async () => {
  const router = CcipRouter();
  router.add({
    type: "function foo() pure returns (uint256)",
    handle: async () => {
      return [42n];
    },
  });

  const request = createRequest({
    method: "POST",
    data: encodeFunctionData({ abi, functionName: "foo" }),
  });
  const response = await router.fetch(request);
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result).toMatchInlineSnapshot(`
    {
      "data": "0x000000000000000000000000000000000000000000000000000000000000002a",
    }
  `);
});

test("returns correct value for multiple functions - get", async () => {
  const router = CcipRouter();
  router.add({
    type: "function foo() pure returns (uint256)",
    handle: async () => {
      return [42n];
    },
  });
  router.add({
    type: "function bar(uint256) pure returns (uint256)",
    handle: async ([x]) => {
      return [x * 2n];
    },
  });

  const requestFoo = createRequest({
    method: "GET",
    data: encodeFunctionData({ abi, functionName: "foo", args: [] }),
  });
  const responseFoo = await router.fetch(requestFoo);
  const resultFoo = await responseFoo.json();

  expect(responseFoo.status).toBe(200);
  expect(resultFoo).toMatchInlineSnapshot(`
    {
      "data": "0x000000000000000000000000000000000000000000000000000000000000002a",
    }
  `);

  const requestBar = createRequest({
    method: "GET",
    data: encodeFunctionData({ abi, functionName: "bar", args: [40n] }),
  });
  const responseBar = await router.fetch(requestBar);
  const resultBar = await responseBar.json();

  expect(responseBar.status).toBe(200);
  expect(resultBar).toMatchInlineSnapshot(`
    {
      "data": "0x0000000000000000000000000000000000000000000000000000000000000050",
    }
  `);
});

test("returns correct value for multiple functions - post", async () => {
  const router = CcipRouter();
  router.add({
    type: "function foo() pure returns (uint256)",
    handle: async () => {
      return [42n];
    },
  });
  router.add({
    type: "function bar(uint256) pure returns (uint256)",
    handle: async ([x]) => {
      return [x * 2n];
    },
  });

  const requestFoo = createRequest({
    method: "POST",
    data: encodeFunctionData({ abi, functionName: "foo", args: [] }),
  });
  const responseFoo = await router.fetch(requestFoo);
  const resultFoo = await responseFoo.json();

  expect(responseFoo.status).toBe(200);
  expect(resultFoo).toMatchInlineSnapshot(`
    {
      "data": "0x000000000000000000000000000000000000000000000000000000000000002a",
    }
  `);

  const requestBar = createRequest({
    method: "POST",
    data: encodeFunctionData({ abi, functionName: "bar", args: [40n] }),
  });
  const responseBar = await router.fetch(requestBar);
  const resultBar = await responseBar.json();

  expect(responseBar.status).toBe(200);
  expect(resultBar).toMatchInlineSnapshot(`
    {
      "data": "0x0000000000000000000000000000000000000000000000000000000000000050",
    }
  `);
});

test("returns correct value for synchronous handler", async () => {
  const router = CcipRouter();
  router.add({
    type: "function foo() pure returns (uint256)",
    handle: async () => {
      return [42n];
    },
  });

  const request = createRequest({
    method: "GET",
    data: encodeFunctionData({ abi, functionName: "foo" }),
  });
  const response = await router.fetch(request);
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result).toMatchInlineSnapshot(`
    {
      "data": "0x000000000000000000000000000000000000000000000000000000000000002a",
    }
  `);
});

test("returns correct value for direct call request", async () => {
  const router = CcipRouter();
  router.add({
    type: "function foo() pure returns (uint256)",
    handle: async () => {
      return [42n];
    },
  });

  const { status, body } = await router.call({
    to: zeroAddress,
    data: encodeFunctionData({ abi, functionName: "foo" }),
  });
  expect(status).toBe(200);
  expect(body).toMatchInlineSnapshot(`
    {
      "data": "0x000000000000000000000000000000000000000000000000000000000000002a",
    }
  `);
});

test("returns an error when the function does not exist", async () => {
  const router = CcipRouter();

  const request = createRequest({
    method: "GET",
    data: encodeFunctionData({ abi, functionName: "foo" }),
  });
  const response = await router.fetch(request);
  const result = await response.json();

  expect(response.status).toBe(404);
  expect(result).toMatchInlineSnapshot(`
    {
      "data": {
        "error": "No implementation for function with selector 0xc2985578",
      },
    }
  `);
});

test("returns an error when the request throws an exception", async () => {
  const router = CcipRouter();
  router.add({
    type: "function foo() pure returns (uint256)",
    handle: async () => {
      throw new Error("Test error");
    },
  });

  const request = createRequest({
    method: "GET",
    data: encodeFunctionData({ abi, functionName: "foo" }),
  });
  const response = await router.fetch(request);
  const result = await response.json();

  expect(response.status).toBe(500);
  expect(result).toMatchInlineSnapshot(`
    {
      "data": {
        "error": "Internal server error: Error: Test error",
      },
    }
  `);
});

test("returns an error when invalid request format", async () => {
  const router = CcipRouter();

  const request = createRequest({
    method: "POST",
    data: "" as any,
  });
  const response = await router.fetch(request);
  const result = await response.json();

  expect(response.status).toBe(400);
  expect(result).toMatchInlineSnapshot(`
    {
      "error": "Invalid request format",
      "status": 400,
    }
  `);
});
