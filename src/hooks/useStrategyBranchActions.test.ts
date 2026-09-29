/**
 * Title: A branch pick sends its follow-up without putting it in the question box
 * Purpose: Pin the second half of KB-FOLLOWUP-QUOTE-02 (plan 76 Deck run,
 *          docs/test-evidence/plan76-KB-FOLLOWUP-QUOTE-02.json): for one sample after a branch pick the
 *          question box itself showed the composed "[Strategy follow-up] I'm at: ..." prompt the model
 *          is sent. The prompt goes straight to the Ask as its override; the box was never needed.
 * Used for: useStrategyBranchActions.ts.
 * Does not: Cover the "Enter your own" branch beyond its own box text, or the checklist toggle.
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStrategyBranchActions, type UseStrategyBranchActionsArgs } from "./useStrategyBranchActions";
import { CUSTOM_RESOLUTION_INPUT_PREFIX } from "../data/strategyGuideFollowup";

function setup() {
  const setUnifiedInput = vi.fn();
  const onAskOllama = vi.fn(async () => {});
  const args: UseStrategyBranchActionsArgs = {
    lastExchange: null,
    setStrategyGuideBranches: vi.fn(),
    setStrategyChecklist: vi.fn(),
    setUnifiedInput,
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputHostRef: { current: null },
    lastFlushedExchangeQuestionRef: { current: "" },
    pendingArchiveTurnRef: { current: null },
    lastStrategyAskQuestionRef: { current: "How do I beat the Soul Master in Hollow Knight?" },
    onAskOllama,
  };
  const view = renderHook(() => useStrategyBranchActions(args));
  return { pick: view.result.current.onStrategyBranchPick, setUnifiedInput, onAskOllama };
}

describe("a branch pick", () => {
  it("sends the composed follow-up to the Ask and never writes it into the question box", () => {
    const t = setup();
    t.pick({ id: "b", label: "In the City of Tears" });
    expect(t.onAskOllama).toHaveBeenCalledTimes(1);
    const [composed, opts] = t.onAskOllama.mock.calls[0] as unknown as [string, { threadQuestionDisplay: string }];
    expect(composed).toContain("[Strategy follow-up] I'm at: In the City of Tears");
    expect(opts.threadQuestionDisplay).toBe("I'm at: In the City of Tears");
    for (const call of t.setUnifiedInput.mock.calls) {
      expect(String(call[0])).not.toContain("Strategy follow-up");
    }
  });

  it("still starts the box with the starter line for the 'Enter your own' branch, and asks nothing", () => {
    const t = setup();
    t.pick({ id: "d", label: "Enter your own" });
    expect(t.setUnifiedInput).toHaveBeenCalledWith(CUSTOM_RESOLUTION_INPUT_PREFIX);
    expect(t.onAskOllama).not.toHaveBeenCalled();
  });
});
