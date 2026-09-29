/**
 * Chunk splitter contract for terminal replies. Mid-stream live markdown uses
 * prepareStreamMarkdown (R2) until T3 handoff; see buildAnswerBubbleElement.tsx.
 */
import { describe, expect, it } from "vitest";
import { splitResponseIntoChunks } from "./splitResponseIntoChunks";

describe("splitResponseIntoChunks", () => {
  it("splits prose at blank lines but keeps a fenced block intact", () => {
    const t = "Intro line.\n\n```json\n{\"tdp_watts\": 8}\n```\n\nMore text after.";
    const c = splitResponseIntoChunks(t);
    expect(c).toHaveLength(3);
    expect(c[0]).toContain("Intro");
    expect(c[1]).toMatch(/```json/);
    expect(c[1]).toContain("tdp_watts");
    expect(c[2]).toContain("More text");
  });

  it("does not split inside a code fence when a blank line appears inside the fence", () => {
    const t = "Start\n\n```\nline1\n\nline2\n```\n\nEnd";
    const c = splitResponseIntoChunks(t);
    expect(c.length).toBeGreaterThanOrEqual(1);
    const withFence = c.find((x) => x.includes("line1") && x.includes("line2"));
    expect(withFence).toBeDefined();
    expect(withFence).toMatch(/```/);
  });

  it("returns a single chunk for short fenced-only content", () => {
    const t = "```json\n{\"a\":1}\n```";
    const c = splitResponseIntoChunks(t);
    expect(c).toEqual([t.trim()]);
  });

  it("keeps bonsai-spoiler fence intact across internal blank lines", () => {
    const t = "Hint here.\n\n```bonsai-spoiler\nBoss: Ganon\n\nPhase 2: ...\n```\n\nAfter.";
    const c = splitResponseIntoChunks(t);
    expect(c.length).toBeGreaterThanOrEqual(1);
    const spoilerChunk = c.find((x) => x.includes("bonsai-spoiler") && x.includes("Phase 2"));
    expect(spoilerChunk).toBeDefined();
  });

  describe("long single-paragraph text — sentence-boundary cuts", () => {
    /*
     * A ~160-char filler with no blank line, so the whole thing stays one paragraph and one line —
     * only `splitLongRespectingFences`'s density split (maxLen 300) can produce a second chunk here.
     * Long enough to push the shout sentence past the "prefer a nearby '. '" floor (start + 80) but
     * still inside the 300-char cut window, so `findSafeCutInRange` picks the period this test cares
     * about rather than a later or earlier one.
     */
    const FILLER =
      "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut " +
      "labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation. ";
    const TAIL =
      " and never let them corner you, because that is when things go from bad to worse for " +
      "everyone involved and nobody in the squad wants that outcome at all, trust me on this one.";

    it.each(["BOOM", "KABOOM", "RUN"])(
      /* Regression guard for "a rendered reply breaks a line mid-sentence": the model wrote one
         unbroken sentence ("...go BOOM. The trick is...") and the display layer introduced the
         break, landing the period at the start of the next chunk instead of the end of this one. */
      'keeps "%s." on the same chunk as the sentence it ends, not orphaned onto the next one',
      (shoutWord) => {
        const text = `${FILLER}they walk right into ya and go ${shoutWord}. The trick is to keep your distance${TAIL}`;
        const chunks = splitResponseIntoChunks(text);

        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks) {
          expect(chunk.trimStart().startsWith(".")).toBe(false);
        }
        const shoutChunk = chunks.find((c) => c.includes(shoutWord));
        expect(shoutChunk).toBeDefined();
        expect(shoutChunk).toContain(`${shoutWord}.`);
      }
    );
  });
  /*
   * Fewer D-pad stops on a finished reply. One stop per paragraph meant ten-plus Down presses
   * before the buttons under a long answer; neighbouring short pieces now merge up to about half
   * a screen of text. The merge must not change a single word, and must leave code fences alone.
   */
  describe("merging short pieces into fewer stops", () => {
    const words = (value: string) => value.split(/\s+/).filter(Boolean);

    it("merges ten short paragraphs into a handful of stops", () => {
      const t = Array.from({ length: 10 }, (_, i) => `Paragraph ${i} says a short thing.`).join(
        "\n\n"
      );
      const c = splitResponseIntoChunks(t);
      expect(c.length).toBeGreaterThan(0);
      expect(c.length).toBeLessThanOrEqual(4);
      expect(words(c.join("\n\n"))).toEqual(words(t));
    });

    it("merges a twelve-line bullet list into one stop", () => {
      const t = Array.from({ length: 12 }, (_, i) => `- Bullet number ${i}`).join("\n");
      const c = splitResponseIntoChunks(t);
      expect(c).toHaveLength(1);
      expect(c[0]).toBe(t);
    });

    it("leaves a code fence in a stop of its own, with its neighbours in theirs", () => {
      const t = "Before the code.\n\n```sh\necho hi\n```\n\nAfter the code.";
      const c = splitResponseIntoChunks(t);
      expect(c).toHaveLength(3);
      expect(c[0]).toBe("Before the code.");
      expect(c[1]).toMatch(/```sh/);
      expect(c[2]).toBe("After the code.");
    });

    it("does not merge a paragraph that is already about half a screen long", () => {
      const long = `${"word ".repeat(200).trim()}.`;
      const t = `${long}\n\nA short trailing note.`;
      const c = splitResponseIntoChunks(t);
      expect(c).toHaveLength(2);
      expect(c[0]).toBe(long);
      expect(c[1]).toBe("A short trailing note.");
    });

    it("keeps every word, in order, when pieces are merged", () => {
      const t = [
        "First short paragraph.",
        "Second short paragraph.",
        "```\ncode block stays whole\n```",
        "Third short paragraph.",
        "Fourth short paragraph.",
      ].join("\n\n");
      const c = splitResponseIntoChunks(t);
      expect(words(c.join("\n\n"))).toEqual(words(t));
    });
  });
});

/*
 * Plan 76 lane 1: the panel draws a ~~~ block, and a block fenced with four backticks, as one block
 * from opener to closer. The splitter knew only three backticks, so a blank line inside such a
 * block cut it in two and half of it was drawn as plain text.
 */
describe("splitResponseIntoChunks — fences other than three backticks", () => {
  const F = "`".repeat(3);
  const F4 = "`".repeat(4);
  const T = "~~~";

  it("keeps a ~~~ hidden block whole across a blank line inside it", () => {
    const block = `${T}bonsai-spoiler\nBoss: Ganon\n\nPhase 2: ...\n${T}`;
    const c = splitResponseIntoChunks(`Hint here.\n\n${block}\n\nAfter.`);
    expect(c).toEqual(["Hint here.", block, "After."]);
  });

  it("keeps a four-backtick block whole, even with a ``` line and a blank line inside", () => {
    const block = `${F4}bonsai-spoiler\nOne.\n${F}\n\nTwo.\n${F4}`;
    const c = splitResponseIntoChunks(`Hint here.\n\n${block}\n\nAfter.`);
    expect(c).toEqual(["Hint here.", block, "After."]);
  });

  it("does not let a ``` line close a ~~~ block, nor a ~~~ line close a ``` block", () => {
    const a = `${T}bonsai-spoiler\nOne.\n${F}\n\nTwo.\n${T}`;
    expect(splitResponseIntoChunks(`Hint.\n\n${a}\n\nAfter.`)).toEqual(["Hint.", a, "After."]);
    const b = `${F}bonsai-spoiler\nOne.\n${T}\n\nTwo.\n${F}`;
    expect(splitResponseIntoChunks(`Hint.\n\n${b}\n\nAfter.`)).toEqual(["Hint.", b, "After."]);
  });

  it("keeps everything after an unclosed ~~~ block in that block, as the panel draws it", () => {
    const open = `${T}bonsai-spoiler\nOne.\n\nTwo.\n\nThree.`;
    expect(splitResponseIntoChunks(`Hint.\n\n${open}`)).toEqual(["Hint.", open]);
  });

  it("does not treat a closing mark glued onto a sentence as a closer", () => {
    const open = `${F}bonsai-spoiler\nOne sentence.${F}\n\nStill inside.`;
    expect(splitResponseIntoChunks(`Hint.\n\n${open}`)).toEqual(["Hint.", open]);
  });

  it("never cuts a long ~~~ block that has no blank line, by lines or by length", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `Line ${i} of the hidden text, long enough to add up.`);
    const block = `${T}bonsai-spoiler\n${lines.join("\n")}\n${T}`;
    expect(block.length).toBeGreaterThan(900);
    expect(splitResponseIntoChunks(block)).toEqual([block]);
  });

  it("leaves a ~~ strikethrough in a sentence alone", () => {
    const t = "This is ~~wrong~~ and that is right.\nSecond line.";
    expect(splitResponseIntoChunks(t)).toEqual([t]);
  });
});
