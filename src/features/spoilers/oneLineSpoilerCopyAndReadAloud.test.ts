/**
 * Copy must not give away a hidden block the model wrote on one line
 * ("```bonsai-spoiler The Soul Master teleports. ```") -- plan 72 lane 6.
 *
 * Copy finds hidden blocks with a pattern that needs the opening marker alone on its line, so
 * before this fix a one-line block was copied word for word: measured on the raw shape, Copy gave
 * "- tip: ```bonsai-spoiler The Soul Master teleports. ```". The screen already draws such a block
 * as a cover (expandOneLineSpoilerFences); Copy now reads it the same way.
 */
import { describe, expect, it } from "vitest";

import { SPOILER_HIDDEN_COPY_PLACEHOLDER, buildAnswerCopyText } from "../answer/reply-actions/answerCopyText";

const F = "`".repeat(3);
const SECRET = "The Soul Master teleports.";

/** The one-line shapes: as the model writes them, and as the back end's safety net leaves them. */
const SHAPES: Record<string, string> = {
  "glued to a bullet, raw": `- tip: ${F}bonsai-spoiler ${SECRET} ${F}\nGood luck.`,
  "own line, raw": `Intro.\n${F}bonsai-spoiler ${SECRET}${F}\nGood luck.`,
  "glued to a bullet, after the safety net": `- tip: \n${F}bonsai-spoiler ${SECRET} \n${F}\nGood luck.`,
  "own line, after the safety net": `Intro.\n${F}bonsai-spoiler ${SECRET}\n${F}\nGood luck.`,
};

describe("a hidden block written on one line, in Copy and Read aloud", () => {
  for (const [name, body] of Object.entries(SHAPES)) {
    it(`is never copied (${name})`, () => {
      const copied = buildAnswerCopyText({ body });
      expect(copied).not.toContain("Soul Master");
      expect(copied).not.toContain("bonsai-spoiler");
      expect(copied).toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
      expect(copied).toContain("Good luck.");
    });

    it(`is copied and read as its text when spoiler covers are off (${name})`, () => {
      const copied = buildAnswerCopyText({ body, spoilerMaskingEnabled: false });
      expect(copied).toContain(SECRET);
      expect(copied).not.toContain("bonsai-spoiler");
    });
  }

  it("leaves a block written the usual way exactly as before", () => {
    const usual = `Intro.\n\n${F}bonsai-spoiler\n${SECRET}\n${F}\n\nGood luck.`;
    expect(buildAnswerCopyText({ body: usual })).toBe(
      "Intro.\n\n[Spoiler hidden — reveal it on screen to copy]\n\nGood luck."
    );
    expect(buildAnswerCopyText({ body: usual, spoilerMaskingEnabled: false })).toBe(
      "Intro.\n\nThe Soul Master teleports.\n\nGood luck."
    );
  });
});
