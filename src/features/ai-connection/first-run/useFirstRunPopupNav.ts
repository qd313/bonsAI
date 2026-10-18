/**
 * Title: The first-run popup's stops and how the ring moves between them
 *
 * Purpose: The "Where should the AI run?" popup is one column of stops, top to bottom: the Run AI switch,
 * then (switch on) the Start-with-the-Deck switch or (switch off) the PC address row, then the foot row:
 * the action on the left, Not now on the right (the maintainer's rule of 2026-10-18, Cancel on the right in
 * every box; the ring starts on Not now). This hook names those rows, hands each control the props that make it
 * a stop (its nav node and all four move handlers) and moves the ring with Steam's own transfer onto the
 * stop's nav node. It is the Search tab's mechanism (useSearchNav.ts, searchNav.ts) with the one rule that
 * differs: Up from the top stop holds still, because a popup has no tab bar above it to leave to.
 *
 * Used for: FirstRunWhereAiRunsModal.tsx.
 *
 * Solves: A popup built from a text field, two switches and buttons crosses Steam's containers on every
 * hop, so a plain focus() would move the page's focus while the ring stayed behind. Every hop here is the
 * stop's transfer, and every stop answers all four directions, so nothing depends on Steam's own flow.
 * Down from the address row and Up from the foot row land on the stop each row is entered at (the address
 * field; Not now, the safe button, which is the second stop of the foot), never on whichever stop is nearest in
 * x, so the safe button is the one Down reaches.
 *
 * Does not: Draw anything or decide what a press does; the popup passes the actions. Does not reach any
 * control by searching the page.
 */
import { useCallback } from "react";

import { useSearchNav, type SearchNav, type SearchStopProps } from "../../search-tab/useSearchNav";

/** The popup's rows, top to bottom. A row whose controls are not drawn is skipped by the walk. */
export const FIRST_RUN_ROWS = ["run", "start", "address", "foot"] as const;
export type FirstRunRow = (typeof FIRST_RUN_ROWS)[number];

/** The row whose Up must hold still: nothing is above the first switch. */
const TOP_ROW: FirstRunRow = "run";

/** The foot's stops: the action (0) and Not now (1). The foot is entered on Not now, and the ring starts there. */
export const FOOT_ACTION = 0;
export const FOOT_NOT_NOW = 1;

/** Entering the address row lands on its first stop (the field); the foot row on its second, Not now. */
function enterAt(_from: string, to: string): number | null {
  if (to === "address") return 0;
  return to === "foot" ? FOOT_NOT_NOW : null;
}

export type FirstRunPopupNav = {
  stop: (row: FirstRunRow, col: number) => SearchStopProps;
  focusStop: SearchNav["focusStop"];
};

/** In: nothing. Out: `stop(row, col)` for each control and `focusStop` for landing the ring from code. */
export function useFirstRunPopupNav(): FirstRunPopupNav {
  const nav = useSearchNav(FIRST_RUN_ROWS, enterAt);
  const { stop: searchStop, focusStop } = nav;
  const stop = useCallback(
    (row: FirstRunRow, col: number): SearchStopProps => {
      const props = searchStop(row, col);
      return row === TOP_ROW ? { ...props, onMoveUp: () => true } : props;
    },
    [searchStop],
  );
  return { stop, focusStop };
}
