/**
 * Read aloud must say "There is code on screen." for a code block fenced with three tildes (or
 * four backticks), as it already does for a three-backtick block -- plan 77 helper A. Before, only
 * the backtick shape was found, so a `~~~` block was spoken word for word.
 */
import { describe, expect, it } from "vitest";

import { buildAnswerCopyText } from "./answerCopyText";
import {
  CODE_SPOKEN_PHRASE,
  SPOILER_HIDDEN_SPOKEN_PHRASE,
  buildAnswerReadableText,
} from "./answerReadableText";

const F = "`".repeat(3);
const F4 = "`".repeat(4);
const T = "~~~";

const SHAPES: Record<string, string> = {
  "a ~~~ block": `Try this.\n\n${T}\nrm -rf cache\n${T}\n\nDone.`,
  "a ~~~ block with a language": `Try this.\n\n${T}bash\nrm -rf cache\n${T}\n\nDone.`,
  "a ~~~ block with a blank line inside": `Try this.\n\n${T}\nrm -rf\n\ncache\n${T}\n\nDone.`,
  "a four-backtick block holding a ``` line": `Try this.\n\n${F4}\nrm -rf\n${F}\ncache\n${F4}\n\nDone.`,
  "a ~~~ block in a bullet": `- Try this.\n\n  ${T}\n  rm -rf cache\n  ${T}\n\nDone.`,
};

describe("Read aloud and a code block that is not fenced with three backticks", () => {
  for (const [name, body] of Object.entries(SHAPES)) {
    it(`says there is code on screen (${name})`, () => {
      const spoken = buildAnswerReadableText({ body });
      expect(spoken).toContain(CODE_SPOKEN_PHRASE);
      expect(spoken).not.toContain("rm");
      expect(spoken).not.toContain("cache");
      expect(spoken).toContain("Try this.");
      expect(spoken).toContain("Done.");
    });
  }

  it("still says the phrase once for a three-backtick block", () => {
    const body = `Try this.\n\n${F}\nrm -rf cache\n${F}\n\nDone.`;
    expect(buildAnswerReadableText({ body })).toBe(`Try this. ${CODE_SPOKEN_PHRASE} Done.`);
  });

  it("says each of two blocks of different kinds, and keeps a hidden block hidden", () => {
    const body = `${T}\none\n${T}\n\n${F}\ntwo\n${F}\n\n${T}bonsai-spoiler\nsecret words\n${T}`;
    expect(buildAnswerReadableText({ body })).toBe(
      `${CODE_SPOKEN_PHRASE} ${CODE_SPOKEN_PHRASE} ${SPOILER_HIDDEN_SPOKEN_PHRASE}`
    );
  });

  it("does not turn a lone ~~~ inside a sentence into code", () => {
    const body = "It costs about ~~~ 5 gold, then more.";
    expect(buildAnswerReadableText({ body })).not.toContain(CODE_SPOKEN_PHRASE);
  });

  it("leaves Copy keeping the code, as it does for a backtick block", () => {
    const body = SHAPES["a ~~~ block"]!;
    expect(buildAnswerCopyText({ body })).toBe(body);
  });
});
