/**
 * The live answer's text, split into pieces at blank lines so only the growing last piece is
 * parsed again on each update (streamMarkdownPieces.ts). Deck, 2026-09-27, game running: the panel
 * started each answer at about 38 frames a second and sank to 21-28 past about 1,200 letters,
 * because each update parsed and drew the whole answer again.
 */
import { describe, expect, it } from "vitest";

import { splitStreamMarkdownPieces } from "./streamMarkdownPieces";

describe("splitStreamMarkdownPieces", () => {
  it("splits at blank lines between ordinary blocks, and the pieces join back to the text", () => {
    const text = "## Heading\n\nFirst paragraph.\n\nSecond paragraph, still growing";
    const pieces = splitStreamMarkdownPieces(text);
    expect(pieces).toEqual(["## Heading", "\n\nFirst paragraph.", "\n\nSecond paragraph, still growing"]);
    expect(pieces.join("")).toBe(text);
  });

  it("keeps earlier pieces byte-for-byte the same as the text grows, so they are not drawn again", () => {
    const a = splitStreamMarkdownPieces("One.\n\nTwo.\n\nThr");
    const b = splitStreamMarkdownPieces("One.\n\nTwo.\n\nThree, and more.\n\nFour");
    expect(b.slice(0, 2)).toEqual(a.slice(0, 2));
  });

  it("never splits between two list items (a loose list), but does around a list", () => {
    const text = "Intro.\n\n- first\n\n- second\n\n1. one\n\n2. two\n\nAfter.";
    const pieces = splitStreamMarkdownPieces(text);
    expect(pieces).toEqual(["Intro.", "\n\n- first\n\n- second\n\n1. one\n\n2. two", "\n\nAfter."]);
  });

  it("keeps a list item's indented second paragraph with its list", () => {
    const text = "- item\n\n  more about it\n\n- next";
    expect(splitStreamMarkdownPieces(text)).toEqual([text]);
  });

  it("never splits before an indented line (a list item's second paragraph, indented code)", () => {
    // Before the indented line: no split. After it, a plain paragraph ends the code: safe.
    expect(splitStreamMarkdownPieces("Para.\n\n    code line\n\nNext.")).toEqual(["Para.\n\n    code line", "\n\nNext."]);
    expect(splitStreamMarkdownPieces("Para one.\n\n\tTabbed")).toEqual(["Para one.\n\n\tTabbed"]);
  });

  it("never splits inside a code fence", () => {
    const text = "Before.\n\n```\nline\n\nline two\n```\n\nAfter.";
    expect(splitStreamMarkdownPieces(text)).toEqual(["Before.", "\n\n```\nline\n\nline two\n```", "\n\nAfter."]);
  });

  it("keeps a table in one piece", () => {
    const text = "| a | b |\n|---|---|\n| 1 | 2 |\n\nAfter.";
    expect(splitStreamMarkdownPieces(text)).toEqual(["| a | b |\n|---|---|\n| 1 | 2 |", "\n\nAfter."]);
  });

  it("treats three or more newlines as one boundary", () => {
    expect(splitStreamMarkdownPieces("One.\n\n\nTwo.")).toEqual(["One.", "\n\n\nTwo."]);
  });

  it("returns the text whole when there is nothing to split", () => {
    expect(splitStreamMarkdownPieces("")).toEqual([""]);
    expect(splitStreamMarkdownPieces("just one line")).toEqual(["just one line"]);
  });

  /*
   * Plan 76 lane 1: a block ends only on its own closing line, holding the same mark and at least
   * as long as the opener (markdownFenceReader). Any fence line used to close any block, so a
   * hidden block holding another kind of fence line was cut at that line and its second half,
   * drawn as a piece of its own, showed as plain text while the answer streamed.
   */
  describe("fences other than a plain three-backtick block", () => {
    const F = "`".repeat(3);
    const F4 = "`".repeat(4);
    const T = "~~~";
    const oneBlock = (block: string) => {
      const text = `Before.\n\n${block}\n\nAfter.`;
      expect(splitStreamMarkdownPieces(text)).toEqual(["Before.", `\n\n${block}`, "\n\nAfter."]);
    };

    it("keeps a ~~~ hidden block whole across a blank line inside it", () => {
      oneBlock(`${T}bonsai-spoiler\nOne.\n\nTwo.\n${T}`);
    });

    it("does not let a ``` line close a ~~~ block", () => {
      oneBlock(`${T}bonsai-spoiler\nOne.\n${F}\n\nTwo.\n${T}`);
    });

    it("does not let a ~~~ line close a ``` block", () => {
      oneBlock(`${F}bonsai-spoiler\nOne.\n${T}\n\nTwo.\n${F}`);
    });

    it("keeps a four-backtick block whole, with a ``` line and a blank line inside", () => {
      oneBlock(`${F4}bonsai-spoiler\nOne.\n${F}\n\nTwo.\n${F4}`);
    });

    it("does not take a line with a label after its marks for a closer", () => {
      oneBlock(`${F}bonsai-spoiler\nOne.\n${F}json\n\nTwo.\n${F}`);
    });

    it("never starts a piece inside an unclosed ~~~ block", () => {
      const block = `${T}bonsai-spoiler\nOne.\n\nTwo, still arriving`;
      expect(splitStreamMarkdownPieces(`Before.\n\n${block}`)).toEqual(["Before.", `\n\n${block}`]);
    });

    it("does not count a closing mark glued onto a sentence as a closer", () => {
      const text = `${F}bonsai-spoiler\nOne sentence.${F}\n\nStill inside.`;
      expect(splitStreamMarkdownPieces(text)).toEqual([text]);
    });

    it("still ends the block on its own closing line, then splits after it", () => {
      const text = `${T}\nOne.\n\nTwo.\n${T}\n\nAfter.\n\nMore.`;
      expect(splitStreamMarkdownPieces(text)).toEqual([`${T}\nOne.\n\nTwo.\n${T}`, "\n\nAfter.", "\n\nMore."]);
    });
  });
});
