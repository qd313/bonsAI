/**
 * Title: Strategy Guide branch picks and checklist toggles
 * Purpose: Own the two things a person does with the Strategy Guide panel that are not asking
 *          a fresh question outright: picking a branch (which sends a composed follow-up) and
 *          checking or unchecking an item on the checklist.
 * Used for: The Ask hook calls this; the Main tab wires the branch buttons and checklist rows
 *           to whatever comes out of it.
 * Solves: Both are reactions to the Strategy Guide panel already on screen, not part of the
 *         submit path itself — they end up calling into it (a branch pick sends its own
 *         composed question), but deciding what to send and archiving the turn that led to it
 *         is its own small job.
 * Does not: Ask anything on its own — onStrategyBranchPick hands its composed question to the
 *           Ask hook's own onAskOllama, handed in here. Does not own the checklist's per-game
 *           disk sync — see useStrategyChecklistSession for that.
 * Caution: Lifted out of useBonsaiAskOrchestration on 2026-09-24. It must stay at exactly this
 *          point in the Ask hook's own hook list, after onAskOllama is declared — React
 *          matches hooks by the order they run, not by name, and this reads onAskOllama by
 *          closure rather than through a ref, so it must run after that callback exists.
 */
import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";

import {
  CUSTOM_RESOLUTION_INPUT_PREFIX,
  isStrategyCustomResolutionBranch,
  STRATEGY_FOLLOWUP_PREFIX,
} from "../data/strategyGuideFollowup";
import { scheduleStrategyChecklistSessionSave } from "../utils/strategyChecklistPersistence";
import type { LastExchangeSnapshot, PendingArchiveTurn } from "../types/backgroundAsk";
import type {
  StrategyChecklistState,
  StrategyGuideBranchesPayload,
} from "../types/bonsaiUi";

export type UseStrategyBranchActionsArgs = {
  lastExchange: LastExchangeSnapshot | null;
  setStrategyGuideBranches: Dispatch<SetStateAction<StrategyGuideBranchesPayload | null>>;
  setStrategyChecklist: Dispatch<SetStateAction<StrategyChecklistState | null>>;
  setUnifiedInput: (value: string) => void;
  unifiedInputFieldLayerRef: RefObject<HTMLDivElement | null>;
  unifiedInputHostRef: RefObject<HTMLDivElement | null>;
  activeSlotIdRef?: RefObject<string | null>;
  /** The last turn whose archive was already flushed, so a branch pick does not re-archive it. */
  lastFlushedExchangeQuestionRef: RefObject<string>;
  /** Shared with the Ask hook: a branch pick stages the previous turn here for the next flush. */
  pendingArchiveTurnRef: RefObject<PendingArchiveTurn | null>;
  /** The last question actually sent under Strategy mode, quoted back as "Earlier I asked". */
  lastStrategyAskQuestionRef: RefObject<string>;
  /** Sends the composed follow-up. Declared above this hook's call site in the Ask hook. */
  onAskOllama: (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => Promise<void> | void;
};

export interface StrategyBranchActions {
  onStrategyBranchPick: (opt: { id: string; label: string }) => void;
  onStrategyChecklistToggle: (itemId: string, checked: boolean) => void;
}

/**
 * Own a Strategy Guide branch pick and a checklist toggle.
 *
 * Called from exactly one point in the Ask hook, after onAskOllama — React matches hooks by
 * the order they run in, not by name.
 */
export function useStrategyBranchActions(a: UseStrategyBranchActionsArgs): StrategyBranchActions {
  const {
    lastExchange,
    setStrategyGuideBranches,
    setStrategyChecklist,
    setUnifiedInput,
    unifiedInputFieldLayerRef,
    unifiedInputHostRef,
    activeSlotIdRef,
    lastFlushedExchangeQuestionRef,
    pendingArchiveTurnRef,
    lastStrategyAskQuestionRef,
    onAskOllama,
  } = a;

  const onStrategyBranchPick = useCallback(
    (opt: { id: string; label: string }) => {
      if (isStrategyCustomResolutionBranch(opt)) {
        setStrategyGuideBranches(null);
        setUnifiedInput(CUSTOM_RESOLUTION_INPUT_PREFIX);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const root = unifiedInputFieldLayerRef.current ?? unifiedInputHostRef.current;
            if (!root) return;
            const field = root.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input");
            if (!field) return;
            field.focus();
            const len = field.value.length;
            try {
              field.setSelectionRange(len, len);
            } catch {
              // decky field quirks
            }
          });
        });
        return;
      }
      if (lastExchange?.question?.trim() && lastExchange?.answer?.trim()) {
        const qn = lastExchange.question.trim();
        if (lastFlushedExchangeQuestionRef.current !== qn) {
          pendingArchiveTurnRef.current = {
            question: lastExchange.question,
            answer: lastExchange.answer,
            slotId: activeSlotIdRef?.current ?? null,
          };
        }
      }
      const prior = lastStrategyAskQuestionRef.current.trim();
      const composed = [
        `${STRATEGY_FOLLOWUP_PREFIX} I'm at: ${opt.label}.`,
        prior ? `Earlier I asked: ${prior}` : "",
        "",
        "Give controller-friendly coaching for this exact point, then end with **If you want to cheat…** as instructed.",
      ]
        .filter((line) => line.length > 0)
        .join("\n");
      setUnifiedInput(composed);
      void onAskOllama(composed, { threadQuestionDisplay: `I'm at: ${opt.label}` });
    },
    [
      lastExchange,
      setStrategyGuideBranches,
      setUnifiedInput,
      unifiedInputFieldLayerRef,
      unifiedInputHostRef,
      activeSlotIdRef,
      lastFlushedExchangeQuestionRef,
      pendingArchiveTurnRef,
      lastStrategyAskQuestionRef,
      onAskOllama,
    ],
  );

  const onStrategyChecklistToggle = useCallback((itemId: string, checked: boolean) => {
    setStrategyChecklist((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.checkedIds);
      if (checked) set.add(itemId);
      else set.delete(itemId);
      const next: StrategyChecklistState = { ...prev, checkedIds: [...set] };
      scheduleStrategyChecklistSessionSave(next);
      return next;
    });
  }, []);

  return { onStrategyBranchPick, onStrategyChecklistToggle };
}
