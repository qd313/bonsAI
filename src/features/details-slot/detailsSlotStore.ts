/**
 * Title: Which answer's Show details line the chip slot can stand in for
 *
 * Purpose: While a person reads an answer whose own "Show details" line is out of sight, that line
 * takes the suggestion chip's place above the question box (plan 79, the maintainer's pick: way 2,
 * the short cross-fade). The line is drawn inside the chat and the slot sits in the dock, in two
 * different parts of the screen's code; this file is the small shared store between them.
 *
 * Used for: buildReplyActionsElement.tsx registers the real line here (its element, open or shut,
 * greyed or not, and its own press handler); DetailsSlot.tsx reads it to decide what the slot shows
 * and to press it; useMainTabAskBarFocus.ts and buildDetailsPanelElement.tsx ask it where Up from
 * the question box and Down off an open panel should land.
 *
 * How it works:
 * 1. Only one answer at a time has a Show details line (the expanded one), so one entry is kept.
 *    `syncDetailsLine()` is called from the line's ref callback on every render, so the entry always
 *    carries the newest open state and handler; a cleanup only clears the entry it owns.
 * 2. `slotShouldShowLine()` is the drawing's rule, in numbers: the answer (its header to its line,
 *    or to the bottom of its open panel) overlaps the reading area, and the line itself is not
 *    wholly inside that area. While the slot already shows the line, the real one must be 8 px
 *    inside the area before the chip comes back, so the slot does not blink at the edge.
 * 3. `pressDetailsSlotLine()` is A on the slot's line: the ring goes to the real line first through
 *    Steam's own transfer to its registered stop, then the line's own handler runs, then the real
 *    line is scrolled to 8 px below the top of the reading area, again at 150, 300 and 900 ms
 *    because Steam undoes scroll writes (useDockClearanceOnFocus's lift needed the same).
 * 4. `takeChipSlotFocus()` is "the slot, whichever face it shows": the line's registered stop when
 *    the slot shows the line, else the chip row's.
 *
 * Does not: Watch the scroll itself (DetailsSlot.tsx does) or draw anything.
 */
import { focusRegisteredReplyStop } from "../../utils/replyStopRegistry";
import { scrollElementTopToPaneTop } from "../../utils/chatPanelScroll";
import { takeNavFocus } from "../../utils/navFocusRegistry";

export type DetailsLineEntry = {
  el: HTMLElement;
  /** The panel is open: the line reads "Hide details ↑". */
  open: boolean;
  /** Greyed while a question is being answered; the slot keeps the chip then. */
  disabled: boolean;
  /** The line's own press handler, the one A on the real line runs. */
  toggle: (() => void) | undefined;
};

let entry: DetailsLineEntry | null = null;
let slotShowsLine = false;
const listeners = new Set<() => void>();

/**
 * For the real line's ref callback: `el` is the new element (null on unmount), `prev` the one it
 * replaced. Clearing only when the entry is still `prev` keeps a newer line's registration when an
 * older copy's cleanup runs late (the same race navFocusRegistry.unregisterNavFocus guards).
 */
export function syncDetailsLine(prev: HTMLElement | null, el: HTMLElement | null, state: Omit<DetailsLineEntry, "el">): void {
  if (el) entry = { el, ...state };
  else if (entry && entry.el === prev) entry = null;
  else return;
  listeners.forEach((fn) => fn());
}

export function currentDetailsLine(): DetailsLineEntry | null {
  return entry && entry.el.isConnected ? entry : null;
}

export function subscribeDetailsLine(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** DetailsSlot.tsx reports what the slot shows, so the focus helpers below can follow it. */
export function setSlotShowsLine(showing: boolean): void {
  slotShowsLine = showing;
}

/** Steam's own transfer to the slot's line, only while the slot shows it. */
export function takeDetailsSlotLineFocus(): boolean {
  return slotShowsLine && takeNavFocus("details-slot-line");
}

/** The slot, whichever face it shows: the line while it holds the line, else the chip row. */
export function takeChipSlotFocus(): boolean {
  return takeDetailsSlotLineFocus() || takeNavFocus("preset-carousel");
}

/** Where the real line ends up after A on the slot: this far below the top of the reading area. */
const DETAILS_LINE_TOP_PAD_PX = 8;

/** Edges in screen pixels: the reading area (the pane's top down to the dock) and the answer. */
export type DetailsSlotGeometry = {
  bandTop: number;
  bandBottom: number;
  /** The answer's header top. */
  turnTop: number;
  /** The line's bottom, or the open panel's bottom. */
  turnBottom: number;
  lineTop: number;
  lineBottom: number;
};

/**
 * The drawing's rule (details-line-swap.html, `computeOwner`). `showingNow` adds the 8 px the real
 * line must come inside the area before the chip returns; a pixel of slack keeps a line pinned at
 * exactly 8 px (A on the slot) from reading as 7.99.
 */
export function slotShouldShowLine(g: DetailsSlotGeometry, showingNow: boolean): boolean {
  const readingThisAnswer = g.turnBottom > g.bandTop + 1 && g.turnTop < g.bandBottom - 1;
  if (!readingThisAnswer) return false;
  const margin = showingNow ? DETAILS_LINE_TOP_PAD_PX - 1 : 0;
  return g.lineBottom > g.bandBottom - margin || g.lineTop < g.bandTop + margin;
}

/** The pass times after the first scroll: Steam glides the ring's target a moment after it lands. */
const PIN_PASSES_MS = [150, 300, 900] as const;

function pinRealLineNearTop(): void {
  const pass = () => {
    const line = currentDetailsLine()?.el;
    if (line) scrollElementTopToPaneTop(line, DETAILS_LINE_TOP_PAD_PX);
  };
  pass();
  requestAnimationFrame(pass);
  PIN_PASSES_MS.forEach((ms) => window.setTimeout(pass, ms));
}

/**
 * A on the slot's line. Returns false when there is no live line to press (nothing happens then).
 * The ring moves first, so it is never left on the slot's line as the slot gives way to the chip;
 * should Steam refuse the transfer, DetailsSlot.tsx's swap hands the ring to the chip instead.
 */
export function pressDetailsSlotLine(): boolean {
  const line = currentDetailsLine();
  if (!line || line.disabled || !line.toggle) return false;
  focusRegisteredReplyStop("show-details");
  line.toggle();
  pinRealLineNearTop();
  return true;
}

/** Tests only: forget the line and the slot's face. */
export function resetDetailsSlotStore(): void {
  entry = null;
  slotShowsLine = false;
  listeners.clear();
}
