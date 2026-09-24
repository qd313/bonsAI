/**
 * Title: The "N earlier" pill's own open/close state
 * Purpose: Own whether the older, finished turns are collapsed behind the "N earlier" pill, and
 * hand the D-pad ring to the first revealed turn header the moment the pill is expanded.
 * Used for: MainTabChatTranscript, the collapsed-history row at the top of the transcript.
 * Solves: Expanding the pill unmounts it, which would otherwise orphan whatever held the ring.
 * Does not: Decide how many turns count as "earlier" or draw the pill itself — the transcript
 * still does both, using the state this hook hands back.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import type { NavRefHolder } from "../utils/navFocusRegistry";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

export type UseEarlierTurnsPillArgs = {
  /** The finished-turn history. Only its identity (length + first id) matters here. */
  askThreadCollapsed: AskThreadCollapsedTurn[];
};

export interface EarlierTurnsPill {
  earlierExpanded: boolean;
  setEarlierExpanded: (expanded: boolean) => void;
  /** navRef for the first turn the pill reveals once expanded. */
  firstArchivedTurnNavRef: MutableRefObject<NavRefHolder["current"]>;
}

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useEarlierTurnsPill(a: UseEarlierTurnsPillArgs): EarlierTurnsPill {
  const { askThreadCollapsed } = a;

  const [earlierExpanded, setEarlierExpanded] = useState(false);
  const firstArchivedTurnNavRef = useRef<NavRefHolder["current"]>(null);
  /* A slot switch (or a cleared thread) re-collapses: the pill is about this thread, not the user. */
  const earlierIdentity = `${askThreadCollapsed.length}:${askThreadCollapsed[0]?.id ?? ""}`;
  useEffect(() => {
    setEarlierExpanded(false);
  }, [earlierIdentity]);
  /* Expanding unmounts the pill, so focus would be orphaned. Hand it to the first revealed row. */
  useLayoutEffect(() => {
    if (!earlierExpanded) return;
    firstArchivedTurnNavRef.current?.TakeFocus?.(true);
  }, [earlierExpanded]);

  return { earlierExpanded, setEarlierExpanded, firstArchivedTurnNavRef };
}
