import { describe, expect, it } from "vitest";
import { THINKING_BLURB_PLACEHOLDER, sanitizeThinkingSummary } from "./thinkingSummaryText";

/*
 * The pool, tone and intent-classification tests that used to live here went with the client-side
 * composer they covered. Their Python equivalents in tests/test_bonsai_stream_tags.py are the same
 * assertions against the only implementation that remains, so nothing is now unverified — and they
 * can no longer pass while disagreeing with each other, which is what the TS copies were doing.
 */
describe("thinking summary text", () => {
  it("strips lazy sarcastic openers", () => {
    expect(sanitizeThinkingSummary("Yeah, checking GPU")).toBe("checking GPU");
    expect(sanitizeThinkingSummary("Yeah — another crisis")).toBe("another crisis");
    expect(sanitizeThinkingSummary("Fine. Sure. Working")).toBe("Working");
  });

  /*
   * Same table as test_sanitize_thinking_summary_parity in tests/test_bonsai_stream_tags.py.
   * The two sanitizers run in series on the same string — Python on the model tag, TS again on
   * the polled result — so a divergence here does not merely differ, it blanks the line.
   */
  it("keeps an all-opener summary rather than blanking it", () => {
    expect(sanitizeThinkingSummary("Sure.")).toBe("Sure.");
    expect(sanitizeThinkingSummary("Yeah")).toBe("Yeah");
    expect(sanitizeThinkingSummary("Fine. Sure.")).toBe("Fine. Sure.");
    expect(sanitizeThinkingSummary("")).toBe("");
    expect(sanitizeThinkingSummary("   ")).toBe("");
  });

  it("is idempotent, so a second pass cannot blank the line", () => {
    for (const input of ["Sure.", "Yeah, checking GPU", "Fine. Sure. Working", "Working"]) {
      const once = sanitizeThinkingSummary(input);
      expect(sanitizeThinkingSummary(once)).toBe(once);
      expect(once).not.toBe("");
    }
  });

  it("survives its own placeholder", () => {
    expect(sanitizeThinkingSummary(THINKING_BLURB_PLACEHOLDER)).toBe(THINKING_BLURB_PLACEHOLDER);
  });
});
