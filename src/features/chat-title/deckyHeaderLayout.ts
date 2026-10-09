/**
 * Title: The top of the panel, in points, before and after the tab bar moves into Steam's strip
 *
 * Purpose: The arithmetic behind plan 84 step 6, in one place, so it is a test and not a guess (step 3
 * slipped by 3 points because its arithmetic was not one). Steam leaves an empty 14-point strip at the
 * top of every Quick Access page; Decky's title bar under it has 6 points of padding, then a 28-point
 * row (its back arrow, bonsAI's chat name); Decky then leaves a 16-point gap before bonsAI's box, and
 * bonsAI's tab bar (20) and its 4-point gap took the next 24. Step 6 moves Decky's own page up into
 * Steam's strip, grows Decky's title padding to the tab bar's height, and draws the bar in that padding:
 *
 *     today (every tab)              Main, step 6                   other tabs, step 6
 *     0-14   Steam's strip           0-20   bonsAI's tab bar        0-20   bonsAI's tab bar
 *     20-48  arrow, chat name        20-48  arrow, chat name        24-    bonsAI's box
 *     64-84  bonsAI's tab bar        52-    bonsAI's box
 *     88-    bonsAI's box's body
 *
 * The chat's name does not move at all (14 + 6 = 20 = the bar's height), and on the Main tab the body
 * starts 36 points higher.
 *
 * Used for: deckyHeaderShape.ts (the values it writes onto Decky's parts) and its tests.
 *
 * Does not: Touch the page. Numbers only.
 */
import { TAB_BAR_HEIGHT_PX, TAB_STRIP_BODY_GAP_PX } from "../unified-input/constants";

/** Steam's empty strip at the top of every Quick Access page (padding on its tab container), measured 2026-10-08. */
export const STEAM_STRIP_PX = 14;
/** Decky's title bar: its padding on top, then a row as tall as its back arrow (measured 2026-10-08). */
export const DECKY_TITLE_PAD_TOP_PX = 6;
const DECKY_TITLE_ROW_PX = 28;
/** Decky's gap under its title bar, before bonsAI's box (measured 2026-10-08). */
export const DECKY_GAP_PX = 16;

/** Step 6 moves Decky's own page up by the whole of Steam's strip (never Steam's shared padding: plan 84 test B). */
const PAGE_SHIFT_PX = STEAM_STRIP_PX;
/** Decky's title padding with the bar drawn in it: the bar's own height. */
export const TITLE_PAD_WITH_STRIP_PX = TAB_BAR_HEIGHT_PX;
/** Decky's gap with the bar out of bonsAI's box: bonsAI's own 4-point gap under the bar. */
export const GAP_WITH_STRIP_PX = TAB_STRIP_BODY_GAP_PX;

export type HeaderLayout = {
  /** bonsAI's tab bar, top and bottom. */
  barTop: number;
  barBottom: number;
  /** Decky's row with its back arrow and the chat's name; null when the row is hidden. */
  rowTop: number | null;
  rowBottom: number | null;
  /** Where the tab's own content starts. */
  bodyTop: number;
};

/**
 * In: whether the bar is in Steam's strip (step 6 applied) and whether Decky's row (arrow, chat name) shows.
 * Out: where each part sits, in points from the top of the panel.
 */
export function headerLayout({ strip, row }: { strip: boolean; row: boolean }): HeaderLayout {
  if (!strip) {
    const rowTop = STEAM_STRIP_PX + DECKY_TITLE_PAD_TOP_PX;
    const rowBottom = rowTop + DECKY_TITLE_ROW_PX;
    const barTop = rowBottom + DECKY_GAP_PX;
    const barBottom = barTop + TAB_BAR_HEIGHT_PX;
    return { barTop, barBottom, rowTop, rowBottom, bodyTop: barBottom + TAB_STRIP_BODY_GAP_PX };
  }
  const pageTop = STEAM_STRIP_PX - PAGE_SHIFT_PX;
  const barTop = pageTop;
  const barBottom = barTop + TAB_BAR_HEIGHT_PX;
  const titleBottom = pageTop + TITLE_PAD_WITH_STRIP_PX + (row ? DECKY_TITLE_ROW_PX : 0);
  return {
    barTop,
    barBottom,
    rowTop: row ? pageTop + TITLE_PAD_WITH_STRIP_PX : null,
    rowBottom: row ? titleBottom : null,
    bodyTop: titleBottom + GAP_WITH_STRIP_PX,
  };
}
