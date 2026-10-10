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
 * Why it never fights Steam or the lift: all three agree on where the chip may be. Steam glides a stop that takes
 * focus with its top above the line it keeps 116 px below the pane's top down until its top is on that line: off
 * screen, wholly inside that margin, or only partly (the Deck, 2026-10-10: chip 2 at 144.1 to 168.5 moved 23.5,
 * the toggle above the grid 57.8, and a row 0.8 px over the line 0.8; plan87-P87-F3-CHIPS-GRID-try2.json). The
 * plugin's lift moves a focused element whose bottom is behind the dock. This scroll keeps the chip above the dock
 * and lifts it no higher than its bottom on Steam's line. A chip that lands over the line goes, on the first look,
 * exactly where Steam's glide puts it, and on the later looks everything a walk back up can reach (the grid's top
 * row and the stop drawn above the grid) follows down onto the line, once, and never back up. So after it neither
 * of the others finds anything to do, and every later pass of this one measures and stops.
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
/** A top this close to Steam's line is on it: the Deck scrolls in whole device pixels, 0.78 page px at 1.28. */
const ON_THE_LINE_PX = 0.5;
/** Bringing stops down to Steam's line, aim this far below it, so a whole-pixel scroll cannot leave one over it. */
const BELOW_THE_LINE_PX = 1;
/** The stop drawn just above the grid counts only when it is a small one, as Steam's glide treats it. */
const SMALL_STOP_PX = 100;

/** What the placement reads off the screen, all in screen y. */
export type PlacementGeometry = {
  chipTop: number;
  chipBottom: number;
  boxBottom: number;
  paneTop: number;
  readableBottom: number;
  /** The top of the grid's top row (the chip's own top when that is not known). */
  firstRowTop?: number;
  /** The top of the small stop drawn just above the ladder (the "This answer | Session" toggle), when there is one. */
  aboveTop?: number;
  /**
   * The first look after the ring lands, which may run before Steam's own glide: a chip over Steam's line goes
   * only where that glide puts it (its top on the line), so the two cannot pull different ways; the later looks
   * bring the rest down.
   */
  firstPass?: boolean;
  /** A later look at a landing whose first look went where Steam's glide goes (the ring left a tall box). */
  leaving?: boolean;
};

/**
 * How far to scroll (positive: the content moves up) so the chip and its box's end are readable.
 *
 * 1. The first look at a chip that landed with its top over Steam's line (off the top, or inside the 116 px it
 *    keeps clear): go exactly where Steam's own glide takes it, its top on the line.
 * 2. The later looks at such a landing, or whenever this chip or the grid's top row lies wholly over the line:
 *    Steam would glide every stop a walk back up can land on (the grid's top row, the stop drawn just above the
 *    grid) as the ring reached it (the Deck, 2026-10-10: 73.4, 29.7, 31.2 and 28.9 px walking Left back from a
 *    tall box; then, with the grid brought down only to its top row's bottom, 23.5 at the second chip and 57.8 at
 *    the toggle). So bring them all down in one move, until the highest one's top is on the line, as far as the
 *    open box's end stays readable, and at the least a chip lying wholly over the line until its bottom meets
 *    it. Never up: a box end left hidden shows on the first Down, and a pass that scrolled up after Steam's glide
 *    came down would be a bounce. The stop above the grid alone never starts this: a box lifted on the way in may
 *    leave the toggle over the line, and the walk on must hold the row.
 * 3. A chip behind the dock: lift it just clear.
 * 4. Then the box's end: if it is behind the dock, scroll it up to just above the dock, but no further than
 *    the chip's bottom meeting Steam's line. A box too tall for that shows its end on the next Down instead.
 * 5. Anything already readable: 0.
 */
export function placementDelta(g: PlacementGeometry): number {
  const h = g.chipBottom - g.chipTop;
  const lowestChipTop = g.readableBottom - DOCK_CLEARANCE_PX - h;
  const steamLine = g.paneTop + STEAM_TOP_MARGIN_PX;
  /* A band so short that Steam's line is behind the dock leaves only the pane's own top to keep to. */
  const lineFits = steamLine - h <= lowestChipTop;
  const firstRowTop = g.firstRowTop ?? g.chipTop;
  const highestStop = Math.min(g.chipTop, firstRowTop, g.aboveTop ?? firstRowTop);
  const chipOverLine = g.chipTop < g.paneTop || g.chipTop < steamLine - ON_THE_LINE_PX;
  const whollyOver = (top: number) => top < g.paneTop || top + h < steamLine - 1;
  const comingDown = g.leaving || whollyOver(g.chipTop) || whollyOver(firstRowTop);
  if (lineFits && g.firstPass && chipOverLine) return Math.max(g.chipTop - steamLine, g.chipTop - lowestChipTop);
  if (lineFits && !g.firstPass && comingDown && highestStop < steamLine - ON_THE_LINE_PX) {
    const allOnLine = highestStop - steamLine - BELOW_THE_LINE_PX;
    const boxStaysReadable = g.boxBottom - (g.readableBottom - DOCK_CLEARANCE_PX);
    let down = Math.min(0, Math.max(allOnLine, boxStaysReadable));
    if (g.chipBottom < steamLine - 1) down = Math.min(down, g.chipBottom - steamLine);
    return Math.max(down, g.chipTop - lowestChipTop);
  }
  let delta = 0;
  if (g.chipTop < g.paneTop) delta = g.chipTop - g.paneTop;
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

/** The top of `el` when it is a small stop that is drawn; else nothing. */
function smallStopTop(el: Element | null | undefined): number | undefined {
  const r = el?.getBoundingClientRect();
  return r && r.bottom - r.top > 0 && r.bottom - r.top < SMALL_STOP_PX ? r.top : undefined;
}

/** What one placement pass is told besides the chip and its box. */
type PlacementPass = {
  /** The empty block after the details box, grown when a scroll needs room past the pane's end. */
  hold?: HTMLElement | null;
  /**
   * The chips' own root: the stop drawn just before it (the "This answer | Session" toggle; a session row in the
   * Session tab) is where Up and Left from the top row go, so it is measured too, never focused.
   */
  ladder?: HTMLElement | null;
  firstPass?: boolean;
  leaving?: boolean;
};

/**
 * Place the open chip and its box (placementDelta), measuring them now. Does nothing when the chip or its box has
 * no box yet (not drawn) or there is no pane. Returns how far it asked the pane to scroll (0: it did not).
 */
export function placeOpenChip(
  chip: HTMLElement | null | undefined,
  box: HTMLElement | null | undefined,
  pass: PlacementPass = {},
): number {
  if (!chip || !box) return 0;
  const pane = findScrollablePanel(chip);
  if (!pane) return 0;
  const c = chip.getBoundingClientRect();
  if (!(c.bottom - c.top > 0)) return 0;
  const grid = chip.parentElement?.getBoundingClientRect();
  const delta = placementDelta({
    chipTop: c.top,
    chipBottom: c.bottom,
    boxBottom: box.getBoundingClientRect().bottom,
    paneTop: pane.getBoundingClientRect().top,
    readableBottom: readableBottomOf(pane),
    firstRowTop: grid && grid.bottom - grid.top > 0 ? grid.top : undefined,
    aboveTop: smallStopTop(pass.ladder?.previousElementSibling),
    firstPass: pass.firstPass,
    leaving: pass.leaving,
  });
  return delta !== 0 && scrollPaneSmoothlyBy(pane, delta, pass.hold) ? delta : 0;
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
