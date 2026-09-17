/**
 * Guards `effectivePresetVisibleSlots` — the single point where the "one suggestion chip"
 * setting (roadmap `[chips]` ★★★) overrides how many chips the row shows. `PRESET_VISIBLE_SLOTS`
 * itself must keep meaning "the shipped default": carouselState.test.ts pins it at exactly 2, and
 * this file must never weaken that by changing the constant instead of adding an override.
 */
import { describe, expect, it } from "vitest";
import { effectivePresetVisibleSlots, PRESET_CHIP_GAP_PX, PRESET_VISIBLE_SLOTS } from "./presetRowLayout";

describe("effectivePresetVisibleSlots", () => {
  it("returns the shipped default (two) when the setting is off", () => {
    expect(effectivePresetVisibleSlots(false)).toBe(PRESET_VISIBLE_SLOTS);
    expect(effectivePresetVisibleSlots(false)).toBe(2);
  });

  it("returns one when the setting is on, regardless of what the default is", () => {
    expect(effectivePresetVisibleSlots(true)).toBe(1);
  });

  it("never returns zero or a negative count", () => {
    expect(effectivePresetVisibleSlots(true)).toBeGreaterThan(0);
    expect(effectivePresetVisibleSlots(false)).toBeGreaterThan(0);
  });
});

describe("PRESET_CHIP_GAP_PX", () => {
  /* Design boards, 2026-09-16, plan 60 board B: the gap between the two chips widened from 4 to 6
     so they stop reading as one slab. section-4.ts reads this constant for the row gap, the
     carousel slide distance and the label-room estimate, so pinning it here is enough to catch a
     regression anywhere that math is used. */
  it("is 6, per plan 60 board B", () => {
    expect(PRESET_CHIP_GAP_PX).toBe(6);
  });
});
