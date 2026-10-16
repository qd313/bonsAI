/**
 * Copy must hide a hidden block whatever way the model wrote its fence -- plan 76 lane 1. It used
 * to pair backtick runs anywhere, so a `~~~` block, a longer fence, or a block whose closing marker
 * was glued onto a sentence was copied, while the panel kept it behind its cover. It now reads
 * blocks the way the panel does (markdownFenceReader.ts).
 */
import { describe, expect, it } from "vitest";

import { SPOILER_HIDDEN_COPY_PLACEHOLDER, buildAnswerCopyText } from "./answerCopyText";

const F = "`".repeat(3);
const F4 = "`".repeat(4);
const T = "~~~";
const SECRET = "The reactor core explodes in act three.";
const SECRET_2 = "Then the ship crashes.";

/** Each shape: the answer as the model wrote it, and what the panel leaves in plain view. */
const SHAPES: Record<string, { body: string; visible: string[]; alsoHidden?: string[] }> = {
  "a ~~~ block": {
    body: `Intro.\n\n${T}bonsai-spoiler\n${SECRET}\n${T}\n\nGood luck.`,
    visible: ["Intro.", "Good luck."],
  },
  "a ~~~ block with a blank line inside": {
    body: `Intro.\n\n${T}bonsai-spoiler\n${SECRET}\n\n${SECRET_2}\n${T}\n\nGood luck.`,
    visible: ["Intro.", "Good luck."],
    alsoHidden: [SECRET_2],
  },
  "a ``` block with a blank line inside": {
    body: `Intro.\n\n${F}bonsai-spoiler\n${SECRET}\n\n${SECRET_2}\n${F}\n\nGood luck.`,
    visible: ["Intro.", "Good luck."],
    alsoHidden: [SECRET_2],
  },
  "a four-backtick block with a ``` line inside": {
    body: `Intro.\n\n${F4}bonsai-spoiler\n${SECRET}\n${F}\n${SECRET_2}\n${F4}\n\nGood luck.`,
    visible: ["Intro.", "Good luck."],
    alsoHidden: [SECRET_2],
  },
  "a ~~~ block holding a ``` line": {
    body: `Intro.\n\n${T}bonsai-spoiler\n${SECRET}\n${F}\n${SECRET_2}\n${T}\n\nGood luck.`,
    visible: ["Intro.", "Good luck."],
    alsoHidden: [SECRET_2],
  },
  "a block in a bullet": {
    body: `- Intro.\n  ${F}bonsai-spoiler\n  ${SECRET}\n  ${F}\n- Good luck.`,
    visible: ["Intro.", "Good luck."],
  },
  "a block in a quote": {
    body: `> ${F}bonsai-spoiler\n> ${SECRET}\n> ${F}\n\nGood luck.`,
    visible: ["Good luck."],
  },
};

/** The closer glued to the end of a sentence closes nothing: the panel hides the rest too. */
const GLUED_CLOSER = `Intro.\n\n${F}bonsai-spoiler\n${SECRET}${F}\n\nThe next part is also inside.`;

describe("a hidden block written oddly, in Copy and Read aloud", () => {
  for (const [name, shape] of Object.entries(SHAPES)) {
    it(`is never copied (${name})`, () => {
      const copied = buildAnswerCopyText({ body: shape.body });
      expect(copied).not.toContain(SECRET);
      for (const hidden of shape.alsoHidden ?? []) expect(copied).not.toContain(hidden);
      expect(copied).toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
      expect(copied).not.toContain("bonsai-spoiler");
      for (const seen of shape.visible) expect(copied).toContain(seen);
    });

    it(`is copied and read as its words when spoiler covers are off (${name})`, () => {
      const copied = buildAnswerCopyText({ body: shape.body, spoilerMaskingEnabled: false });
      expect(copied).toContain(SECRET);
      expect(copied).not.toContain("bonsai-spoiler");
      expect(copied).not.toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
    });
  }

  it("keeps a ~~~ block hidden even on a turn that consented, as the panel does", () => {
    // The consent unwrap knows only backtick fences, so the panel still draws the cover.
    const body = SHAPES["a ~~~ block"]!.body;
    expect(buildAnswerCopyText({ body, spoilerConsentEffective: true })).not.toContain(SECRET);
  });

  it("hides what follows a closer glued onto a sentence, because the panel does", () => {
    const copied = buildAnswerCopyText({ body: GLUED_CLOSER });
    expect(copied).toBe(`Intro.\n\n${SPOILER_HIDDEN_COPY_PLACEHOLDER}`);
  });

  it("hides two ~~~ blocks separately and keeps the words between them", () => {
    const body = `${T}bonsai-spoiler\n${SECRET}\n${T}\n\nMiddle words.\n\n${T}bonsai-spoiler\n${SECRET_2}\n${T}`;
    const copied = buildAnswerCopyText({ body });
    expect(copied).toBe(
      `${SPOILER_HIDDEN_COPY_PLACEHOLDER}\n\nMiddle words.\n\n${SPOILER_HIDDEN_COPY_PLACEHOLDER}`
    );
  });

  it("leaves an ordinary ~~~ code block alone in Copy", () => {
    const body = `Try this.\n\n${T}\nsome code\n${T}\n\nDone.`;
    expect(buildAnswerCopyText({ body })).toBe(body);
  });
});
