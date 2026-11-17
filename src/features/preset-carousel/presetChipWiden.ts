/**
 * Title: The chip with the ring takes the row
 *
 * Purpose: The pure maths of the "selected chip widens" look (board 5, tab 5, round 2's C, picked
 * 2026-11-16): while Steam's ring is on a chip whose words do not fit, that chip widens across the
 * row on one line so every word shows, and its neighbours shrink to their first word and "...". The
 * widths, which neighbour is cut to a stub, the stub's words, and the CSS length each slot takes.
 *
 * Used for: usePresetChipWiden (usePresetChipWiden.ts), which reads the live widths and draws the
 * plan; the decode and static chip rows read it through that hook.
 *
 * Solves: Keeps "which chip is too long, how wide does it get, what is left for the others" testable
 * without a layout engine. A chip that fits never changes; a chip too long even for the whole row
 * gets the whole row less a stub per neighbour, and its words then slide inside it as they do today.
 *
 * Does not: Measure anything or touch the DOM. The widths it is given (what each chip's words need,
 * the row's width) are read off the live elements by the caller; this file only adds them up.
 */

/** How long the row takes to open and close, ms (the drawing's 0.16 s). The CSS reads the same number. */
export const PRESET_WIDEN_MS = 160;

/** The least a shrunk neighbour keeps, px: room for "..." and a sliver of its first word. From the drawing. */
export const PRESET_STUB_MIN_PX = 30;

/** Half a pixel of slack: a chip whose words need no more than its resting width fits. */
const FIT_SLACK_PX = 0.5;

export type ChipWidenPlan = {
  /** The chip that takes the row. */
  selected: number;
  /** Each slot's width in px while the row is open (the selected chip's, then each stub's). */
  widthPx: number[];
  /** True for a neighbour cut to its first word: its words need more than the room left for it. */
  stubbed: boolean[];
};

/**
 * What to do with the row now, or null when nothing changes: no ring on a chip, the row has a single
 * chip, the ring chip's needs are not known yet (it is still being written), or its words fit.
 *
 * `needPx` is each chip's whole width if every word showed on one line (words plus padding, badges
 * and tags); null where it is not known yet. `rowPx` and `gapPx` are the row's width and the space
 * between chips, read off the live row.
 */
export function planChipWiden(args: {
  ringIndex: number | null;
  needPx: readonly (number | null)[];
  rowPx: number;
  gapPx: number;
}): ChipWidenPlan | null {
  const { ringIndex, needPx, rowPx, gapPx } = args;
  const count = needPx.length;
  if (ringIndex === null || ringIndex < 0 || ringIndex >= count || count < 2 || !(rowPx > 0)) return null;
  const need = needPx[ringIndex];
  if (need === null || need === undefined) return null;
  const spare = rowPx - gapPx * (count - 1);
  if (need <= spare / count + FIT_SLACK_PX) return null; // it fits where it is: never changes
  const selectedPx = Math.max(spare / count, Math.min(need, spare - (count - 1) * PRESET_STUB_MIN_PX));
  const stubPx = (spare - selectedPx) / (count - 1);
  const widthPx = needPx.map((_, i) => (i === ringIndex ? selectedPx : stubPx));
  const stubbed = needPx.map((n, i) => i !== ringIndex && (n === null || n > stubPx + FIT_SLACK_PX));
  return { selected: ringIndex, widthPx, stubbed };
}

/**
 * A shrunk chip's words: the first word and "...". A one-word chip keeps its word (the box cuts it
 * with its own ellipsis if even that does not fit), so a stub is never empty.
 */
export function chipStubText(text: string): string {
  const trimmed = text.trim();
  const first = trimmed.split(/\s+/)[0] ?? "";
  return first === trimmed ? trimmed : `${first}…`;
}

/**
 * The CSS length of a slot at rest: an equal share of the row. Written as a length rather than
 * "flex-grow 1" so the move to and from an open row is a move between two lengths, which the browser
 * can animate; a grow factor cannot be animated into a length.
 */
export function restBasisCss(count: number, gapPx: number): string {
  const n = Math.max(1, count);
  return `calc((100% - ${gapPx * (n - 1)}px) / ${n})`;
}

/** The CSS length for slot `i`: its share at rest, or its width in px while the row is open. */
export function slotBasisCss(plan: ChipWidenPlan | null, index: number, count: number, gapPx: number): string {
  return plan ? `${plan.widthPx[index]}px` : restBasisCss(count, gapPx);
}
