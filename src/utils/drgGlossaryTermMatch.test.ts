import { describe, expect, it } from "vitest";

import { findDrgGlossaryTermMatches, splitTextForDrgGlossaryTerms } from "./drgGlossaryTermMatch";
import { TEST_GLOSSARY_TERMS as terms } from "../test-harness/glossaryTestTerms";

describe("findDrgGlossaryTermMatches", () => {
  it("finds 'kiting' straight from the shipped DRG Survivor card text", () => {
    // The roadmap's anchor sentence, from the game's own note.
    const text =
      "Mining is not a side activity — it is where the resources for upgrades come from, so a " +
      "run spent only kiting is a run that ends underpowered.";
    const matches = findDrgGlossaryTermMatches(text, terms);
    expect(matches).toHaveLength(1);
    expect(matches[0].term.id).toBe("kiting");
    expect(matches[0].matchedText).toBe("kiting");
  });

  it("matches curated alt forms (kite) case-insensitively", () => {
    const matches = findDrgGlossaryTermMatches("Kite between waves; focus weak-point armor plates.", terms);
    expect(matches).toHaveLength(1);
    expect(matches[0].term.id).toBe("kiting");
    expect(matches[0].matchedText).toBe("Kite");
  });

  it("matches 'overclock' without truncating the plural 'overclocks'", () => {
    const matches = findDrgGlossaryTermMatches("Overclocks change what a weapon is for.", terms);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchedText).toBe("Overclocks");
    expect(matches[0].term.id).toBe("overclock");
  });

  it("respects word boundaries: 'clockwork' does not fire the 'overclock' term", () => {
    expect(findDrgGlossaryTermMatches("The clockwork enemy approaches.", terms)).toHaveLength(0);
  });

  it("matches when the term is flush against punctuation", () => {
    const matches = findDrgGlossaryTermMatches("(kiting), then mine.", terms);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchedText).toBe("kiting");
  });

  it("finds multiple distinct terms in one string, in order", () => {
    const matches = findDrgGlossaryTermMatches(
      "Save overclock for the fight, and kite between waves.",
      terms
    );
    expect(matches.map((m) => m.term.id)).toEqual(["overclock", "kiting"]);
  });

  it("returns nothing for text with no curated term", () => {
    expect(findDrgGlossaryTermMatches("Mine nitra and gold, then buy upgrades.", terms)).toHaveLength(0);
  });

  it("returns nothing for empty text", () => {
    expect(findDrgGlossaryTermMatches("", terms)).toHaveLength(0);
  });
});

describe("splitTextForDrgGlossaryTerms", () => {
  it("returns a single text segment when there is no match", () => {
    const segments = splitTextForDrgGlossaryTerms("Mine nitra and gold.", terms);
    expect(segments).toEqual([{ kind: "text", value: "Mine nitra and gold." }]);
  });

  it("splits around a single term, preserving surrounding text verbatim", () => {
    const segments = splitTextForDrgGlossaryTerms("a run spent only kiting is a run", terms);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ kind: "text", value: "a run spent only " });
    expect(segments[1]).toMatchObject({ kind: "term", value: "kiting" });
    expect((segments[1] as { term: { id: string } }).term.id).toBe("kiting");
    expect(segments[2]).toEqual({ kind: "text", value: " is a run" });
  });

  it("rejoins to the original string", () => {
    const original = "Save overclock for the fight, and kite between waves.";
    const segments = splitTextForDrgGlossaryTerms(original, terms);
    const rejoined = segments.map((s) => s.value).join("");
    expect(rejoined).toBe(original);
  });

  it("handles a term at the very start and end of the string", () => {
    const segments = splitTextForDrgGlossaryTerms("kiting", terms);
    expect(segments).toEqual([
      expect.objectContaining({ kind: "term", value: "kiting" }),
    ]);
  });
});

describe("with no words", () => {
  it("finds nothing and leaves the text as one plain piece", () => {
    expect(findDrgGlossaryTermMatches("kiting", [])).toHaveLength(0);
    expect(splitTextForDrgGlossaryTerms("kiting", [])).toEqual([{ kind: "text", value: "kiting" }]);
  });
});
