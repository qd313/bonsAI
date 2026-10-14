/**
 * Title: An answer's sections never change once they have closed
 * Purpose: Pin the rule behind plan 93's "a long answer is cut into sections while it writes, so
 *   nothing changes when it finishes": every cut cutAnswerSections makes is decided by the text
 *   before it, so for EVERY prefix of an answer, the sections the prefix has already closed are
 *   exactly the first sections of the finished answer.
 * Used for: splitResponseIntoChunks.ts (cutAnswerSections), drawn live and finished by
 *   buildAnswerSections.tsx.
 * Solves: The old cut looked ahead (it merged paragraphs up to 900 letters, and cut a one-paragraph
 *   answer every 300 letters only if no second paragraph came), so the answer could only be cut at
 *   the finish, and was redrawn then.
 * Does not: Draw anything; the screen-level check is MainTabChatTranscript.answerFinishStill.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { cutAnswerSections, SECTION_FULL_CHARS } from "./splitResponseIntoChunks";

const SENTENCE = "Dash through the arc rather than away from it, and keep moving between her attacks. ";
const para = (n: number, lead = "") => `${lead}${SENTENCE.repeat(n)}`.trim();
const F = "`".repeat(3);

/* Answer shapes a model really writes, each long enough to close several sections. */
const SHAPES: Record<string, string> = {
  "short paragraphs": Array.from({ length: 14 }, (_, i) => para(2, `Step ${i}. `)).join("\n\n"),
  "one long paragraph": para(30),
  "bold headings and prose": Array.from({ length: 6 }, (_, i) => `**Part ${i}:** ${para(4)}`).join("\n\n"),
  "a long tight list": Array.from({ length: 30 }, (_, i) => `- Item ${i}: ${SENTENCE.trim()}`).join("\n"),
  "a numbered list between paragraphs": `${para(8)}\n\n${Array.from({ length: 12 }, (_, i) => `${i + 1}. ${SENTENCE.trim()}`).join("\n")}\n\n${para(6)}`,
  "a code fence among prose": `${para(9)}\n\n${F}python\nprint("a")\n\nprint("b")\n${F}\n\n${para(9)}`,
  "a hidden block": `${para(8)}\n\n~~~bonsai-spoiler\nThe boss is her sister.\n\nTwice.\n~~~\n${para(8)}`,
  "a table": `${para(9)}\n| Charm | Notches |\n| --- | --- |\n${Array.from({ length: 20 }, (_, i) => `| Charm ${i} | ${i} |`).join("\n")}\n\n${para(3)}`,
  "a heading underline": `${para(9)}\nA heading\n---------\n${para(9)}`,
  "an indented continuation": `${Array.from({ length: 8 }, (_, i) => `- Item ${i} ${SENTENCE.trim()}\n  More about item ${i}.`).join("\n")}`,
  "an unclosed fence at the end": `${para(9)}\n\n${F}\nstill code ${SENTENCE}\n\nmore code`,
  /* A one-line hidden block inside a bold heading, as expandOneLineSpoilerFences opens it out. */
  "a hidden block inside a heading": `${para(9)}\n\n**7. \n${F}bonsai-spoiler\nCity of Tears\n${F}\n (Mid-Game)**\n- **What to Find:** ${SENTENCE}\n\n${para(8)}`,
};

describe("cutAnswerSections looks backwards only", () => {
  for (const [name, text] of Object.entries(SHAPES)) {
    it(`never changes a closed section as "${name}" arrives letter by letter`, () => {
      const finished = cutAnswerSections(text, true);
      expect(finished.length).toBeGreaterThan(1);
      for (let n = 1; n <= text.length; n += 1) {
        const live = cutAnswerSections(text.slice(0, n), false);
        const closed = live.slice(0, -1);
        expect(closed).toEqual(finished.slice(0, closed.length));
      }
    });

    it(`keeps every word of "${name}", in order`, () => {
      const words = (s: string) => s.split(/\s+/).filter(Boolean);
      expect(words(cutAnswerSections(text).join("\n\n"))).toEqual(words(text));
    });
  }

  it("closes a section only once it holds about SECTION_FULL_CHARS letters, fences aside", () => {
    for (const s of cutAnswerSections(SHAPES["short paragraphs"]!).slice(0, -1)) {
      expect(s.length).toBeGreaterThanOrEqual(SECTION_FULL_CHARS);
    }
  });

  it("puts a fence in a section of its own", () => {
    const sections = cutAnswerSections(SHAPES["a code fence among prose"]!);
    const fence = sections.find((s) => s.startsWith(F));
    expect(fence).toBe(`${F}python\nprint("a")\n\nprint("b")\n${F}`);
  });

  /*
   * Plan 93 round 2: the Deck showed "**7." as a label of its own above a hidden block (M10). The bold
   * is broken by the block either way (that part is the hidden block's own shape, before any cut), but
   * the cut must not make those four letters a D-pad stop: a block opening inside a paragraph stays
   * in that paragraph's section, as the old cut kept it.
   */
  it("keeps a block that opens inside a paragraph in that paragraph's section", () => {
    const sections = cutAnswerSections(SHAPES["a hidden block inside a heading"]!);
    expect(sections).not.toContain("**7.");
    const withBlock = sections.find((s) => s.includes("City of Tears"))!;
    expect(withBlock).toContain(`**7. \n${F}bonsai-spoiler`);
    expect(withBlock).toContain("(Mid-Game)**");
  });

  it("never cuts a table, an indented continuation or a heading from its underline", () => {
    for (const s of cutAnswerSections(SHAPES["a table"]!)) expect(s.startsWith("| Charm 3")).toBe(false);
    for (const s of cutAnswerSections(SHAPES["an indented continuation"]!)) expect(s.startsWith("More")).toBe(false);
    for (const s of cutAnswerSections(SHAPES["a heading underline"]!)) expect(s.startsWith("---")).toBe(false);
  });
});
