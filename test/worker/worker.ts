import { CcipReadRouter } from "../../src";

const router = CcipReadRouter();

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

export default { ...router };
