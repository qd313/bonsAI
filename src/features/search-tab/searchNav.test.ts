/**
 * Title: The Search tab's D-pad rule
 * Purpose: Pin what each press does from each kind of stop: along a row and holding at its ends, to the row
 *          above or below on the nearest stop in x, out of the tab at the top, and holding at the bottom.
 * Used for: searchNav.ts (plan 92, lane N3).
 * Does not: Move any ring; useSearchNav.ts and the tab's walk test do that.
 */
import { describe, expect, it } from "vitest";

import { nearestColumn, searchMove } from "./searchNav";

/** Games (3), the find box (1), two rows of four words, Clear, three matches. */
const SIZES = [3, 1, 4, 4, 1, 1, 1, 1];

describe("along a row", () => {
  it("steps Left and Right and holds still at both ends", () => {
    expect(searchMove(SIZES, { row: 2, col: 1 }, "right")).toEqual({ row: 2, col: 2 });
    expect(searchMove(SIZES, { row: 2, col: 1 }, "left")).toEqual({ row: 2, col: 0 });
    expect(searchMove(SIZES, { row: 2, col: 3 }, "right")).toBe("hold");
    expect(searchMove(SIZES, { row: 2, col: 0 }, "left")).toBe("hold");
    expect(searchMove(SIZES, { row: 1, col: 0 }, "left")).toBe("hold");
    expect(searchMove(SIZES, { row: 1, col: 0 }, "right")).toBe("hold");
  });
});

describe("between rows", () => {
  it("keeps the same place along the row when nothing is measured", () => {
    expect(searchMove(SIZES, { row: 2, col: 2 }, "down")).toEqual({ row: 3, col: 2 });
    expect(searchMove(SIZES, { row: 3, col: 3 }, "up")).toEqual({ row: 2, col: 3 });
    expect(searchMove(SIZES, { row: 0, col: 2 }, "down")).toEqual({ row: 1, col: 0 });
    expect(searchMove(SIZES, { row: 1, col: 0 }, "down")).toEqual({ row: 2, col: 0 });
    expect(searchMove(SIZES, { row: 1, col: 0 }, "up")).toEqual({ row: 0, col: 0 });
  });

  it("lands on the stop nearest in x when the rows are measured", () => {
    // Three game buttons at x 30, 110, 220; four word buttons at 40, 110, 180, 250.
    const centers = (row: number) => (row === 0 ? [30, 110, 220] : row === 2 ? [40, 110, 180, 250] : row === 3 ? [40, 110, 180, 250] : [150]);
    expect(searchMove(SIZES, { row: 0, col: 0 }, "down", centers)).toEqual({ row: 1, col: 0 });
    expect(searchMove(SIZES, { row: 1, col: 0 }, "down", centers)).toEqual({ row: 2, col: 2 });
    expect(searchMove(SIZES, { row: 2, col: 3 }, "up", centers)).toEqual({ row: 1, col: 0 });
    // Game button 3 (x 220) is nearest the fourth word (x 250) in a rows-only layout.
    expect(searchMove([3, 4], { row: 0, col: 2 }, "down", (r) => (r === 0 ? [30, 110, 220] : [40, 110, 180, 250]))).toEqual({ row: 1, col: 3 });
  });

  it("enters a row at the place the caller names, held inside the row, ahead of the nearest in x", () => {
    const centers = (row: number) => (row === 0 ? [30, 110, 220] : row === 1 ? [150] : [40, 110, 180, 250]);
    const enter = (from: number, to: number) => (from !== 1 ? null : to === 0 ? 2 : 0);
    expect(searchMove(SIZES, { row: 1, col: 0 }, "up", centers, enter)).toEqual({ row: 0, col: 2 });
    expect(searchMove(SIZES, { row: 1, col: 0 }, "down", centers, enter)).toEqual({ row: 2, col: 0 });
    expect(searchMove(SIZES, { row: 1, col: 0 }, "up", centers, () => 9)).toEqual({ row: 0, col: 2 });
    expect(searchMove(SIZES, { row: 2, col: 3 }, "down", centers, enter)).toEqual({ row: 3, col: 3 });
  });

  it("goes to the first of two equally near stops", () => {
    expect(nearestColumn(0, 100, [50, 150], 2)).toBe(0);
  });

  it("leaves the tab upward from the top row and holds still below the last row", () => {
    expect(searchMove(SIZES, { row: 0, col: 1 }, "up")).toBe("leave");
    expect(searchMove(SIZES, { row: 7, col: 0 }, "down")).toBe("hold");
  });
});
