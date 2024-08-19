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

const router = CcipRouter({ abi });

router.add({
  name: "foo",
  handler: async () => {
    return [42n];
  },
});
router.add({
  name: "bar",
  handler: async (args) => {
    return args;
  },
});

export default { ...router };
