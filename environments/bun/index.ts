import { CcipReadRouter } from "@ensdomains/ccip-read-router";
import { encodeFunctionData, parseAbi, zeroAddress } from "viem";

const sig = "function foo() pure returns (uint256)" as const;

const router = CcipReadRouter({ port: 3001 });

router.add({
  type: sig,
  handle: async () => {
    return [42n];
  },
});

Bun.serve(router);

const response = await fetch(
  `http://localhost:3001/${zeroAddress}/${encodeFunctionData({
    abi: parseAbi([sig]),
    functionName: "foo",
  })}.json`
);
const result = await response.text();
const expected = {
  status: 200,
  body: `{"data":"0x000000000000000000000000000000000000000000000000000000000000002a"}`,
};

if (response.status !== expected.status) throw new Error("Request failed");
if (result != expected.body) throw new Error("Unexpected response");

process.exit(0);
