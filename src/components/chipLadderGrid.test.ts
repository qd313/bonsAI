/**
 * Title: Show details chips: packing into rows, and where each press goes
 * Purpose: Pin the two rules of the chip grid (plan 87 F3) on the numbers the Deck measured on 2026-10-09
 *          (docs/test-evidence/plan87-M3-CHIPS.json): eight chips 143.7, 92.9, 102.9, 120.2, 205.7, 94.6,
 *          150 and 102.1 px wide in a 300 px column.
 * Used for: chipLadderGrid.ts.
 * Does not: Render the ladder or walk it with Steam's scroll; ContextChipLadder.gridWalk.test.tsx does.
 */
import { describe, expect, it } from "vitest";
import { gridMove, packChipRows, rowsFromBoxes, rowWidthOf, type ChipBox } from "./chipLadderGrid";

const MEASURED = [143.7, 92.9, 102.9, 120.2, 205.7, 94.6, 150, 102.1];

describe("packing the chips into rows", () => {
  it("packs the eight measured chips into five rows, each no wider than the 300 px column", () => {
    const rows = packChipRows(MEASURED, 300)!;
    expect(rows).toEqual([[0, 1], [2, 3], [4], [5, 6], [7]]);
    for (const row of rows) expect(rowWidthOf(row, MEASURED)).toBeLessThanOrEqual(300);
    expect(rows.flat().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("five is the fewest rows they can take: no three fit side by side, and Thinking fits beside none", () => {
    const sorted = [...MEASURED].sort((a, b) => a - b);
    expect(sorted[0]! + sorted[1]! + sorted[2]! + 2 * 6).toBeGreaterThan(300);
    const others = MEASURED.filter((_, i) => i !== 4);
    expect(205.7 + 6 + Math.min(...others)).toBeGreaterThan(300);
  });

  it("fits every row at any column width the Deck's wrapping allows (it wrapped them the same way)", () => {
    for (const width of [251, 260, 284, 300, 305]) {
      const rows = packChipRows(MEASURED, width)!;
      expect(rows).toEqual([[0, 1], [2, 3], [4], [5, 6], [7]]);
      for (const row of rows) expect(rowWidthOf(row, MEASURED)).toBeLessThanOrEqual(width + 0.5);
    }
  });

  it("lets a narrow chip move up into an earlier row only when that saves a whole row", () => {
    // In reading order: [150] [200] [140 90], three rows. Moving 140 up beside 150 and 90 beside 200: two.
    expect(packChipRows([150, 200, 140, 90], 300)).toEqual([[0, 2], [1, 3]]);
    // Same row count either way: reading order is kept.
    expect(packChipRows([150, 200, 90], 300)).toEqual([[0], [1, 2]]);
  });

  it("gives a chip wider than the column a row of its own", () => {
    expect(packChipRows([100, 320, 100], 300)).toEqual([[0, 2], [1]]);
    expect(packChipRows([320, 100], 300)).toEqual([[0], [1]]);
  });

  it("does nothing before the chips have been measured", () => {
    expect(packChipRows(MEASURED, 0)).toBeNull();
    expect(packChipRows([0, 0, 0], 300)).toBeNull();
  });
});

/* The eight chips as packed above, drawn left to right with 6 px gaps and rows 30.4 px apart. */
function drawnBoxes(rows: number[][], widths: number[]): (i: number) => ChipBox {
  const boxes = new Map<number, ChipBox>();
  rows.forEach((row, r) => {
    let x = 0;
    for (const i of row) {
      boxes.set(i, { left: x, right: x + widths[i]!, top: 250 + r * 30.4, bottom: 274.4 + r * 30.4 });
      x += widths[i]! + 6;
    }
  });
  return (i) => boxes.get(i)!;
}

describe("where each press goes", () => {
  const packed = packChipRows(MEASURED, 288)!;
  const boxOf = drawnBoxes(packed, MEASURED);
  const rows = rowsFromBoxes(packed.flat(), boxOf);

  it("reads the rows back from where the chips are drawn", () => {
    expect(rows).toEqual(packed);
  });

  it("Right steps through every chip in drawn order, then leaves downward", () => {
    const seen: number[] = [0];
    let move = gridMove(rows, boxOf, 0, "right");
    while ("to" in move) {
      seen.push(move.to);
      move = gridMove(rows, boxOf, move.to, "right");
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(move).toEqual({ leave: "down" });
  });

  it("Left steps back through every chip, then leaves upward", () => {
    const seen: number[] = [7];
    let move = gridMove(rows, boxOf, 7, "left");
    while ("to" in move) {
      seen.push(move.to);
      move = gridMove(rows, boxOf, move.to, "left");
    }
    expect(seen).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
    expect(move).toEqual({ leave: "up" });
  });

  it("Down and Up cross one row per press onto the chip nearest in x, and leave at the edges", () => {
    const walk = (from: number, dir: "up" | "down") => {
      const seen = [from];
      let move = gridMove(rows, boxOf, from, dir);
      while ("to" in move) {
        seen.push(move.to);
        move = gridMove(rows, boxOf, move.to, dir);
      }
      return { seen, end: move };
    };
    expect(walk(0, "down")).toEqual({ seen: [0, 2, 4, 5, 7], end: { leave: "down" } });
    expect(walk(1, "down")).toEqual({ seen: [1, 3, 4, 5, 7], end: { leave: "down" } });
    expect(walk(7, "up")).toEqual({ seen: [7, 5, 4, 2, 0], end: { leave: "up" } });
    expect(walk(6, "up")).toEqual({ seen: [6, 4, 2, 0], end: { leave: "up" } });
  });

  it("with no layout, each chip is its own row, so Down still steps one chip at a time", () => {
    const none = () => ({ left: 0, right: 0, top: 0, bottom: 0 });
    expect(rowsFromBoxes([0, 1, 2], none)).toEqual([[0], [1], [2]]);
    expect(gridMove([[0], [1], [2]], none, 0, "down")).toEqual({ to: 1 });
  });
});
