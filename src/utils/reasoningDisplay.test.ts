/**
 * Title: Reading the model's own thinking for the screen
 * Purpose: Pin the small pieces the reasoning display is built from — what
 *           the fold row's seconds read, and what counts as "this turn has no thinking
 *          at all".
 * Used for: reasoningDisplay.ts, which the chat transcript and the ask hook both read.
 * Solves: the "under a second reads 1 s" rule is a drawing
 *         rule, easy to lose in a later edit and invisible until someone is on a Deck.
 * Does not: prove anything about how the lines look — that is the transcript's own tests.
 */
import { describe, expect, it } from "vitest";
import {
  formatReasoningSeconds,
  normalizeTurnReasoning,
  reasoningFoldLabel,
  reasoningFromFinishedStatus,
} from "./reasoningDisplay";

describe("the seconds on the fold row", () => {
  it("shows a whole number of seconds", () => {
    expect(formatReasoningSeconds(41)).toBe("41 s");
  });

  it("never shows nought seconds", () => {
    expect(formatReasoningSeconds(0)).toBe("1 s");
    expect(formatReasoningSeconds(0.4)).toBe("1 s");
  });

  it("shows one second when the computer side sent no number at all", () => {
    expect(formatReasoningSeconds(null)).toBe("1 s");
    expect(formatReasoningSeconds(undefined)).toBe("1 s");
  });

  it("reads Show when closed and Hide when open", () => {
    expect(reasoningFoldLabel(false, 41)).toBe("Show reasoning · 41 s");
    expect(reasoningFoldLabel(true, 41)).toBe("Hide reasoning · 41 s");
  });
});

describe("what counts as a turn with thinking behind it", () => {
  it("keeps a record that has text", () => {
    expect(normalizeTurnReasoning({ text: "I checked the wiki.", seconds: 3, tokens: 12 })).toEqual({
      text: "I checked the wiki.",
      seconds: 3,
      tokens: 12,
    });
  });

  it("counts an empty or whitespace-only think as no thinking at all", () => {
    expect(normalizeTurnReasoning({ text: "", seconds: 3, tokens: 0 })).toBeUndefined();
    expect(normalizeTurnReasoning({ text: "   \n ", seconds: 3, tokens: 0 })).toBeUndefined();
  });

  it("counts a missing record as no thinking at all", () => {
    expect(normalizeTurnReasoning(undefined)).toBeUndefined();
    expect(normalizeTurnReasoning(null)).toBeUndefined();
    expect(normalizeTurnReasoning("whatever")).toBeUndefined();
  });

  it("fills in a missing seconds and a missing token count rather than refusing the record", () => {
    expect(normalizeTurnReasoning({ text: "thought" })).toEqual({
      text: "thought",
      seconds: null,
      tokens: 0,
    });
  });

  it("reads the three fields off a finished answer", () => {
    expect(
      reasoningFromFinishedStatus({
        reasoning_text: "I weighed two routes.",
        reasoning_seconds: 41,
        reasoning_tokens: 380,
      }),
    ).toEqual({ text: "I weighed two routes.", seconds: 41, tokens: 380 });
  });

  it("gives nothing back for an answer that did no thinking", () => {
    expect(reasoningFromFinishedStatus({ reasoning_text: "" })).toBeUndefined();
    expect(reasoningFromFinishedStatus({})).toBeUndefined();
  });
});
