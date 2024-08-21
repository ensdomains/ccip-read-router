import { CcipReadRouter } from "@ensdomains/ccip-read-router";
import { createServerAdapter } from "@whatwg-node/server";
import { createServer } from "http";
import { encodeFunctionData, parseAbi, zeroAddress } from "viem";

const sig = "function foo() pure returns (uint256)";

const router = CcipReadRouter();

router.add({
  type: sig,
  handle: async () => {
    return [42n];
  },
});

// create a @whatwg-node/server
const ccipReadServer = createServerAdapter(router.fetch);

// then pass that to Node
const httpServer = createServer(ccipReadServer);
httpServer.listen(3001);

const response = await fetch(
  `http://localhost:3001/${zeroAddress}/${encodeFunctionData({
    abi: parseAbi([sig]),
    functionName: "foo",
  })}`
);
const result = await response.text();
const expected = {
  status: 200,
  body: `{"data":"0x000000000000000000000000000000000000000000000000000000000000002a"}`,
};

if (response.status !== expected.status) throw new Error("Request failed");
if (result != expected.body) throw new Error("Unexpected response");

process.exit(0);