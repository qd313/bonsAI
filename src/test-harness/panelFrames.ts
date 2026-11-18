/**
 * Title: The panel's frames, read the way the Deck's page recorder reads them
 * Purpose: Test helper for the "every frame" checks (plan 106 lane F1, row P105-SECTIONS-AUTO-01). On the Deck the
 *          driver measures a jump with a recorder inside the panel's page: a requestAnimationFrame loop that reads the
 *          ringed row's top once a frame. This steps a fake clock one frame (1/60 s) at a time and reads the same
 *          value at each frame, so a row that drops for a few frames and comes back shows up here frame by frame.
 * Used for: src/features/folded-tabs/autoFold.frames.test.tsx.
 * Solves: Where one frame ends and the next begins. Between two frames the page runs its tasks: timers that came due
 *         (the late look's timer, a reply from the back end arriving), the promises they settle, React's redraw, and
 *         the microtasks after it (a MutationObserver's callback). A recorder's frame callback runs after those and
 *         before that frame's layout, its ResizeObservers and its paint, so what it reads is what the plugin had
 *         already done by then. Anything the plugin only does later in the frame (a ResizeObserver) is not seen.
 * Does not: Model a ResizeObserver at all. One made in the plugin's own window (Decky's SharedJSContext) is not
 *           driven by the panel page's frames (useAskBarInitialRingClaim.ts, plan 81), and on the Deck one never put
 *           the row back in the 7 frames before the late look did (plan105-P105-SECTIONS-AUTO-01-d3b.json); the test
 *           setup's stand-in never fires, which matches that. Does not know real heights: the walk's flow model does.
 *           The caller must have turned fake timers on (vi.useFakeTimers) before the tab was drawn.
 */
import { act } from "@testing-library/react";
import { vi } from "vitest";

/** One frame at 60 frames a second, the Deck's own rate. */
const FRAME_MS = 1000 / 60;

/**
 * Step the fake clock one frame at a time for `ms`, and at each frame read `read()`, as the recorder's frame callback
 * does: after everything due before that frame has run. Returns one reading per frame, the first one frame in.
 */
export async function readEachFrame(ms: number, read: () => number): Promise<number[]> {
  const out: number[] = [];
  for (let t = FRAME_MS; t <= ms + 0.01; t += FRAME_MS) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FRAME_MS);
    });
    out.push(read());
  }
  return out;
}

/** Let every timer and reply due in the next `ms` run, with no readings: the page settling between two presses. */
export async function settle(ms = 2000): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** The frames whose reading is more than `limit` px from `base`, as "frame 3 (50 ms): +16.0 px", for a failure message. */
export function framesOff(readings: readonly number[], base: number, limit: number): string[] {
  return readings
    .map((top, i) => ({ i, d: top - base }))
    .filter(({ d }) => Math.abs(d) > limit)
    .map(({ i, d }) => `frame ${i + 1} (${Math.round((i + 1) * FRAME_MS)} ms): ${d > 0 ? "+" : ""}${d.toFixed(1)} px`);
}
