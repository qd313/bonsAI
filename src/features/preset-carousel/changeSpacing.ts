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
import { TWO_SPOT_MIN_GAP_MS } from "./presetPace";

export type ChangeSpacer = {
  /** Reserve `atMs` for this spot; returns the time to use, `atMs` or later. */
  reserve: (spot: number, atMs: number) => number;
  /** The same, as a wait: the delay (from `nowMs`) to use instead of `delayMs`, `delayMs` or more. */
  delay: (spot: number, nowMs: number, delayMs: number) => number;
  /** The same for an action that runs `tailMs` before the change itself (a fade-out before the swap). */
  delayBefore: (spot: number, nowMs: number, holdMs: number, tailMs: number) => number;
};

export function makeChangeSpacer(gapMs: number = TWO_SPOT_MIN_GAP_MS): ChangeSpacer {
  const reserved = new Map<number, number>();
  const spacer: ChangeSpacer = {
    delay: (spot, nowMs, delayMs) => spacer.reserve(spot, nowMs + delayMs) - nowMs,
    delayBefore: (spot, nowMs, holdMs, tailMs) => spacer.delay(spot, nowMs, holdMs + tailMs) - tailMs,
    reserve(spot, atMs) {
      let at = atMs;
      for (let guard = 0; guard < 4; guard++) {
        let moved = false;
        for (const [other, when] of reserved) {
          if (other !== spot && Math.abs(at - when) < gapMs) {
            at = when + gapMs;
            moved = true;
          }
        }
        if (!moved) break;
      }
      reserved.set(spot, at);
      return at;
    },
  };
  return spacer;
}
