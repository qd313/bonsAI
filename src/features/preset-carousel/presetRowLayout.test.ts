/**
 * Guards `effectivePresetVisibleSlots` — the single point where the "one suggestion chip"
 * setting (roadmap `[chips]` ★★★) overrides how many chips the row shows. `PRESET_VISIBLE_SLOTS`
 * itself must keep meaning "the shipped default": carouselState.test.ts pins it at exactly 2, and
 * this file must never weaken that by changing the constant instead of adding an override.
 */
import { describe, expect, it } from "vitest";
import { presetPace, TWO_SPOT_MIN_GAP_MS } from "./presetPace";
import {
  effectivePresetVisibleSlots,
  PRESET_CHIP_GAP_PX,
  PRESET_VISIBLE_SLOTS,
  presetHoldMs,
  presetTurnMs,
} from "./presetRowLayout";

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

/*
 * Plan 78 F: how long a chip stays is one rule that takes the chip count. With one chip showing it
 * draws the eye, even more so when it fades in, so it needs far less still time than two side by
 * side. Numbers are the maintainer's to tune, all in presetPace.ts.
 */
describe("the pace of a chip", () => {
  it("has the starting numbers: one chip 120 ms a letter, 4 to 9 s, fade 1 s in and 1 s out", () => {
    expect(presetPace(1)).toEqual({ msPerChar: 120, minHoldMs: 4000, maxHoldMs: 9000, fadeInMs: 1000, fadeOutMs: 1000 });
  });

  it("has the starting numbers: two chips 200 ms a letter, 6 to 14 s, fade 1 s in and 1.5 s out", () => {
    expect(presetPace(2)).toEqual({ msPerChar: 200, minHoldMs: 6000, maxHoldMs: 14000, fadeInMs: 1000, fadeOutMs: 1500 });
  });

  it("holds a short label for the least time, a medium one by its length, a very long one at the most", () => {
    expect(presetHoldMs("Hi", 1)).toBe(4000);
    expect(presetHoldMs("x".repeat(40), 1)).toBe(40 * 120); // fits its wide chip: no scroll wait
    expect(presetHoldMs("Hi", 2)).toBe(6000);
  });

  it("a turn is fade in, hold and fade out, so a typical 35-letter label turns over in about 6 s with one chip", () => {
    const text = "x".repeat(35);
    expect(presetTurnMs(text, 1)).toBe(1000 + 35 * 120 + 1000);
    expect(presetTurnMs(text, 1)).toBeGreaterThan(5500);
    expect(presetTurnMs(text, 1)).toBeLessThan(7500);
  });

  /* The wait for one full scroll was worked out for the narrow two-chip width even with one wide
     chip showing, which held a one-chip label longer than it needed. 50 letters is ~322 px: it
     overflows the ~131 px two-chip room, and needs no scroll at all in the ~284 px one-chip room. */
  it("works the one-full-scroll wait out for the room the chip really has", () => {
    const text = "x".repeat(44); // ~284 px: just fits one wide chip
    expect(presetHoldMs(text, 1)).toBe(44 * 120);
    const longer = "x".repeat(60); // ~387 px: overflows even the wide chip by ~103 px
    const scroll = 1500 + ((60 * 6.45 - 284) / 20) * 1000 + 1500;
    expect(presetHoldMs(longer, 1)).toBeCloseTo(Math.max(60 * 120, scroll), 0); // the scroll decides: ~8.2 s
    // And a 40-letter label scrolls with two chips but not with one.
    expect(presetHoldMs("x".repeat(40), 2)).toBeGreaterThan(40 * 200);
    expect(presetHoldMs("x".repeat(40), 1)).toBe(40 * 120);
  });

  it("two spots never change within 2.5 s of each other", () => {
    expect(TWO_SPOT_MIN_GAP_MS).toBe(2500);
  });
});
