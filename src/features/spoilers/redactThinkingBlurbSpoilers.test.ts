import { describe, expect, it } from "vitest";
import { REDACTION_GLYPH, redactThinkingBlurbSpoilers } from "./redactThinkingBlurbSpoilers";

const hasMarkup = (s: string) => /\[\[\s*\/?\s*spoiler\s*\]\]/i.test(s);

describe("redactThinkingBlurbSpoilers", () => {
  it("blocks out the marked span and leaves the rest of the sentence readable", () => {
    const out = redactThinkingBlurbSpoilers(
      "Working out how to beat [[spoiler]]Malenia's waterfowl[[/spoiler]] dance",
      true,
    );
    expect(out.startsWith("Working out how to beat ")).toBe(true);
    expect(out.endsWith(" dance")).toBe(true);
    expect(out).toContain(REDACTION_GLYPH);
    expect(out).not.toContain("Malenia");
    expect(out).not.toContain("waterfowl");
  });

  it("keeps word boundaries so the line reads as redacted, not as one bar", () => {
    const out = redactThinkingBlurbSpoilers("Checking [[spoiler]]the secret ending[[/spoiler]]", true);
    const blocks = out.split(" ").filter((w) => w.startsWith(REDACTION_GLYPH));
    expect(blocks).toHaveLength(3);
  });

  it("caps a long span rather than filling the line with blocks", () => {
    const out = redactThinkingBlurbSpoilers(
      `Checking [[spoiler]]${"a".repeat(80)}[[/spoiler]]`,
      true,
    );
    expect(out.length).toBeLessThan(40);
  });

  it("keeps the words but drops the markup when masking is off", () => {
    const out = redactThinkingBlurbSpoilers(
      "Working out how to beat [[spoiler]]Malenia[[/spoiler]] now",
      false,
    );
    expect(out).toBe("Working out how to beat Malenia now");
    expect(hasMarkup(out)).toBe(false);
  });

  /*
   * The failure that matters most: a small model writes the opener and never closes it, or the
   * stream is cut mid-tag. Printing the tail would print exactly the words it flagged.
   */
  it("masks to the end of the line when the closing marker never arrived", () => {
    const out = redactThinkingBlurbSpoilers("Working out how to beat [[spoiler]]Malenia", true);
    expect(out).not.toContain("Malenia");
    expect(hasMarkup(out)).toBe(false);
    expect(out.startsWith("Working out how to beat ")).toBe(true);
  });

  it("never leaves raw markup on screen, in any malformed combination", () => {
    const cases = [
      "[[spoiler]]",
      "[[/spoiler]]",
      "a [[/spoiler]] b",
      "[[spoiler]]x[[/spoiler]][[spoiler]]y",
      "[[ SPOILER ]]x[[ / spoiler ]]",
      "[[spoiler]][[/spoiler]]",
    ];
    for (const input of [...cases]) {
      expect(hasMarkup(redactThinkingBlurbSpoilers(input, true)), input).toBe(false);
      expect(hasMarkup(redactThinkingBlurbSpoilers(input, false)), input).toBe(false);
    }
  });

  it("redacts every marked span, not just the first", () => {
    const out = redactThinkingBlurbSpoilers(
      "Comparing [[spoiler]]Malenia[[/spoiler]] with [[spoiler]]Radahn[[/spoiler]]",
      true,
    );
    expect(out).not.toContain("Malenia");
    expect(out).not.toContain("Radahn");
  });

  it("passes ordinary copy through untouched", () => {
    const plain = "Log spelunking for “why crash on launch”. Glamorous.";
    expect(redactThinkingBlurbSpoilers(plain, true)).toBe(plain);
    expect(redactThinkingBlurbSpoilers("", true)).toBe("");
  });
});
