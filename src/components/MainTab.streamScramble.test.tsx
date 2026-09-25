/**
 * MainTab hands the streamed-answer scramble setting to the chat transcript through a React
 * context instead of a prop, because the transcript and the Ask hook that feeds it are both
 * already at their size limit (see streamScrambleContext.ts). The context's own default is
 * covered in streamScrambleContext.test.ts; this covers the other small piece MainTab itself
 * adds -- the pure function that turns the one optional `streamScramble` prop it was given into
 * the value it provides. Rendering the whole Main tab just to prove this would pull in the
 * transcript, the Ask bar and the screenshot browser for no reason.
 */
import { describe, expect, it } from "vitest";

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
});
