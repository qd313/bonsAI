/**
 * Title: Show details chips: keeping the open chip's details readable
 *
 * Purpose: Work out how far to scroll the pane so the chip holding the ring and the end of its details box
 *          are both on screen above the dock, and do that scroll smoothly (plan 87 F3, the maintainer's
 *          call 6: "the details must stay readable, with a smooth scroll, even if the row moves a little").
 * Used for: useChipLadderReveal.ts (after every step and on the ring's arrival) and ContextChipLadder.tsx
 *           (Down on a chip whose box is too tall to show with it).
 * Solves: With the row held perfectly still, a box opened low in the pane ran behind the suggestion chips and
 *         the question box and was never scrolled to: Spoiler risk's box ended 46.2 px under the question box's
 *         top on the Deck, 2026-10-09 (plan87-M3-CHIPS.json; roadmap: "the last lines of some chips' boxes sit
 *         behind the question box", "walking the chips does not keep the chip's details in view").
 * Does not: Move the ring, or scroll for anything already readable: a step whose box already ends above the
 *           dock leaves the row exactly where it is.
 *
 * Why it never fights Steam or the lift: all three agree on where the chip may be. Steam glides a focused
 * element that is off screen, or (as measured on the Deck for small stops) one lying wholly inside the 116 px
 * it keeps clear at the pane's top, down to that line. The plugin's lift moves a focused element whose bottom
 * is behind the dock. This scroll keeps the chip below Steam's line (its bottom on or under it) and above the
 * dock. A chip inside the margin (the Deck, 2026-10-10: after the rest of a tall box was shown, Steam pulled
 * each row the ring landed on down by itself, 30 to 73 px a step) goes, on the first look, exactly where Steam's
 * glide puts it, and on the later looks the whole grid follows to the line in the same direction, once. So after
 * it neither of the others finds anything to do, and every later pass of this one measures and stops.
 */
import { findScrollablePanel, panelScrollMax, readableBottomOf } from "../utils/chatPanelScroll";

/** Steam's own scroll area keeps this much clear at its top (docs/lessons-learned.md § 3). */
const STEAM_TOP_MARGIN_PX = 116;
/** Room left between a box's end, or the chip, and the dock: the lift's own clearance. */
const DOCK_CLEARANCE_PX = 6;
/** A box ending this little past the dock's top is not hidden (the Deck reads to 0.1 px). */
const HIDDEN_SLACK_PX = 0.5;
/** A scroll this small is no scroll: the browser's whole-number scroll height can promise up to 1 px it cannot give. */
const NO_MOVE_PX = 1;

/** What the placement reads off the screen, all in screen y. */
export type PlacementGeometry = {
  chipTop: number;
  chipBottom: number;
  boxBottom: number;
  paneTop: number;
  readableBottom: number;
  /** The bottom of the grid's top row (the chip's own bottom when that is not known). */
  firstRowBottom?: number;
  /**
   * The first look after the ring lands, which may run before Steam's own glide: a chip inside Steam's margin
   * goes only where that glide puts it (its top on the line), so the two cannot pull different ways; the later
   * looks bring the rest of the grid down.
   */
  firstPass?: boolean;
};

/**
 * How far to scroll (positive: the content moves up) so the chip and its box's end are readable.
 *
 * 1. The chip holding the ring comes first.
 *    - Off the top, or inside the 116 px Steam keeps clear at the pane's top: Steam's own glide pulls such a
 *      chip down to its line the moment it takes focus, and then the next row up, and the next (the Deck,
 *      2026-10-10: 73.4, 29.7, 31.2 and 28.9 px walking Left back from a tall box). So bring the whole grid
 *      down in one move, its top row's bottom onto Steam's line, as far as the open box's end allows; at
 *      the least this chip's bottom onto the line, where Steam leaves it alone.
 *    - Behind the dock: lift it just clear.
 * 2. Then the box's end: if it is behind the dock, scroll it up to just above the dock, but no further than
 *    the chip can go without entering Steam's top margin. A box too tall for that keeps the chip on screen
 *    and shows its end on the next Down instead.
 * 3. Anything already readable: 0.
 */
export function placementDelta(g: PlacementGeometry): number {
  const h = g.chipBottom - g.chipTop;
  const lowestChipTop = g.readableBottom - DOCK_CLEARANCE_PX - h;
  const steamLine = g.paneTop + STEAM_TOP_MARGIN_PX;
  /* A band so short that Steam's line is behind the dock leaves only the pane's own top to keep to. */
  const lineFits = steamLine - h <= lowestChipTop;
  let delta = 0;
  const chipInMargin = g.chipTop < g.paneTop || g.chipBottom < steamLine - 1;
  const gridInMargin = (g.firstRowBottom ?? g.chipBottom) < steamLine - 1;
  if (lineFits && g.firstPass && chipInMargin) return Math.max(g.chipTop - steamLine, g.chipTop - lowestChipTop);
  if (lineFits && (chipInMargin || (gridInMargin && !g.firstPass))) {
    const chipOnLine = g.chipBottom - steamLine;
    const gridOnLine = Math.min(chipOnLine, (g.firstRowBottom ?? g.chipBottom) - steamLine);
    const boxStaysReadable = g.boxBottom - (g.readableBottom - DOCK_CLEARANCE_PX);
    delta = Math.max(Math.min(chipOnLine, Math.max(gridOnLine, boxStaysReadable)), g.chipTop - lowestChipTop);
  } else if (g.chipTop < g.paneTop) delta = g.chipTop - g.paneTop;
  else if (g.chipTop > lowestChipTop) delta = g.chipTop - lowestChipTop;
  const boxEnd = g.boxBottom - delta;
  if (boxEnd > g.readableBottom + HIDDEN_SLACK_PX) {
    const need = boxEnd - (g.readableBottom - DOCK_CLEARANCE_PX);
    const highestChipTop = lineFits ? Math.max(g.paneTop, steamLine - h) : g.paneTop;
    const room = g.chipTop - delta - highestChipTop;
    delta += Math.max(0, Math.min(need, room));
  }
  return delta;
}

/**
 * Scroll `pane` by `delta`, smoothly where the browser can; true when it asked for a real move.
 *
 * A scroll past the pane's end is made possible first: `hold` (the empty block after the details box) grows by
 * the shortfall. The ladder is often the last thing above the dock, with less content after it than the dock is
 * tall, so without this a box at the pane's end could never clear the dock (the Deck, 2026-10-10: Developer
 * details' end stuck 20 px behind the Hide details line, and every later Down asked for a scroll the pane could
 * not give, and so did nothing).
 */
function scrollPaneSmoothlyBy(pane: HTMLElement, delta: number, hold?: HTMLElement | null): boolean {
  const from = pane.scrollTop;
  let max = panelScrollMax(pane);
  const wanted = Math.max(0, from + delta);
  if (hold && wanted > max - NO_MOVE_PX) {
    const held = parseFloat(hold.style.height) || 0;
    hold.style.height = `${Math.ceil(held + wanted - max + NO_MOVE_PX)}px`;
    max = panelScrollMax(pane);
  }
  const to = Math.min(max, wanted);
  if (Math.abs(to - from) < NO_MOVE_PX) return false;
  if (typeof pane.scrollTo === "function") pane.scrollTo({ top: to, behavior: "smooth" });
  else pane.scrollTop = to;
  return true;
}

/**
 * Place the open chip and its box (placementDelta), measuring them now. Does nothing when either has no box
 * yet (not drawn) or there is no pane. True when it scrolled.
 */
export function placeOpenChip(
  chip: HTMLElement | null | undefined,
  box: HTMLElement | null | undefined,
  hold?: HTMLElement | null,
  firstPass = false,
): boolean {
  if (!chip || !box) return false;
  const pane = findScrollablePanel(chip);
  if (!pane) return false;
  const c = chip.getBoundingClientRect();
  if (!(c.bottom - c.top > 0)) return false;
  const grid = chip.parentElement?.getBoundingClientRect();
  const delta = placementDelta({
    chipTop: c.top,
    chipBottom: c.bottom,
    boxBottom: box.getBoundingClientRect().bottom,
    paneTop: pane.getBoundingClientRect().top,
    readableBottom: readableBottomOf(pane),
    firstRowBottom: grid && grid.bottom - grid.top > 0 ? grid.top + (c.bottom - c.top) : undefined,
    firstPass,
  });
  return delta !== 0 && scrollPaneSmoothlyBy(pane, delta, hold);
}

/**
 * A box too tall to show with its chip: scroll its end to just above the dock, whatever that does to the row.
 * True only when it moved the pane, so Down can spend that press on it and keep the ring on the chip.
 */
export function revealBoxEnd(box: HTMLElement | null | undefined, hold?: HTMLElement | null): boolean {
  if (!box) return false;
  const pane = findScrollablePanel(box);
  if (!pane) return false;
  const readable = readableBottomOf(pane);
  const end = box.getBoundingClientRect().bottom;
  if (!(end > readable + HIDDEN_SLACK_PX)) return false;
  return scrollPaneSmoothlyBy(pane, end - (readable - DOCK_CLEARANCE_PX), hold);
}
