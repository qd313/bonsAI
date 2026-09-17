/**
 * Title: Reading the model's own thinking for the screen
 * Purpose: Pin the small pieces the reasoning display is built from — how the live slice is cut
 *          into sentences, how many of them ever show, what the fold row's seconds read, and what
 *          counts as "this turn has no thinking at all".
 * Used for: reasoningDisplay.ts, which the chat transcript and the ask hook both read.
 * Solves: the "never a fourth line" rule and the "under a second reads 1 s" rule are drawing rules
 *         from the plan, easy to lose in a later edit and invisible until someone is on a Deck.
 * Does not: prove anything about how the lines look — that is the transcript's own tests.
 */
import { describe, expect, it } from "vitest";
import {
  formatReasoningSeconds,
  newestReasoningLines,
  normalizeTurnReasoning,
  reasoningFoldLabel,
  reasoningFromFinishedStatus,
  splitReasoningSentences,
} from "./reasoningDisplay";

describe("splitting the live thinking into sentences", () => {
  it("ends a sentence at a full stop followed by a space", () => {
    expect(splitReasoningSentences("The boss has two phases. The second one starts at half.")).toEqual([
      "The boss has two phases.",
      "The second one starts at half.",
    ]);
  });

  it("ends a sentence at a question mark and an exclamation mark too", () => {
    expect(splitReasoningSentences("Which weapon? The drill! Probably.")).toEqual([
      "Which weapon?",
      "The drill!",
      "Probably.",
    ]);
  });

  it("keeps a decimal number inside one sentence", () => {
    expect(splitReasoningSentences("It takes 3.5 times longer.")).toEqual(["It takes 3.5 times longer."]);
  });

  it("treats a line break as the end of a sentence", () => {
    expect(splitReasoningSentences("first thought\nsecond thought")).toEqual([
      "first thought",
      "second thought",
    ]);
  });

  it("drops blank pieces and trims what is left", () => {
    expect(splitReasoningSentences("  \n\n  one.   \n\n  two.  \n")).toEqual(["one.", "two."]);
  });

  it("gives nothing back for nothing", () => {
    expect(splitReasoningSentences("")).toEqual([]);
    expect(splitReasoningSentences(null)).toEqual([]);
    expect(splitReasoningSentences(undefined)).toEqual([]);
  });

  it("keeps the cut-off opening fragment, which is what the newest slice always starts with", () => {
    expect(splitReasoningSentences("ing at the health bar. Then I check the wiki.")).toEqual([
      "ing at the health bar.",
      "Then I check the wiki.",
    ]);
  });
});

describe("how many lines ever show", () => {
  it("shows one when there is one", () => {
    expect(newestReasoningLines("only this.")).toEqual(["only this."]);
  });

  it("shows two when there are two", () => {
    expect(newestReasoningLines("one. two.")).toEqual(["one.", "two."]);
  });

  it("shows three when there are three", () => {
    expect(newestReasoningLines("one. two. three.")).toEqual(["one.", "two.", "three."]);
  });

  it("never gives back a fourth, and keeps the newest three", () => {
    const ten = "a. b. c. d. e. f. g. h. i. j.";
    expect(newestReasoningLines(ten)).toEqual(["h.", "i.", "j."]);
    expect(newestReasoningLines(ten)).toHaveLength(3);
  });
});

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
