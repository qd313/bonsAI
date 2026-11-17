/**
 * MainTab hands the streamed-answer scramble setting to the chat transcript through a React
 * context instead of a prop, because the transcript and the Ask hook that feeds it are both
 * already at their size limit (see streamScrambleContext.ts). The context's own default is
 * covered in streamScrambleContext.test.ts; this covers the other small piece MainTab itself
 * adds -- the pure function that turns whether a game runs into the value it provides. Rendering
 * the whole Main tab just to prove this would pull in the transcript, the Ask bar and the
 * screenshot browser for no reason.
 */
import { afterEach, describe, expect, it } from "vitest";

import { resolveStreamScrambleSettings } from "./MainTab";
import { STREAM_SCRAMBLE_OFF, STREAM_SCRAMBLE_STOCK } from "../answer/stream/streamScrambleContext";

describe("resolveStreamScrambleSettings", () => {
  /* Plan 105: the scramble has no setting. Answers scramble with the stock values (the ones the Developer tab started from). */
  it("scrambles with the stock values: on, 400 ms", () => {
    expect(STREAM_SCRAMBLE_STOCK).toEqual({ enabled: true, settleMs: 400 });
    expect(resolveStreamScrambleSettings()).toBe(STREAM_SCRAMBLE_STOCK);
    expect(resolveStreamScrambleSettings(false)).toBe(STREAM_SCRAMBLE_STOCK);
  });

  /*
   * Plan 70: with a game running the panel drew 10 to 20 frames a second while an answer arrived;
   * plan 69 measured the scramble alone at about 10 frames a second with nothing running.
   */
  it("keeps the decode effect while a game runs (the maintainer's call, 2026-09-27)", () => {
    expect(resolveStreamScrambleSettings(true)).toBe(STREAM_SCRAMBLE_STOCK);
  });

  it("skips the scramble with a game running when the Deck's switch asks, to measure its cost", () => {
    (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad = { scramble: true };
    expect(resolveStreamScrambleSettings(true)).toBe(STREAM_SCRAMBLE_OFF);
    expect(resolveStreamScrambleSettings(false)).toBe(STREAM_SCRAMBLE_STOCK);
  });
});

afterEach(() => {
  delete (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad;
});
