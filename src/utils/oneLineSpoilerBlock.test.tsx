/**
 * A hidden block the model writes on one line ("```bonsai-spoiler The Soul Master teleports. ```")
 * must still be a cover that opens onto its text (plan 72 lane 6).
 *
 * Measured on the real renderer before the fix: markdown reads text after the opening backticks
 * as the block's label, so the shape the back end's safety net leaves ("```bonsai-spoiler The
 * Soul Master teleports.\n```") drew a cover that opened onto the word "undefined", and the raw
 * shape (no safety net that turn) drew no cover at all: the spoiler showed as plain code text.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { buildAnswerBubbleElement } from "./buildAnswerBubbleElement";
import { expandOneLineSpoilerFences } from "./expandOneLineSpoilerFences";
import { resetAnswerStopRegistry } from "./answerStopRegistry";
import { resetSpoilerFenceOpenCountForTests } from "../components/MainTabBonsaiAiMarkdownChunk";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const F = "`".repeat(3);
const SECRET = "The Soul Master teleports.";

/** The one-line shapes: as the model writes them, and as the back end's safety net leaves them. */
const SHAPES: Record<string, string> = {
  "glued to a bullet, raw": `- tip: ${F}bonsai-spoiler ${SECRET} ${F}\nGood luck.`,
  "own line, raw": `Intro.\n${F}bonsai-spoiler ${SECRET}${F}\nGood luck.`,
  "glued to a bullet, after the safety net": `- tip: \n${F}bonsai-spoiler ${SECRET} \n${F}\nGood luck.`,
  "own line, after the safety net": `Intro.\n${F}bonsai-spoiler ${SECRET}\n${F}\nGood luck.`,
};

function renderAnswer(body: string, streaming = false) {
  const el = buildAnswerBubbleElement({
    body,
    streaming,
    spoilerMaskingEnabled: true,
    maxWidthCss: "100%",
    answerKey: "one-line",
  });
  expect(el).not.toBeNull();
  return render(el!);
}

describe("a hidden block written on one line", () => {
  afterEach(() => {
    cleanup();
    resetAnswerStopRegistry();
    resetSpoilerFenceOpenCountForTests();
  });

  for (const [name, body] of Object.entries(SHAPES)) {
    it(`is covered, and opens onto its text (${name})`, () => {
      const { container } = renderAnswer(body);
      expect(container.textContent).not.toContain("Soul Master");
      expect(container.textContent).not.toContain("bonsai-spoiler");
      const reveal = container.querySelector(".bonsai-spoiler-reveal-target button") as HTMLElement | null;
      expect(reveal).not.toBeNull();
      fireEvent.click(reveal!);
      expect(container.textContent).toContain(SECRET);
      expect(container.textContent).not.toContain("undefined");
      expect(container.textContent).toContain("Good luck.");
    });
  }

  it("leaves a block written the usual way, and every other fence, exactly as it was", () => {
    const usual = `Intro.\n\n${F}bonsai-spoiler\n${SECRET}\n${F}\n\n${F}json\n{"a": 1}\n${F}\nEnd.`;
    expect(expandOneLineSpoilerFences(usual)).toBe(usual);
  });

  it("never shows the text while it streams in", () => {
    for (const body of [SHAPES["glued to a bullet, raw"]!, SHAPES["own line, raw"]!]) {
      for (let i = 1; i <= body.length; i++) {
        const { container, unmount } = renderAnswer(body.slice(0, i), true);
        expect(container.textContent, `after ${i} letters of ${body}`).not.toContain("Soul Master");
        unmount();
        resetAnswerStopRegistry();
      }
    }
  });
});
