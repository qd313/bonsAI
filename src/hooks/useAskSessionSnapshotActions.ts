/**
 * Title: Ask session snapshot restore and reset
 * Purpose: Three callbacks that put the whole Ask-related slice of state — the answer text,
 *          the turn history, the strategy panels, the thinking display and the rest — back to
 *          one of three shapes: exactly as a saved snapshot had it (the panel was closed and
 *          reopened, or the QAM was closed and reopened), fully blank (a chat slot was
 *          cleared or detached), or blank only where a person switching to a different saved
 *          chat must not still see the chat they just left.
 * Used for: The Ask hook calls this once and returns all three callbacks unchanged in its own
 *           bundle; nothing else calls this directly.
 * Solves: Keeps this bookkeeping — over twenty individual pieces of state, each reset a
 *         different way in each of the three cases — out of the Ask hook's own body.
 * Does not: Decide *when* any of the three run; that stays with whoever holds the snapshot,
 *           the Clear button, or the chat-switch logic. Does not touch the ask bar itself
 *           (the question box text, selection or attachment) — none of the three callbacks
 *           here are that gesture.
 * Caution: Lifted out of useBonsaiAskOrchestration on 2026-09-25. It must stay at exactly this
 *          point in the Ask hook's own hook list — React matches hooks by the order they run,
 *          not by name.
 */
import { useCallback, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { PresetPrompt } from "../data/presets";
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type {
  AppliedResult,
  AskThreadCollapsedTurn,
  AskThreadExpandedTurnKey,
  StrategyChecklistState,
  StrategyGuideBranchesPayload,
} from "../types/bonsaiUi";
import type {
  BackgroundRequestStatus,
  LastExchangeSnapshot,
  LiveReasoningSnapshot,
  PendingArchiveTurn,
  PresetCarouselInjectPayload,
  ReplyFollowUpPending,
} from "../types/backgroundAsk";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import type { BonsaiSessionSurvivalSnapshot } from "../utils/bonsaiSessionSurvival";

export type UseAskSessionSnapshotActionsArgs = {
  setOllamaResponse: Dispatch<SetStateAction<string>>;
  syncOllamaContextFromRunningApp: () => void;
  lastExchange: LastExchangeSnapshot | null;
  setLastExchange: Dispatch<SetStateAction<LastExchangeSnapshot | null>>;
  setAskThreadCollapsed: Dispatch<SetStateAction<AskThreadCollapsedTurn[]>>;
  setAskThreadDisplayQuestion: Dispatch<SetStateAction<string>>;
  setExpandedTurnKey: Dispatch<SetStateAction<AskThreadExpandedTurnKey>>;
  setSuggestedPrompts: Dispatch<SetStateAction<PresetPrompt[]>>;
  setLastTransparency: Dispatch<SetStateAction<TransparencySnapshot | null>>;
  setModelPolicyDisclosure: Dispatch<SetStateAction<ModelPolicyDisclosurePayload | null>>;
  strategyGuideBranchesOwnerSlotIdRef: MutableRefObject<string | null>;
  setStrategyGuideBranches: Dispatch<SetStateAction<StrategyGuideBranchesPayload | null>>;
  setStrategyChecklist: Dispatch<SetStateAction<StrategyChecklistState | null>>;
  setElapsedSeconds: Dispatch<SetStateAction<number | null>>;
  setLastApplied: Dispatch<SetStateAction<AppliedResult | null>>;
  setShortcutSetupVariant: Dispatch<
    SetStateAction<NonNullable<BackgroundRequestStatus["shortcut_setup"]> | null>
  >;
  setPresetCarouselInject: Dispatch<SetStateAction<PresetCarouselInjectPayload | null>>;
  setShowSlowWarning: Dispatch<SetStateAction<boolean>>;
  setLastRequestId: Dispatch<SetStateAction<number | null>>;
  setThinkingSummary: Dispatch<SetStateAction<string | null>>;
  setLiveReasoning: Dispatch<SetStateAction<LiveReasoningSnapshot | null>>;
  isAsking: boolean;
  invalidateRequests: () => void;
  stopAskCompletionWatch: () => void;
  setIsAsking: Dispatch<SetStateAction<boolean>>;
  setIsStreamingPreview: Dispatch<SetStateAction<boolean>>;
  setIsStreamSettling: Dispatch<SetStateAction<boolean>>;
  resetReplyFeedback: () => void;
  pendingArchiveTurnRef: MutableRefObject<PendingArchiveTurn | null>;
  pendingThreadQuestionDisplayRef: MutableRefObject<string | null>;
  pendingReplyFollowUpRef: MutableRefObject<ReplyFollowUpPending | null>;
  lastFlushedExchangeQuestionRef: MutableRefObject<string>;
  setAskStopped: Dispatch<SetStateAction<boolean>>;
};

export type AskSessionSnapshotActions = {
  restoreSessionSnapshot: (snap: BonsaiSessionSurvivalSnapshot) => void;
  resetAskSessionSlice: () => void;
  resetLiveAskPresentation: () => void;
  /** Gives a chat just opened from disk its newest answer as the last exchange, so it keeps its Helpful row. */
  restoreLastExchangeFromSavedChat: (exchange: LastExchangeSnapshot) => void;
};

// See the file header above for what each of the three returned callbacks does and why they
// are kept together.
export function useAskSessionSnapshotActions(
  a: UseAskSessionSnapshotActionsArgs,
): AskSessionSnapshotActions {
  /* The last exchange as of the latest render, for the one callback below that must not overwrite a live one. */
  const lastExchangeRef = useRef<LastExchangeSnapshot | null>(a.lastExchange);
  lastExchangeRef.current = a.lastExchange;

  const restoreSessionSnapshot = useCallback((snap: BonsaiSessionSurvivalSnapshot) => {
    a.setOllamaResponse(snap.ollamaResponse);
    /*
     * Not a blind `setOllamaContext(snap.ollamaContext)`. The snapshot was captured while a
     * modal was open (or the panel was closed) and can name a game that has since been closed —
     * the exact way the Ask box's game tag kept naming a game after it was exited. Re-derived from
     * the running game right now (the same source `syncOllamaContextFromRunningApp` reads),
     * rather than trusting whatever the snapshot says, so a game that closed while the panel was
     * away is not resurrected on the way back.
     */
    a.syncOllamaContextFromRunningApp();
    a.setLastExchange(snap.lastExchange);
    a.setAskThreadCollapsed(snap.askThreadCollapsed);
    a.setAskThreadDisplayQuestion(snap.askThreadDisplayQuestion);
    a.setExpandedTurnKey(snap.expandedTurnKey ?? "live");
    a.setSuggestedPrompts(snap.suggestedPrompts);
    a.setLastTransparency(snap.lastTransparency);
    a.setModelPolicyDisclosure(snap.modelPolicyDisclosure);
    // Same ownership tag the poll path writes: a restored branch block belongs to whichever
    // slot was active when the snapshot was taken, not to whatever slot restores it.
    a.strategyGuideBranchesOwnerSlotIdRef.current = snap.strategyGuideBranches
      ? snap.activeSlotId ?? null
      : null;
    a.setStrategyGuideBranches(snap.strategyGuideBranches);
    a.setStrategyChecklist(snap.strategyChecklist ?? null);
    a.setElapsedSeconds(snap.elapsedSeconds);
    a.setLastApplied(snap.lastApplied);
    a.setShortcutSetupVariant(snap.shortcutSetupVariant);
    a.setPresetCarouselInject(snap.presetCarouselInject);
    a.setShowSlowWarning(snap.showSlowWarning);
    a.setLastRequestId(snap.lastRequestId);
    a.setThinkingSummary(snap.thinkingSummary);
    /* Closing the panel mid-think and opening it again keeps the model's own lines on screen. */
    a.setLiveReasoning(snap.liveReasoning ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.syncOllamaContextFromRunningApp]);

  const resetAskSessionSlice = useCallback(() => {
    if (a.isAsking) {
      a.invalidateRequests();
      a.stopAskCompletionWatch();
      a.setIsAsking(false);
    }
    a.setIsStreamingPreview(false);
    a.setIsStreamSettling(false);
    a.setThinkingSummary(null);
    a.setLiveReasoning(null);
    a.setOllamaResponse("");
    a.syncOllamaContextFromRunningApp();
    a.setLastApplied(null);
    a.setLastExchange(null);
    a.setStrategyGuideBranches(null);
    a.setStrategyChecklist(null);
    a.setElapsedSeconds(null);
    a.setShowSlowWarning(false);
    a.setAskThreadCollapsed([]);
    a.setExpandedTurnKey("live");
    a.setAskThreadDisplayQuestion("");
    a.setLastTransparency(null);
    a.setModelPolicyDisclosure(null);
    a.setPresetCarouselInject(null);
    a.setShortcutSetupVariant(null);
    a.pendingArchiveTurnRef.current = null;
    a.pendingThreadQuestionDisplayRef.current = null;
    a.pendingReplyFollowUpRef.current = null;
    a.lastFlushedExchangeQuestionRef.current = "";
    a.resetReplyFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    a.invalidateRequests,
    a.isAsking,
    a.stopAskCompletionWatch,
    a.syncOllamaContextFromRunningApp,
    a.resetReplyFeedback,
  ]);

  /*
   * The narrower twin of resetAskSessionSlice, for switching to a different saved chat rather
   * than a full detach (Clear cache / QAM restore). It blanks only the LIVE ANSWER a person can
   * see under the question box — the just-finished reply's text, its Helpful/Not really/Read
   * aloud buttons, its thinking fold, the Strategy Guide branch block — so a different chat never
   * draws the one you just left. Roadmap: "A new chat shows the previous chat's last reply until
   * the panel is reopened" — the new chat's own saved file was already empty and correct; nothing
   * had ever cleared THIS state on a plain switch.
   *
   * Deliberately does NOT touch:
   *  - isAsking / invalidateRequests(): a reply still being written in the chat you just left has
   *    to keep going. Stopping it here would silence the busy dot on the slot row and throw away
   *    a real, in-progress answer.
   *  - askThreadCollapsed / askThreadDisplayQuestion / expandedTurnKey: useChatSlots.ts's own
   *    selectSlot() sets these from the slot actually being switched to, right around this call —
   *    overwriting them here would race that and could blank a chat that has real history.
   *  - pendingArchiveTurnRef / pendingThreadQuestionDisplayRef: the turn a foreign in-flight
   *    request is still assembling for the chat you left has to survive so it archives correctly
   *    once that answer completes.
   *  - the ask bar itself (unifiedInput, selectedAttachment): switching chats is
   *    not the same gesture as clearing the question box.
   */
  const resetLiveAskPresentation = useCallback(() => {
    a.setOllamaResponse("");
    a.setIsStreamingPreview(false);
    a.setIsStreamSettling(false);
    a.setThinkingSummary(null);
    a.setLiveReasoning(null);
    a.setAskStopped(false);
    a.setLastApplied(null);
    a.setLastExchange(null);
    lastExchangeRef.current = null;
    a.setElapsedSeconds(null);
    a.setStrategyGuideBranches(null);
    a.setStrategyChecklist(null);
    a.setModelPolicyDisclosure(null);
    a.setPresetCarouselInject(null);
    a.setShortcutSetupVariant(null);
    a.setLastTransparency(null);
    a.resetReplyFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.resetReplyFeedback]);

  /*
   * The other half of a chat switch (plan 76 lane 4, roadmap: "Older answers lose their 'Was this
   * helpful?' row after switching chats"). resetLiveAskPresentation blanks the last exchange, and
   * the row under the newest answer is drawn from it, so a chat opened from disk showed its newest
   * answer with the speaker icon alone. useChatSlots hands the saved newest answer back here once
   * the chat has loaded.
   *
   *  - A live exchange that is already there (the remount's own status read can land first) is
   *    richer -- it knows the model and attachments -- so it is left alone.
   *  - There is no request id for a saved answer; null it rather than leave the previous chat's id
   *    on this chat's rating. The rating is still found again (see useReplyFeedbackChips).
   *  - The flush at the next Ask replays "the turn that just finished" into the thread. This one is
   *    already in it, from disk, so it is marked as flushed and never replayed under the current
   *    game's id.
   */
  const restoreLastExchangeFromSavedChat = useCallback((exchange: LastExchangeSnapshot) => {
    if (lastExchangeRef.current) return;
    lastExchangeRef.current = exchange;
    a.lastFlushedExchangeQuestionRef.current = exchange.question.trim();
    a.setLastRequestId(null);
    a.setLastExchange(exchange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    restoreSessionSnapshot,
    resetAskSessionSlice,
    resetLiveAskPresentation,
    restoreLastExchangeFromSavedChat,
  };
}
