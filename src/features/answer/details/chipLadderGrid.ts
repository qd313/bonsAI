/**
 * Title: Show details chips: packing into rows, and the four-direction walk
 *
 * Purpose: Two small rules for the chips under an answer's Show details (plan 87 F3, the
 * maintainer's call 2): how the chips are packed into rows that fit the 300 px column, and where
 * each D-pad press goes once they are drawn in a grid: Left and Right step through the chips in
 * the order they are drawn, Up and Down move to the nearest chip in the row above or below.
 *
 * Used for: ContextChipLadder.tsx (the packing decides each chip's drawn place; the walk decides
 * every press on a chip).
 *
 * Solves: The chips used to be one list, so Up and Down did what Left and Right did: one chip at a
 * time through a wrapped row, eight presses to cross five rows. Now Down crosses one drawn row per
 * press. The walk reads the rows from where the chips really are on screen, never from the packing,
 * so whatever the browser draws is what the D-pad walks.
 *
 * Does not: Move the ring, scroll, or read the page. Pure functions over numbers.
 *
 * Packing, in plain words: the chips keep their reading order and fill each row in turn (what the
 * browser's wrapping does anyway), unless letting a narrow chip move up into the room left at the
 * end of an earlier row saves a whole row; only then does it. For the eight chips measured on the
 * Deck on 2026-10-09 the two give the same five rows: every row can hold at most two of them (the
 * three narrowest side by side need 301.6 px) and the 205.7 px Thinking chip fits beside none, so
 * five rows is the fewest possible at 300 px with today's 6 px gaps.
 */

/** The space between two chips, across and down; the same 6 px the ladder's styles use. */
export const CHIP_GAP_PX = 6;

/** Rounding slack: a chip measured 0.4 px wider than the room left still fits (the Deck reads to 0.1 px). */
const FIT_SLACK_PX = 0.5;

/** One chip's drawn box on screen. */
export type ChipBox = { left: number; right: number; top: number; bottom: number };

/** Where a press on a chip goes: another chip (by its index in the ladder's list), or out of the grid. */
export type GridMove = { to: number } | { leave: "up" | "down" };

export type GridDirection = "left" | "right" | "up" | "down";

/**
 * Pack chips of the given widths into rows no wider than `rowWidth`.
 *
 * In: each chip's measured width, in the ladder's order; the row's width; the gap between chips.
 * Out: rows of chip indices, top row first, each row left to right; or null when nothing has been
 * measured yet (no layout, so no packing to do).
 *
 * 1. Reading order: fill a row until the next chip does not fit, then start the next row.
 * 2. First fit: put each chip, in order, into the first row that still has room for it.
 * 3. Keep the reading order unless first fit needs fewer rows.
 * A chip wider than the row gets a row of its own (the ladder clips its label with an ellipsis).
 */
export function packChipRows(widths: number[], rowWidth: number, gap = CHIP_GAP_PX): number[][] | null {
  if (!(rowWidth > 0) || widths.length === 0 || widths.some((w) => !(w > 0))) return null;
  const fits = (used: number, w: number) => used === 0 || used + gap + w <= rowWidth + FIT_SLACK_PX;
  const add = (used: number, w: number) => (used === 0 ? w : used + gap + w);

  const inOrder: number[][] = [];
  let used = 0;
  widths.forEach((w, i) => {
    if (inOrder.length === 0 || !fits(used, w)) {
      inOrder.push([i]);
      used = w;
    } else {
      inOrder[inOrder.length - 1]!.push(i);
      used = add(used, w);
    }
  });

  const firstFit: number[][] = [];
  const firstFitUsed: number[] = [];
  widths.forEach((w, i) => {
    const row = firstFitUsed.findIndex((u) => fits(u, w));
    if (row < 0) {
      firstFit.push([i]);
      firstFitUsed.push(w);
    } else {
      firstFit[row]!.push(i);
      firstFitUsed[row] = add(firstFitUsed[row]!, w);
    }
  });

  return firstFit.length < inOrder.length ? firstFit : inOrder;
}

/** A row's width as drawn: its chips side by side with the gap between them. */
export function rowWidthOf(row: number[], widths: number[], gap = CHIP_GAP_PX): number {
  return row.reduce((sum, i, n) => sum + widths[i]! + (n > 0 ? gap : 0), 0);
}

/**
 * Group the drawn chips into rows by where they are on screen.
 *
 * In: the chips in drawn order (indices into the ladder's list) and each one's box.
 * Out: rows of chip indices, top row first, each row left to right.
 *
 * With no layout at all (every box empty: a test page, or a ladder not drawn yet) each chip is a
 * row of its own, so Up and Down still step one chip at a time, as they did before the grid.
 */
export function rowsFromBoxes(order: number[], boxOf: (index: number) => ChipBox): number[][] {
  const boxes = order.map((i) => ({ i, box: boxOf(i) }));
  if (boxes.every(({ box }) => !(box.right - box.left > 0))) return order.map((i) => [i]);
  const sorted = [...boxes].sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left);
  const rows: Array<{ top: number; height: number; chips: typeof boxes }> = [];
  for (const chip of sorted) {
    const row = rows[rows.length - 1];
    const height = chip.box.bottom - chip.box.top;
    /* Chips of one row share their top; a new row starts more than half a chip lower. */
    if (row && chip.box.top - row.top < Math.max(2, Math.min(row.height, height) / 2)) row.chips.push(chip);
    else rows.push({ top: chip.box.top, height, chips: [chip] });
  }
  return rows.map((row) => row.chips.sort((a, b) => a.box.left - b.box.left).map((c) => c.i));
}

/**
 * Where a press on chip `from` goes.
 *
 * 1. Left and Right step through the chips in drawn order, row after row, as a person reads them.
 *    Right at a row's last chip goes on to the next row's first chip, Left at a row's first chip
 *    back to the previous row's last chip, so walking Left or Right reaches every chip with no
 *    press that does nothing. Right at the very last chip leaves the grid downward, Left at the
 *    very first chip leaves it upward: the same places Down from the bottom row and Up from the
 *    top row go.
 * 2. Up and Down move to the row above or below, onto its chip nearest in x (by the chips'
 *    centres; a tie goes to the left one). Up from the top row and Down from the bottom row leave
 *    the grid.
 */
export function gridMove(rows: number[][], boxOf: (index: number) => ChipBox, from: number, dir: GridDirection): GridMove {
  const order = rows.flat();
  const pos = order.indexOf(from);
  if (pos < 0) return { leave: dir === "left" || dir === "up" ? "up" : "down" };
  if (dir === "left") return pos > 0 ? { to: order[pos - 1]! } : { leave: "up" };
  if (dir === "right") return pos < order.length - 1 ? { to: order[pos + 1]! } : { leave: "down" };
  const row = rows.findIndex((r) => r.includes(from));
  const next = rows[dir === "up" ? row - 1 : row + 1];
  if (!next) return { leave: dir };
  const centre = (i: number) => {
    const box = boxOf(i);
    return (box.left + box.right) / 2;
  };
  const x = centre(from);
  let best = next[0]!;
  for (const i of next) if (Math.abs(centre(i) - x) < Math.abs(centre(best) - x)) best = i;
  return { to: best };
}
