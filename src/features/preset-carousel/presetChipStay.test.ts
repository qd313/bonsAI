/**
 * Title: The board a long chip reports its time line on
 *
 * Purpose: Pin presetChipStay.ts on its own (plan 81 helper E): the board remembers only the chip
 *          now in a slot, and armLeave leaves exactly at the end of the chip's own time line once it
 *          has reported, on the row's own beat before that and for a chip that never reports, and
 *          moves its moment when a report arrives late. The same file pins the spacing between two
 *          such changes (changeSpacing.ts).
 * Used for: armLeave in the fade and plain rows, the decode row's reads of leaveAt.
 * Does not: Draw a row; the row tests are presetChipStay.row.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeChangeSpacer } from "./changeSpacing";
import { armLeave, makeChipStayBoard } from "./presetChipStay";
import { TWO_LONG_CHIP_MIN_GAP_MS, TWO_SPOT_MIN_GAP_MS } from "./presetPace";

describe("the board of chip time lines", () => {
  it("knows when the chip in a slot may leave, and only for the words that are there", () => {
    const board = makeChipStayBoard();
    expect(board.leaveAt(0, "a")).toBeNull();
    board.report(0, "a", { startedAt: 1_000, stayMs: 9_000 });
    expect(board.leaveAt(0, "a")).toBe(10_000);
    expect(board.leaveAt(0, "b")).toBeNull();
    expect(board.leaveAt(1, "a")).toBeNull();
  });

  it("forgets a chip that fits or is gone, but not the chip that took its place", () => {
    const board = makeChipStayBoard();
    board.report(0, "a", { startedAt: 0, stayMs: 5_000 });
    board.report(0, "b", { startedAt: 6_000, stayMs: 5_000 });
    board.report(0, "a", null); // the old chip clearing up after itself
    expect(board.leaveAt(0, "b")).toBe(11_000);
    board.report(0, "b", null);
    expect(board.leaveAt(0, "b")).toBeNull();
  });
});

describe("armLeave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const arm = (board: ReturnType<typeof makeChipStayBoard>, left: () => void, slot = 0, fallbackMs = 8_000) =>
    armLeave({ board, spacer: makeChangeSpacer(), slot, text: "a", fallbackMs, tailMs: 0, onLeave: left });

  it("leaves on the row's own beat when the chip never reports a scroll", () => {
    const left = vi.fn();
    arm(makeChipStayBoard(), left);
    vi.advanceTimersByTime(7_999);
    expect(left).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(left).toHaveBeenCalledTimes(1);
  });

  it("leaves at the end of the chip's own time line, however long the row's beat would have been", () => {
    const board = makeChipStayBoard();
    const left = vi.fn();
    board.report(0, "a", { startedAt: Date.now(), stayMs: 3_000 });
    arm(board, left, 0, 20_000);
    vi.advanceTimersByTime(2_999);
    expect(left).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(left).toHaveBeenCalledTimes(1);
  });

  it("moves its moment when the chip reports after the arming, and leaves only once", () => {
    const board = makeChipStayBoard();
    const left = vi.fn();
    arm(board, left, 0, 20_000);
    vi.advanceTimersByTime(500);
    board.report(0, "a", { startedAt: Date.now() - 500, stayMs: 6_000 });
    vi.advanceTimersByTime(5_499);
    expect(left).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(left).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(left).toHaveBeenCalledTimes(1);
  });

  it("can be stood down, and then never leaves", () => {
    const left = vi.fn();
    const stop = arm(makeChipStayBoard(), left);
    stop();
    vi.advanceTimersByTime(60_000);
    expect(left).not.toHaveBeenCalled();
  });
});

describe("keeping two changes apart when both are timed to a chip's own scroll", () => {
  it("keeps two exact changes only a few hundred ms apart, but an ordinary one the full gap", () => {
    const spacer = makeChangeSpacer(TWO_SPOT_MIN_GAP_MS);
    expect(spacer.reserve(0, 10_000, true)).toBe(10_000);
    expect(spacer.reserve(1, 10_000, true)).toBe(10_000 + TWO_LONG_CHIP_MIN_GAP_MS);
    const other = makeChangeSpacer(TWO_SPOT_MIN_GAP_MS);
    other.reserve(0, 10_000, true);
    expect(other.reserve(1, 10_000)).toBe(10_000 + TWO_SPOT_MIN_GAP_MS);
    const third = makeChangeSpacer(TWO_SPOT_MIN_GAP_MS);
    third.reserve(0, 10_000);
    expect(third.reserve(1, 10_000, true)).toBe(10_000 + TWO_SPOT_MIN_GAP_MS);
  });

  it("is still a few hundred ms and not a hair: the two long chips never change together", () => {
    expect(TWO_LONG_CHIP_MIN_GAP_MS).toBeGreaterThanOrEqual(300);
    expect(TWO_LONG_CHIP_MIN_GAP_MS).toBeLessThan(500);
  });
});
