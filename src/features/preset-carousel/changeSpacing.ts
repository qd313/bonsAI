/**
 * Title: Keeping two chip spots from changing together
 * Purpose: Each spot reserves the moment its chip will be replaced; a reservation that falls within
 *          the gap of the other spot's moves later, so the two never change at the same moment.
 * Used for: The fade, plain and decode chip styles with two chips showing (the sliding style has one
 *           moving window, so one change at a time by construction).
 * Solves: The two spots start 0.5 s apart and turn over on timers of their own, so a label of the same
 *         length as its neighbour's changed half a second after it, and different lengths drifted into
 *         each other at random.
 * Does not: Know about the clock; callers pass times in whichever clock they already use.
 */
import { TWO_LONG_CHIP_MIN_GAP_MS, TWO_SPOT_MIN_GAP_MS } from "./presetPace";

export type ChangeSpacer = {
  /**
   * Reserve `atMs` for this spot; returns the time to use, `atMs` or later. `exact` marks a change
   * timed to the end of a long chip's own scroll (presetChipStay.ts): two exact changes only keep
   * TWO_LONG_CHIP_MIN_GAP_MS apart, so neither long chip is held back for seconds by the other.
   */
  reserve: (spot: number, atMs: number, exact?: boolean) => number;
  /** The same, as a wait: the delay (from `nowMs`) to use instead of `delayMs`, `delayMs` or more. */
  delay: (spot: number, nowMs: number, delayMs: number, exact?: boolean) => number;
  /** The same for an action that runs `tailMs` before the change itself (a fade-out before the swap). */
  delayBefore: (spot: number, nowMs: number, holdMs: number, tailMs: number, exact?: boolean) => number;
};

export function makeChangeSpacer(gapMs: number = TWO_SPOT_MIN_GAP_MS): ChangeSpacer {
  const reserved = new Map<number, { at: number; exact: boolean }>();
  const spacer: ChangeSpacer = {
    delay: (spot, nowMs, delayMs, exact) => spacer.reserve(spot, nowMs + delayMs, exact) - nowMs,
    delayBefore: (spot, nowMs, holdMs, tailMs, exact) => spacer.delay(spot, nowMs, holdMs + tailMs, exact) - tailMs,
    reserve(spot, atMs, exact = false) {
      let at = atMs;
      for (let guard = 0; guard < 4; guard++) {
        let moved = false;
        for (const [other, held] of reserved) {
          const needed = exact && held.exact ? Math.min(gapMs, TWO_LONG_CHIP_MIN_GAP_MS) : gapMs;
          if (other !== spot && Math.abs(at - held.at) < needed) {
            at = held.at + needed;
            moved = true;
          }
        }
        if (!moved) break;
      }
      reserved.set(spot, { at, exact });
      return at;
    },
  };
  return spacer;
}
