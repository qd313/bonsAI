/**
 * Title: The Show reasoning row's own open/closed state, and the live step titles
 * Purpose: Own which turn's reasoning block is open, if any — closed by default, always, and
 * closed again the moment a different turn is expanded. Also remember the step titles of the
 * thinking that is being written right now, across polls.
 * Used for: MainTabChatTranscript.tsx's `renderReasoningFold` and its live thinking block.
 * Solves: A reopened saved chat and a panel closed and opened again both come back closed, and
 * switching which turn is open closes whichever one was open before. The live block shows step
 * titles read from all the thinking the screen has received, not only the newest 600-character
 * slice, so an early step does not vanish once the model has written past it.
 * Does not: Draw the row, its open block or the live block — the transcript and
 * buildReasoningFoldElement.tsx do, from the state this hands back.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { liveStepLines, mergeLiveSteps, type LiveStep, type LiveStepLine } from "../utils/reasoningDisplay";

export interface ReasoningFoldState {
  reasoningOpenFor: string | null;
  setReasoningOpenFor: Dispatch<SetStateAction<string | null>>;
  /** What the live thinking block draws: step titles only, at most five. Empty draws nothing. */
  liveSteps: LiveStepLine[];
}

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 *
 * `liveReasoningPartial` is the newest thinking slice the screen holds for the live turn. It is
 * emptied when a new question starts (useBonsaiAskOrchestration sets it to nothing), and that is
 * what clears the steps remembered from the turn before.
 */
export function useReasoningFoldState(
  expandedTurnKey: string | null | undefined,
  liveReasoningPartial = "",
): ReasoningFoldState {
  const [reasoningOpenFor, setReasoningOpenFor] = useState<string | null>(null);
  useEffect(() => {
    setReasoningOpenFor(null);
  }, [expandedTurnKey]);

  /*
   * Merging is safe to repeat on the same slice (a step number keeps its title), so running it
   * during render, and twice under React's strict mode, gives the same steps.
   */
  const seenSteps = useRef<LiveStep[]>([]);
  const liveSteps = useMemo(() => {
    if (!liveReasoningPartial.trim()) {
      seenSteps.current = [];
      return [];
    }
    seenSteps.current = mergeLiveSteps(seenSteps.current, liveReasoningPartial);
    return liveStepLines(seenSteps.current);
  }, [liveReasoningPartial]);

  return { reasoningOpenFor, setReasoningOpenFor, liveSteps };
}
