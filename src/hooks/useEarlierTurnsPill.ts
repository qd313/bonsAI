/**
 * Title: The "N earlier" line's own open/close state, and which days are open under it
 * Purpose: Own whether the older, finished turns are folded behind the "N earlier" line, and which
 * of the day lines under it are open (plan 79: opening the line shows one line per day, not one row
 * per question).
 * Used for: MainTabChatTranscript, the collapsed-history line at the top of the transcript.
 * Solves: The line and the day lines are real D-pad stops that stay on screen while open, so nothing
 * unmounts under the ring and no focus hand-off is needed any more (the old pill vanished when
 * opened and handed the ring to the first revealed row).
 * It also counts the "Show N more" presses of each open day (a day shows six questions, then six more
 * per press), forgets them whenever the day or the whole list closes, and hands Steam's ring to the
 * first newly shown question once a press has drawn it.
 * Does not: Decide how many turns count as "earlier", group them, or draw a line -- the transcript
 * and earlierTurnsByDay.ts do that, using the state this hook hands back.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { takeHolderFocus } from "../utils/chatTranscriptNavHelpers";
import type { NavRefHolder } from "../utils/navFocusRegistry";

export type UseEarlierTurnsPillArgs = {
  /** The finished-turn history. Only its identity (length + first id) matters here. */
  askThreadCollapsed: AskThreadCollapsedTurn[];
  /** A question row's Steam nav node, for putting the ring on a newly shown question. */
  headerNavFor?: (turnId: string) => NavRefHolder;
};

export interface EarlierTurnsPill {
  earlierExpanded: boolean;
  /** Closing also closes every day, so the next opening starts from the day lines alone. */
  setEarlierExpanded: (expanded: boolean) => void;
  /** The day keys (earlierTurnsByDay.ts) whose questions are showing. */
  openDays: ReadonlySet<string>;
  /** Open the day if closed, close it if open. */
  toggleDay: (dayKey: string) => void;
  /** How many times "Show N more" has been pressed on each open day. */
  morePresses: ReadonlyMap<string, number>;
  /** "Show N more" pressed on a day: show its next questions and put the ring on `firstNewId`. */
  showMoreOfDay: (dayKey: string, firstNewId: string) => void;
}

const NO_DAYS: ReadonlySet<string> = new Set();
const NO_PRESSES: ReadonlyMap<string, number> = new Map();

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useEarlierTurnsPill(a: UseEarlierTurnsPillArgs): EarlierTurnsPill {
  const { askThreadCollapsed, headerNavFor } = a;

  const [earlierExpanded, setExpanded] = useState(false);
  const [openDays, setOpenDays] = useState<ReadonlySet<string>>(NO_DAYS);
  const [morePresses, setMorePresses] = useState<ReadonlyMap<string, number>>(NO_PRESSES);
  /* The question the ring goes to once the press that shows it has been drawn. */
  const ringOnTurn = useRef<string | null>(null);
  /* A slot switch (or a cleared thread) re-collapses: the line is about this thread, not the user. */
  const earlierIdentity = `${askThreadCollapsed.length}:${askThreadCollapsed[0]?.id ?? ""}`;
  useEffect(() => {
    setExpanded(false);
    setOpenDays(NO_DAYS);
    setMorePresses(NO_PRESSES);
  }, [earlierIdentity]);

  const setEarlierExpanded = useCallback((expanded: boolean) => {
    setExpanded(expanded);
    if (!expanded) {
      setOpenDays(NO_DAYS);
      setMorePresses(NO_PRESSES);
    }
  }, []);
  const toggleDay = useCallback((dayKey: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (!next.delete(dayKey)) next.add(dayKey);
      return next;
    });
    /* Opening or closing a day starts it over at six questions. */
    setMorePresses((prev) => {
      if (!prev.has(dayKey)) return prev;
      const next = new Map(prev);
      next.delete(dayKey);
      return next;
    });
  }, []);
  const showMoreOfDay = useCallback((dayKey: string, firstNewId: string) => {
    ringOnTurn.current = firstNewId;
    setMorePresses((prev) => new Map(prev).set(dayKey, (prev.get(dayKey) ?? 0) + 1));
  }, []);

  /* After the commit that drew the new questions: Steam's own transfer onto the first of them. The
     "Show N more" line is a different container from the question rows, and it may be gone by now. */
  useLayoutEffect(() => {
    const id = ringOnTurn.current;
    if (!id) return;
    ringOnTurn.current = null;
    const holder = headerNavFor?.(id);
    if (holder) takeHolderFocus(holder);
  });

  return { earlierExpanded, setEarlierExpanded, openDays, toggleDay, morePresses, showMoreOfDay };
}
