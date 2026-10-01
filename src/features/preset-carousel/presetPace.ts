/**
 * Title: Preset chip pace
 * Purpose: The numbers that set how long a suggestion chip stays and how it fades, for one chip
 *          showing and for two. They are the maintainer's to tune: after looking at the pace on the
 *          Deck, change a number here and nothing else.
 * Used for: presetRowLayout (hold and turn lengths), the fade, plain, decode and sliding chip styles
 *           in MainTabPresetAnimatedChips and presetDecodeSlots.
 * Solves: One chip draws the eye, even more so when it fades in, so it needs far less still time than
 *         two chips side by side, which are busier and more to read. Before plan 78 the hold was
 *         300 ms a letter, 8 to 32 s, with a 2 s fade out, whatever the chip count (about 15 s a turn
 *         for a typical label: two chips a minute with one chip showing, "useless to show off the
 *         features"). Now a typical label turns over in about 7 s with one chip, 11 s with two.
 * Does not: Decide which chip comes next (nextChipRule) or how long a long label needs to scroll
 *           (presetRowLayout, which makes the hold at least one full scroll).
 */

export type PresetPace = {
  /** Still time per letter of the label, before the limits below. */
  msPerChar: number;
  /** The least a chip stays fully shown, before fading out. */
  minHoldMs: number;
  /** The most the length-scaled hold gives (a long label's scroll can still hold it longer). */
  maxHoldMs: number;
  /** Fade in. Kept at 1 s for both: it is what draws the eye. */
  fadeInMs: number;
  fadeOutMs: number;
};

/** One chip across the whole column. */
const ONE_CHIP_PACE: PresetPace = {
  msPerChar: 120,
  minHoldMs: 4_000,
  maxHoldMs: 9_000,
  fadeInMs: 1_000,
  fadeOutMs: 1_000,
};

/** Two chips side by side. */
const TWO_CHIP_PACE: PresetPace = {
  msPerChar: 200,
  minHoldMs: 6_000,
  maxHoldMs: 14_000,
  fadeInMs: 1_000,
  fadeOutMs: 1_500,
};

/**
 * With two chips, two spots never change within this long of each other: a swap and its fades finish
 * (1.5 s out and 1 s in) before the other spot's begins.
 */
export const TWO_SPOT_MIN_GAP_MS = 2_500;

export function presetPace(chipCount: number): PresetPace {
  return chipCount <= 1 ? ONE_CHIP_PACE : TWO_CHIP_PACE;
}
