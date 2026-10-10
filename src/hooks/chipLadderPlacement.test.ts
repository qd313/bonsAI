/**
 * Title: Show details chips: how far to scroll so the open chip's details are readable
 * Purpose: Pin placementDelta's rules (plan 87 F3, call 6) on plain numbers: nothing moves for a readable box,
 *          a hidden box's end comes up to 6 px above the dock, the chip never rises wholly into Steam's 116 px top
 *          margin, a chip off the top comes back to Steam's own line, and leaving a tall box brings everything the
 *          walk back can reach (the top row, the toggle above it) under the line in one move, never back up.
 * Used for: chipLadderPlacement.ts.
 * Does not: Scroll a pane; ContextChipLadder.gridWalk.test.tsx walks the real ladder with Steam's glide.
 */
import { describe, expect, it } from "vitest";
import { placementDelta } from "./chipLadderPlacement";

/* The monitor run's screen (plan87-M3-CHIPS.json): pane from 88, dock at 658.4, so Steam's line at 204. */
const SCREEN = { paneTop: 88, readableBottom: 658.4 };
const chipAt = (top: number) => ({ chipTop: top, chipBottom: top + 24.4 });

describe("placementDelta", () => {
  it("is 0 when the box already ends above the dock (the short boxes on the Deck: 657.7 against 658.4)", () => {
    expect(placementDelta({ ...SCREEN, ...chipAt(448.3), boxBottom: 657.7 })).toBe(0);
  });

  it("brings a hidden box's end to 6 px above the dock (Spoiler risk, ending 737.4 on the Deck)", () => {
    expect(placementDelta({ ...SCREEN, ...chipAt(539.5), boxBottom: 737.4 })).toBeCloseTo(737.4 - 652.4, 5);
  });

  it("stops where the chip's bottom meets Steam's line, leaving the rest of a tall box for the first Down", () => {
    // Steam's line at 204: the chip may rise until its top is at 204 - 24.4 = 179.6, a move of 120.4.
    expect(placementDelta({ ...SCREEN, ...chipAt(300), boxBottom: 1000 })).toBeCloseTo(300 - 179.6, 5);
  });

  /*
   * Steam glides a chip whose top is over its line until the top is on it (the Deck, 2026-10-10: chip 2 at 144.1
   * to 168.5 moved 23.5). The first look goes exactly there; a later look brings it 1 px under the line, or, when
   * its box's end could not then stay readable, only until its bottom meets the line.
   */
  it("brings a chip that is off the top back onto Steam's line: its top on the first look, then never past its box", () => {
    expect(placementDelta({ ...SCREEN, ...chipAt(20), boxBottom: 200, firstPass: true })).toBeCloseTo(20 - 204, 5);
    expect(placementDelta({ ...SCREEN, ...chipAt(20), boxBottom: 200 })).toBeCloseTo(20 - 205, 5);
    expect(placementDelta({ ...SCREEN, ...chipAt(20), boxBottom: 900 })).toBeCloseTo(20 + 24.4 - 204, 5);
  });

  /*
   * The Deck, 2026-10-10: after Developer details' end was shown, the grid sat high, its rows inside Steam's
   * 116 px margin, and Steam pulled each row the ring landed on down to its line: 73.4, 29.7, 31.2, 28.9 px. Brought
   * down only until the top row's bottom met the line, the second chip still moved 23.5 and the toggle above the
   * grid 57.8 (plan87-P87-F3-CHIPS-GRID-try2.json).
   */
  it("pulls the whole grid down in one move when the chip is inside Steam's margin, its top row's top onto the line", () => {
    // Row 1 runs 3.5 to 27.9, the ring's chip (row 4) 94.7 to 119.1, its 55 px box well clear of the dock.
    expect(placementDelta({ ...SCREEN, ...chipAt(94.7), boxBottom: 212.8, firstRowTop: 3.5 })).toBeCloseTo(3.5 - 205, 5);
  });

  it("brings the stop drawn above the grid (the toggle) onto the line too, so the walk back reaches it without a glide", () => {
    // The toggle 57.3 above the top row, as on the Deck: 3.5 - 57.3 = -53.8.
    expect(placementDelta({ ...SCREEN, ...chipAt(94.7), boxBottom: 212.8, firstRowTop: 3.5, aboveTop: -53.8 })).toBeCloseTo(-53.8 - 205, 5);
  });

  it("pulls the grid down only as far as the open box's end stays above the dock, and the chip at least onto the line", () => {
    // Moving the grid all the way would push this 400 px box's end behind the dock: stop where it ends 6 px above.
    expect(placementDelta({ ...SCREEN, ...chipAt(94.7), boxBottom: 560, firstRowTop: 3.5 })).toBeCloseTo(560 - 652.4, 5);
    // A box that cannot stay readable: the chip still comes onto the line (Steam would put it there anyway).
    expect(placementDelta({ ...SCREEN, ...chipAt(94.7), boxBottom: 700, firstRowTop: 3.5 })).toBeCloseTo(119.1 - 204, 5);
  });

  it("never scrolls up on a later look while anything the walk back can reach is over the line (no bounce after Steam's glide)", () => {
    // Developer details back from below: Steam's glide put its top on the line, and its box's end is still 49.8 px
    // short of the readable line. Before, a later look lifted it 24.4 back up: a bounce after the glide.
    expect(placementDelta({ ...SCREEN, ...chipAt(204), boxBottom: 702.2, firstRowTop: 82.4, aboveTop: 25.1 })).toBe(0);
  });

  it("lifts a chip behind the dock to just above it", () => {
    expect(placementDelta({ ...SCREEN, ...chipAt(660), boxBottom: 700 })).toBeGreaterThanOrEqual(660 + 24.4 - 652.4);
  });

  it("on a band too small for Steam's line, keeps the chip on screen and moves nothing it does not need", () => {
    // Pane 88 to a dock at 190: the line (204) is below the dock, so the chip may go up to the pane's top.
    const small = { paneTop: 88, readableBottom: 190 };
    expect(placementDelta({ ...small, ...chipAt(100), boxBottom: 180 })).toBe(0);
    expect(placementDelta({ ...small, ...chipAt(100), boxBottom: 400 })).toBeCloseTo(12, 5);
  });
});
