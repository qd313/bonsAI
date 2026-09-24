/**
 * Title: The Show reasoning row's own open/closed state
 * Purpose: Own which turn's reasoning block is open, if any — closed by default, always, and
 * closed again the moment a different turn is expanded.
 * Used for: MainTabChatTranscript.tsx's `renderReasoningFold`.
 * Solves: A reopened saved chat and a panel closed and opened again both come back closed, and
 * switching which turn is open closes whichever one was open before.
 * Does not: Draw the row or its open block — `renderReasoningFold` still does both, from the
 * state this hands back.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export interface ReasoningFoldState {
  reasoningOpenFor: string | null;
  setReasoningOpenFor: Dispatch<SetStateAction<string | null>>;
}

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useReasoningFoldState(expandedTurnKey: string | null | undefined): ReasoningFoldState {
  const [reasoningOpenFor, setReasoningOpenFor] = useState<string | null>(null);
  useEffect(() => {
    setReasoningOpenFor(null);
  }, [expandedTurnKey]);

  return { reasoningOpenFor, setReasoningOpenFor };
}
