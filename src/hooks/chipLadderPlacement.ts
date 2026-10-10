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
 * dock, and brings a chip that is off the top back to Steam's own line, so after it neither of the others
 * finds anything to do, and every later pass of this one measures and finds nothing to do either.
 */
import { findScrollablePanel, panelScrollMax, readableBottomOf } from "../utils/chatPanelScroll";

/** Steam's own scroll area keeps this much clear at its top (docs/lessons-learned.md § 3). */
const STEAM_TOP_MARGIN_PX = 116;
/** Room left between a box's end, or the chip, and the dock: the lift's own clearance. */
const DOCK_CLEARANCE_PX = 6;
/** A box ending this little past the dock's top is not hidden (the Deck reads to 0.1 px). */
const HIDDEN_SLACK_PX = 0.5;

/** What the placement reads off the screen, all in screen y. */
export type PlacementGeometry = {
  chipTop: number;
  chipBottom: number;
  boxBottom: number;
  paneTop: number;
  readableBottom: number;
};

/**
 * How far to scroll (positive: the content moves up) so the chip and its box's end are readable.
 *
 * 1. The chip holding the ring comes first. Off the top: bring it back to Steam's line, where Steam's own
 *    glide would put it. Behind the dock: lift it just clear.
 * 2. Then the box's end: if it is behind the dock, scroll it up to just above the dock, but no further than
 *    the chip can go without entering Steam's top margin (so Steam does not glide it back at the next press).
 *    A box too tall for that keeps the chip on screen and shows its end on the next Down instead.
 * 3. Anything already readable: 0.
 */
export function placementDelta(g: PlacementGeometry): number {
  const h = g.chipBottom - g.chipTop;
  const lowestChipTop = g.readableBottom - DOCK_CLEARANCE_PX - h;
  const steamLine = g.paneTop + STEAM_TOP_MARGIN_PX;
  let delta = 0;
  if (g.chipTop < g.paneTop) delta = g.chipTop - Math.max(g.paneTop, Math.min(steamLine, lowestChipTop));
  else if (g.chipTop > lowestChipTop) delta = g.chipTop - lowestChipTop;
  const boxEnd = g.boxBottom - delta;
  if (boxEnd > g.readableBottom + HIDDEN_SLACK_PX) {
    const need = boxEnd - (g.readableBottom - DOCK_CLEARANCE_PX);
    /* A band so short that Steam's line is behind the dock leaves only the pane's own top to keep to. */
    const highestChipTop = steamLine - h <= lowestChipTop ? Math.max(g.paneTop, steamLine - h) : g.paneTop;
    const room = g.chipTop - delta - highestChipTop;
    delta += Math.max(0, Math.min(need, room));
  }
  return delta;
}

/** Scroll `pane` by `delta`, smoothly where the browser can; true when it asked for a move. */
function scrollPaneSmoothlyBy(pane: HTMLElement, delta: number): boolean {
  const from = pane.scrollTop;
  const to = Math.max(0, Math.min(panelScrollMax(pane), from + delta));
  if (Math.abs(to - from) < 0.5) return false;
  if (typeof pane.scrollTo === "function") pane.scrollTo({ top: to, behavior: "smooth" });
  else pane.scrollTop = to;
  return true;
}

/**
 * Place the open chip and its box (placementDelta), measuring them now. Does nothing when either has no box
 * yet (not drawn) or there is no pane. True when it scrolled.
 */
export function placeOpenChip(chip: HTMLElement | null | undefined, box: HTMLElement | null | undefined): boolean {
  if (!chip || !box) return false;
  const pane = findScrollablePanel(chip);
  if (!pane) return false;
  const c = chip.getBoundingClientRect();
  if (!(c.bottom - c.top > 0)) return false;
  const delta = placementDelta({
    chipTop: c.top,
    chipBottom: c.bottom,
    boxBottom: box.getBoundingClientRect().bottom,
    paneTop: pane.getBoundingClientRect().top,
    readableBottom: readableBottomOf(pane),
  });
  return delta !== 0 && scrollPaneSmoothlyBy(pane, delta);
}

/**
 * A box too tall to show with its chip: scroll its end to just above the dock, whatever that does to the row.
 * True only when it moved the pane, so Down can spend that press on it and keep the ring on the chip.
 */
export function revealBoxEnd(box: HTMLElement | null | undefined): boolean {
  if (!box) return false;
  const pane = findScrollablePanel(box);
  if (!pane) return false;
  const readable = readableBottomOf(pane);
  const end = box.getBoundingClientRect().bottom;
  if (!(end > readable + HIDDEN_SLACK_PX)) return false;
  return scrollPaneSmoothlyBy(pane, end - (readable - DOCK_CLEARANCE_PX));
}
