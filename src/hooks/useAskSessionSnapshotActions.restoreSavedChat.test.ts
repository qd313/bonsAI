/**
 * Title: A chat opened from disk gets its newest answer back as the last exchange
 * Purpose: Pin the screen half of plan 76 lane 4 ("Older answers lose their 'Was this helpful?' row
 *          after switching chats"): what the callback does with the exchange useChatSlots hands it.
 * Used for: useAskSessionSnapshotActions.ts (restoreLastExchangeFromSavedChat).
 * Does not: Cover the hand-off itself (useChatSlots.test.ts) or the rating memory
 *           (useReplyFeedbackChips.remount.test.tsx).
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAskSessionSnapshotActions, type UseAskSessionSnapshotActionsArgs } from "./useAskSessionSnapshotActions";
import type { LastExchangeSnapshot } from "../types/backgroundAsk";

const SAVED: LastExchangeSnapshot = { question: "  what now?  ", answer: "Go left." };

function setup(initial: LastExchangeSnapshot | null = null) {
  const setLastExchange = vi.fn();
  const setLastRequestId = vi.fn();
  const flushed = { current: "" };
  const args = {
    lastExchange: initial,
    setLastExchange,
    setLastRequestId,
    lastFlushedExchangeQuestionRef: flushed,
    resetReplyFeedback: vi.fn(),
    setOllamaResponse: vi.fn(),
    setIsStreamingPreview: vi.fn(),
    setIsStreamSettling: vi.fn(),
    setThinkingSummary: vi.fn(),
    setLiveReasoning: vi.fn(),
    setAskStopped: vi.fn(),
    setLastApplied: vi.fn(),
    setElapsedSeconds: vi.fn(),
    setStrategyGuideBranches: vi.fn(),
    setStrategyChecklist: vi.fn(),
    setModelPolicyDisclosure: vi.fn(),
    setPresetCarouselInject: vi.fn(),
    setShortcutSetupVariant: vi.fn(),
    setLastTransparency: vi.fn(),
  } as unknown as UseAskSessionSnapshotActionsArgs;
  const view = renderHook((p: { args: UseAskSessionSnapshotActionsArgs }) => useAskSessionSnapshotActions(p.args), {
    initialProps: { args },
  });
  return { view, setLastExchange, setLastRequestId, flushed };
}

describe("restoreLastExchangeFromSavedChat", () => {
  it("sets the exchange, drops the previous chat's request id and marks it as already in the thread", () => {
    const t = setup();
    act(() => t.view.result.current.restoreLastExchangeFromSavedChat(SAVED));
    expect(t.setLastExchange).toHaveBeenCalledWith(SAVED);
    expect(t.setLastRequestId).toHaveBeenCalledWith(null);
    expect(t.flushed.current).toBe("what now?");
  });

  it("leaves a live exchange that is already there alone", () => {
    const t = setup({ question: "live", answer: "richer" });
    act(() => t.view.result.current.restoreLastExchangeFromSavedChat(SAVED));
    expect(t.setLastExchange).not.toHaveBeenCalled();
    expect(t.setLastRequestId).not.toHaveBeenCalled();
    expect(t.flushed.current).toBe("");
  });

  it("does not mistake the chat just left for a live exchange after a switch blanked it", () => {
    const t = setup({ question: "old chat", answer: "old answer" });
    act(() => t.view.result.current.resetLiveAskPresentation());
    act(() => t.view.result.current.restoreLastExchangeFromSavedChat(SAVED));
    expect(t.setLastExchange).toHaveBeenLastCalledWith(SAVED);
  });
});
