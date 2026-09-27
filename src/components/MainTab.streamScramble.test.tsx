/**
 * MainTab hands the streamed-answer scramble setting to the chat transcript through a React
 * context instead of a prop, because the transcript and the Ask hook that feeds it are both
 * already at their size limit (see streamScrambleContext.ts). The context's own default is
 * covered in streamScrambleContext.test.ts; this covers the other small piece MainTab itself
 * adds -- the pure function that turns the one optional `streamScramble` prop it was given into
 * the value it provides. Rendering the whole Main tab just to prove this would pull in the
 * transcript, the Ask bar and the screenshot browser for no reason.
 */
import { afterEach, describe, expect, it } from "vitest";

import { resolveStreamScrambleSettings } from "./MainTab";
import { STREAM_SCRAMBLE_OFF } from "../features/stream-scramble/streamScrambleContext";

describe("resolveStreamScrambleSettings", () => {
  it("is the shared off constant when no prop was given (an older caller that predates the setting)", () => {
    expect(resolveStreamScrambleSettings(undefined)).toBe(STREAM_SCRAMBLE_OFF);
  });

  it("passes the given settings through as-is when the switch is on", () => {
    const given = { enabled: true, style: "tail", color: "dim", settleMs: 600 } as const;
    expect(resolveStreamScrambleSettings(given)).toBe(given);
  });

  it("passes the given settings through as-is even when the switch is off", () => {
    const given = { enabled: false, style: "settle", color: "green", settleMs: 400 } as const;
    expect(resolveStreamScrambleSettings(given)).toBe(given);
  });

  /*
   * Plan 70: with a game running the panel drew 10 to 20 frames a second while an answer arrived;
   * plan 69 measured the scramble alone at about 10 frames a second with nothing running.
   */
  it("keeps the decode effect while a game runs (the maintainer's call, 2026-09-27)", () => {
    const given = { enabled: true, style: "settle", color: "same", settleMs: 400 } as const;
    expect(resolveStreamScrambleSettings(given, true)).toBe(given);
    expect(resolveStreamScrambleSettings(given, false)).toBe(given);
  });

  it("skips the scramble with a game running when the Deck's switch asks, to measure its cost", () => {
    (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad = { scramble: true };
    const given = { enabled: true, style: "settle", color: "same", settleMs: 400 } as const;
    expect(resolveStreamScrambleSettings(given, true)).toBe(STREAM_SCRAMBLE_OFF);
    expect(resolveStreamScrambleSettings(given, false)).toBe(given);
  });
});

afterEach(() => {
  delete (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad;
});
