/**
 * Title: The "N earlier" line's own open/close state, and which days are open under it
 * Purpose: Own whether the older, finished turns are folded behind the "N earlier" line, and which
 * of the day lines under it are open (plan 79: opening the line shows one line per day, not one row
 * per question).
 * Used for: MainTabChatTranscript, the collapsed-history line at the top of the transcript.
 * Solves: The line and the day lines are real D-pad stops that stay on screen while open, so nothing
 * unmounts under the ring and no focus hand-off is needed any more (the old pill vanished when
 * opened and handed the ring to the first revealed row).
 * Does not: Decide how many turns count as "earlier", group them, or draw a line -- the transcript
 * and earlierTurnsByDay.ts do that, using the state this hook hands back.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useCallback, useEffect, useState } from "react";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

export type UseEarlierTurnsPillArgs = {
  /** The finished-turn history. Only its identity (length + first id) matters here. */
  askThreadCollapsed: AskThreadCollapsedTurn[];
};

export interface EarlierTurnsPill {
  earlierExpanded: boolean;
  /** Closing also closes every day, so the next opening starts from the day lines alone. */
  setEarlierExpanded: (expanded: boolean) => void;
  /** The day keys (earlierTurnsByDay.ts) whose questions are showing. */
  openDays: ReadonlySet<string>;
  /** Open the day if closed, close it if open. */
  toggleDay: (dayKey: string) => void;
}

const NO_DAYS: ReadonlySet<string> = new Set();

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useEarlierTurnsPill(a: UseEarlierTurnsPillArgs): EarlierTurnsPill {
  const { askThreadCollapsed } = a;

  const [earlierExpanded, setExpanded] = useState(false);
  const [openDays, setOpenDays] = useState<ReadonlySet<string>>(NO_DAYS);
  /* A slot switch (or a cleared thread) re-collapses: the line is about this thread, not the user. */
  const earlierIdentity = `${askThreadCollapsed.length}:${askThreadCollapsed[0]?.id ?? ""}`;
  useEffect(() => {
    setExpanded(false);
    setOpenDays(NO_DAYS);
  }, [earlierIdentity]);

  const setEarlierExpanded = useCallback((expanded: boolean) => {
    setExpanded(expanded);
    if (!expanded) setOpenDays(NO_DAYS);
  }, []);
  const toggleDay = useCallback((dayKey: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (!next.delete(dayKey)) next.add(dayKey);
      return next;
    });
  }, []);

  return { earlierExpanded, setEarlierExpanded, openDays, toggleDay };
}
