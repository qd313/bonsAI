import { describe, expect, it } from "vitest";
import { isStrategyCustomResolutionBranch, STRATEGY_BRANCH_CUSTOM_RESOLUTION_ID } from "./strategyGuideFollowup";

describe("isStrategyCustomResolutionBranch", () => {
  it("treats id d with a resolution-style label and id aliases as the custom branch", () => {
    expect(
      isStrategyCustomResolutionBranch({ id: STRATEGY_BRANCH_CUSTOM_RESOLUTION_ID, label: "Enter your own" })
    ).toBe(true);
    expect(
      isStrategyCustomResolutionBranch({ id: "D", label: "Type my resolution" })
    ).toBe(true);
    expect(isStrategyCustomResolutionBranch({ id: "custom", label: "x" })).toBe(true);
    expect(
      isStrategyCustomResolutionBranch({ id: "d", label: "East wing" })
    ).toBe(false);
    expect(isStrategyCustomResolutionBranch({ id: "a", label: "Option A" })).toBe(false);
  });
});
