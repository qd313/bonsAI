/**
 * Copy keeps a code block fenced with three tildes (or four backticks) exactly as written, as it
 * does for a three-backtick block -- plan 77 helper A. (The file and group names still say Read
 * aloud, a feature that is gone; step 5 of plan 86 merges this file and renames it.)
 */
import { describe, expect, it } from "vitest";

import { buildAnswerCopyText } from "./answerCopyText";

const T = "~~~";

const SHAPES: Record<string, string> = {
  "a ~~~ block": `Try this.\n\n${T}\nrm -rf cache\n${T}\n\nDone.`,
};

describe("Read aloud and a code block that is not fenced with three backticks", () => {
  it("leaves Copy keeping the code, as it does for a backtick block", () => {
    const body = SHAPES["a ~~~ block"]!;
    expect(buildAnswerCopyText({ body })).toBe(body);
  });
});
