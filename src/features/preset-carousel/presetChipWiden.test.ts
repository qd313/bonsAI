/**
 * Title: The chip with the ring takes the row: the maths
 *
 * Purpose: Pin presetChipWiden.ts, the numbers behind board 5's option 2C (picked 2026-11-16): a chip
 *          whose words do not fit widens across the row while the ring is on it, its neighbours shrink
 *          to their first word and "...", and a chip that fits never changes.
 * Used for: planChipWiden, chipStubText and the CSS lengths in presetChipWiden.ts.
 * Does not: Draw a row; presetChipWiden.row.test.tsx walks the real chips.
 */
import { describe, expect, it } from "vitest";
import {
  chipStubText,
  PRESET_STUB_MIN_PX,
  planChipWiden,
  restBasisCss,
  slotBasisCss,
} from "./presetChipWiden";

const ROW = 300;
const GAP = 6;
const REST = (ROW - GAP) / 2; // 147 px a chip at rest

describe("which chip widens, and by how much", () => {
  it("does nothing while the ring is not on a chip", () => {
    expect(planChipWiden({ ringIndex: null, needPx: [400, 400], rowPx: ROW, gapPx: GAP })).toBeNull();
  });

  it("never changes a chip whose words fit in its resting width", () => {
    expect(planChipWiden({ ringIndex: 0, needPx: [REST, 400], rowPx: ROW, gapPx: GAP })).toBeNull();
    expect(planChipWiden({ ringIndex: 1, needPx: [400, 90], rowPx: ROW, gapPx: GAP })).toBeNull();
  });

  it("waits while the ring chip's words are not known yet (it is still being written)", () => {
    expect(planChipWiden({ ringIndex: 0, needPx: [null, 400], rowPx: ROW, gapPx: GAP })).toBeNull();
  });

  it("widens a long chip to the words it needs and gives the rest to the neighbour", () => {
    const plan = planChipWiden({ ringIndex: 0, needPx: [200, 400], rowPx: ROW, gapPx: GAP })!;
    expect(plan.selected).toBe(0);
    expect(plan.widthPx).toEqual([200, 94]);
    expect(plan.stubbed).toEqual([false, true]);
    expect(plan.widthPx[0]! + plan.widthPx[1]! + GAP).toBe(ROW);
  });

  it("takes the whole row but a stub when the words are longer than the row can show", () => {
    const plan = planChipWiden({ ringIndex: 1, needPx: [400, 700], rowPx: ROW, gapPx: GAP })!;
    expect(plan.widthPx[0]).toBe(PRESET_STUB_MIN_PX);
    expect(plan.widthPx[1]).toBe(ROW - GAP - PRESET_STUB_MIN_PX);
    expect(plan.stubbed).toEqual([true, false]);
  });

  it("leaves a short neighbour whole when it fits in what is left", () => {
    const plan = planChipWiden({ ringIndex: 0, needPx: [200, 80], rowPx: ROW, gapPx: GAP })!;
    expect(plan.widthPx).toEqual([200, 94]);
    expect(plan.stubbed).toEqual([false, false]);
  });

  it("cuts a neighbour whose words are not known yet, rather than letting it hold the room", () => {
    const plan = planChipWiden({ ringIndex: 0, needPx: [200, null], rowPx: ROW, gapPx: GAP })!;
    expect(plan.stubbed).toEqual([false, true]);
  });

  it("shares what is left between two neighbours when the row has three chips", () => {
    const plan = planChipWiden({ ringIndex: 1, needPx: [400, 400, 400], rowPx: ROW, gapPx: GAP })!;
    const spare = ROW - 2 * GAP;
    expect(plan.widthPx[1]).toBe(spare - 2 * PRESET_STUB_MIN_PX);
    expect(plan.widthPx[0]).toBe(PRESET_STUB_MIN_PX);
    expect(plan.widthPx[2]).toBe(PRESET_STUB_MIN_PX);
    expect(plan.widthPx.reduce((a, b) => a + b, 0) + 2 * GAP).toBe(ROW);
  });

  it("does nothing in a row of one chip (it already has the whole row and slides inside it)", () => {
    expect(planChipWiden({ ringIndex: 0, needPx: [900], rowPx: ROW, gapPx: GAP })).toBeNull();
  });

  it("does nothing before the row has a width (nothing laid out yet)", () => {
    expect(planChipWiden({ ringIndex: 0, needPx: [400, 400], rowPx: 0, gapPx: GAP })).toBeNull();
  });
});

describe("a shrunk chip's words", () => {
  it("is the first word and an ellipsis", () => {
    expect(chipStubText("Which Ollama model fits this Deck")).toBe("Which…");
  });
  it("keeps a one-word chip's word whole", () => {
    expect(chipStubText("Battery")).toBe("Battery");
    expect(chipStubText("  Battery  ")).toBe("Battery");
  });
});

describe("the CSS length a slot takes", () => {
  it("is an equal share at rest, written as a length so the move can be animated", () => {
    expect(restBasisCss(2, GAP)).toBe("calc((100% - 6px) / 2)");
    expect(restBasisCss(1, GAP)).toBe("calc((100% - 0px) / 1)");
    expect(slotBasisCss(null, 0, 2, GAP)).toBe("calc((100% - 6px) / 2)");
  });
  it("is the planned width in px while the row is open", () => {
    const plan = planChipWiden({ ringIndex: 0, needPx: [200, 400], rowPx: ROW, gapPx: GAP })!;
    expect(slotBasisCss(plan, 0, 2, GAP)).toBe("200px");
    expect(slotBasisCss(plan, 1, 2, GAP)).toBe("94px");
  });
});
