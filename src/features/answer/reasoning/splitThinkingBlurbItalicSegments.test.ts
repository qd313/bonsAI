import { describe, expect, it } from "vitest";
import { splitThinkingBlurbItalicSegments } from "./splitThinkingBlurbItalicSegments";

describe("splitThinkingBlurbItalicSegments", () => {
  it("keeps emoji-only blurbs entirely upright", () => {
    for (const emoji of ["🙄", "😮‍💨", "🫠", "🌳"]) {
      expect(splitThinkingBlurbItalicSegments(emoji)).toEqual([{ text: emoji, italic: false }]);
    }
  });

  it("italicizes prose-only blurbs", () => {
    expect(splitThinkingBlurbItalicSegments("On it — your question…")).toEqual([
      { text: "On it — your question…", italic: true },
    ]);
  });

  it("splits leading emoji from prose", () => {
    expect(splitThinkingBlurbItalicSegments("🔥🔥Another crisis 🔥🔥: help")).toEqual([
      { text: "🔥🔥", italic: false },
      { text: "Another crisis ", italic: true },
      { text: "🔥🔥", italic: false },
      { text: ": help", italic: true },
    ]);
  });

  it("treats ZWJ emoji sequences as one upright grapheme", () => {
    expect(splitThinkingBlurbItalicSegments("😮‍💨")).toEqual([{ text: "😮‍💨", italic: false }]);
  });

  it("keeps redaction blocks upright, so a hidden span does not lean", () => {
    expect(splitThinkingBlurbItalicSegments("Beating ███████ now")).toEqual([
      { text: "Beating ", italic: true },
      { text: "███████", italic: false },
      { text: " now", italic: true },
    ]);
  });

  it("returns no segments for empty input", () => {
    expect(splitThinkingBlurbItalicSegments("")).toEqual([]);
    expect(splitThinkingBlurbItalicSegments("   ")).toEqual([{ text: "   ", italic: true }]);
  });
});
