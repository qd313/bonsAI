/**
 * Title: The Strategy checklist's step nodes and the ring hand-over onto them
 * Purpose: Pin plan 96 F4 (workshop:test-evidence/plan96-P96-F4-TICK.json): on the Deck no checklist step could
 *          be reached with the controller, because the answer's Down chain moved only the page's focus. The
 *          fix keeps one nav node per step and hands Steam's ring to the first or last drawn step through
 *          Steam's own transfer. These tests pin the holders (same one for the same step), which step "first"
 *          and "last" mean, and the cases where nothing is taken (no steps drawn, a node not filled in yet).
 * Used for: strategyChecklistNav.ts.
 * Does not: Prove the ring lands on a step on the Deck; that is the Deck check P96-F4-TICK.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetStrategyChecklistNavForTests,
  setStrategyChecklistStepCount,
  strategyChecklistStepNav,
  takeStrategyChecklistStep,
} from "./strategyChecklistNav";

function fill(index: number, takeFocus: () => unknown = vi.fn(() => true)) {
  strategyChecklistStepNav(index).current = { TakeFocus: takeFocus } as never;
  return takeFocus;
}

afterEach(() => {
  resetStrategyChecklistNavForTests();
});

describe("the checklist step holders", () => {
  it("hands back the same holder for the same step, so a re-draw reuses it", () => {
    expect(strategyChecklistStepNav(1)).toBe(strategyChecklistStepNav(1));
    expect(strategyChecklistStepNav(1)).not.toBe(strategyChecklistStepNav(2));
  });

  it("starts empty", () => {
    expect(strategyChecklistStepNav(0).current).toBeNull();
  });
});

describe("takeStrategyChecklistStep", () => {
  it("'first' takes step 0 through Steam's transfer", () => {
    const t0 = fill(0);
    const t2 = fill(2);
    setStrategyChecklistStepCount(3);
    expect(takeStrategyChecklistStep("first")).toBe(true);
    expect(t0).toHaveBeenCalledWith(true);
    expect(t2).not.toHaveBeenCalled();
  });

  it("'last' takes the last drawn step, as counted", () => {
    const t0 = fill(0);
    const t2 = fill(2);
    const t4 = fill(4); // a stale holder from an earlier, longer checklist must not be taken
    setStrategyChecklistStepCount(3);
    expect(takeStrategyChecklistStep("last")).toBe(true);
    expect(t2).toHaveBeenCalledWith(true);
    expect(t0).not.toHaveBeenCalled();
    expect(t4).not.toHaveBeenCalled();
  });

  it("with one step drawn, first and last are the same step", () => {
    const t0 = fill(0);
    setStrategyChecklistStepCount(1);
    expect(takeStrategyChecklistStep("first")).toBe(true);
    expect(takeStrategyChecklistStep("last")).toBe(true);
    expect(t0).toHaveBeenCalledTimes(2);
  });

  it("returns false with a count of 0, even when a holder is filled", () => {
    const t0 = fill(0);
    setStrategyChecklistStepCount(0);
    expect(takeStrategyChecklistStep("first")).toBe(false);
    expect(takeStrategyChecklistStep("last")).toBe(false);
    expect(t0).not.toHaveBeenCalled();
  });

  it("returns false when the step's holder is not filled in yet", () => {
    setStrategyChecklistStepCount(2);
    expect(takeStrategyChecklistStep("first")).toBe(false);
    expect(takeStrategyChecklistStep("last")).toBe(false);
  });

  it("returns false when Steam declines the transfer, and when the node throws", () => {
    fill(0, vi.fn(() => false));
    setStrategyChecklistStepCount(1);
    expect(takeStrategyChecklistStep("first")).toBe(false);
    fill(0, () => {
      throw new Error("not mounted");
    });
    expect(takeStrategyChecklistStep("first")).toBe(false);
  });

  it("returns false for a holder whose node has no TakeFocus", () => {
    strategyChecklistStepNav(0).current = {} as never;
    setStrategyChecklistStepCount(1);
    expect(takeStrategyChecklistStep("first")).toBe(false);
  });

  it("a negative count is treated as none drawn", () => {
    fill(0);
    setStrategyChecklistStepCount(-4);
    expect(takeStrategyChecklistStep("first")).toBe(false);
  });
});

describe("resetStrategyChecklistNavForTests", () => {
  it("clears the count and empties every holder, but keeps the holders themselves", () => {
    const holder = strategyChecklistStepNav(0);
    fill(0);
    setStrategyChecklistStepCount(1);
    resetStrategyChecklistNavForTests();
    expect(holder.current).toBeNull();
    expect(strategyChecklistStepNav(0)).toBe(holder);
    expect(takeStrategyChecklistStep("first")).toBe(false);
  });
});
