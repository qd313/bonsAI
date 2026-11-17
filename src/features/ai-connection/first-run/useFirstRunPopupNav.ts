/**
 * Title: The first-run popup's stops and how the ring moves between them
 *
 * Purpose: Each screen of the first-time setup popup is one column of rows of stops, and this hook names those
 * rows, hands each control the props that make it a stop (its nav node and all four move handlers) and moves the
 * ring with Steam's own transfer onto the stop's nav node. Two screens use it (FirstRunWhereAiRunsModal.tsx):
 * - the first screen: the three tick rows that can be unticked, the Internet downloads switch, then the foot
 *   [OK, install on this Deck] [Use the AI on my PC] [Not now]; Down from the switch lands on OK once the switch is
 *   on and on Not now before (the screen hands that rule in);
 * - the PC screen: the address row [field] [Find LAN], then the foot [Test connection] [Back], entered on Back.
 * It is the Search tab's mechanism (useSearchNav.ts, searchNav.ts) with the one rule that differs: Up from the top
 * row holds still, because a popup has no tab bar above it to leave to.
 *
 * Used for: FirstRunWhereAiRunsModal.tsx and FirstRunPcScreen.tsx.
 *
 * Solves: A popup built from rows, a text field and buttons crosses Steam's containers on every hop, so a plain
 * focus() would move the page's focus while the ring stayed behind. Every hop here is the stop's transfer, and
 * every stop answers all four directions, so nothing depends on Steam's own flow. A row is entered where the
 * screen says (the safe button of a foot, never whichever stop is nearest in x), so an A pressed by habit after a
 * Down does the safe thing.
 *
 * Does not: Draw anything or decide what a press does; the screens pass the actions. Does not reach any control by
 * searching the page.
 */
import { useCallback } from "react";

import { useSearchNav, type SearchNav, type SearchStopProps } from "../../search-tab/useSearchNav";

/** The first screen's rows, top to bottom. The two locked rows (Ollama, the answer model) are not stops. */
export const FIRST_SCREEN_ROWS = ["note_search", "speech", "voice", "allow", "foot"] as const;
/** The first screen's foot: OK (0), Use the AI on my PC (1), Not now (2). The ring starts on Not now. */
export const FOOT_OK = 0;
export const FOOT_PC = 1;
export const FOOT_NOT_NOW = 2;

/** The PC screen's rows: the address field and Find LAN, then the foot [Test connection] [Back]. */
export const PC_SCREEN_ROWS = ["address", "foot"] as const;
export const PC_FOOT_ACTION = 0;
export const PC_FOOT_BACK = 1;

export type FirstRunPopupNav<R extends string> = {
  stop: (row: R, col: number) => SearchStopProps;
  focusStop: SearchNav["focusStop"];
};

/**
 * In: the screen's rows, top first, and `enterAt(from, to)`: the place a row is entered at from another, or null
 * for the first stop. Out: `stop(row, col)` for each control and `focusStop` for landing the ring from code.
 */
export function useFirstRunPopupNav<R extends string>(
  rows: readonly R[],
  enterAt: (from: R, to: R) => number | null,
): FirstRunPopupNav<R> {
  const nav = useSearchNav(rows, enterAt as (from: string, to: string) => number | null);
  const { stop: searchStop, focusStop } = nav;
  const top = rows[0];
  const stop = useCallback(
    (row: R, col: number): SearchStopProps => {
      const props = searchStop(row, col);
      return row === top ? { ...props, onMoveUp: () => true } : props;
    },
    [searchStop, top],
  );
  return { stop, focusStop };
}
