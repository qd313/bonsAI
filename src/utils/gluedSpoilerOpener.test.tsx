/**
 * A hidden block whose opening mark is glued onto the end of a sentence ("The```bonsai-spoiler",
 * the words of the block on the lines below) must never show its words -- plan 77 helper A.
 *
 * Measured on the real renderer before the fix: the markdown reader takes an opening mark that
 * is not at the start of a line for the start of an inline code span, so once the closing mark
 * arrived the whole block was drawn as visible inline code, and while it streamed in its words
 * showed as plain text. Copy and Read aloud already hid it (the older backtick pairing); the
 * screen did not.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { buildAnswerBubbleElement } from "./buildAnswerBubbleElement";
import { expandOneLineSpoilerFences } from "./expandOneLineSpoilerFences";
import { resetAnswerStopRegistry } from "./answerStopRegistry";
import { buildAnswerCopyText } from "./answerCopyText";
import { buildAnswerReadableText } from "./answerReadableText";
import { resetSpoilerFenceOpenCountForTests } from "../components/MainTabBonsaiAiMarkdownChunk";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const F = "`".repeat(3);
const SECRET = "Soul Master teleports.";

/** Shapes with the opening mark glued onto a sentence. All of them hide the secret. */
const SHAPES: Record<string, string> = {
  "glued, body on the next line": `The${F}bonsai-spoiler\n${SECRET}\n${F}\nGood luck.`,
  "glued after a space": `The boss is tough. ${F}bonsai-spoiler\n${SECRET}\n${F}\nGood luck.`,
  "glued, blank line inside": `The${F}bonsai-spoiler\n${SECRET}\n\nMore words.\n${F}\nGood luck.`,
  "glued to a bullet's text": `- tip:${F}bonsai-spoiler\n${SECRET}\n${F}\nGood luck.`,
  "glued, closing mark glued too": `The${F}bonsai-spoiler\n${SECRET}${F}\nGood luck.`,
};

function renderAnswer(body: string, streaming = false) {
  const el = buildAnswerBubbleElement({
    body,
    streaming,
    spoilerMaskingEnabled: true,
    maxWidthCss: "100%",
    answerKey: "glued-opener",
  });
  expect(el).not.toBeNull();
  return render(el!);
}

describe("a hidden block whose opening mark is glued onto a sentence", () => {
  afterEach(() => {
    cleanup();
    resetAnswerStopRegistry();
    resetSpoilerFenceOpenCountForTests();
  });

  for (const [name, body] of Object.entries(SHAPES)) {
    it(`is covered on screen, never drawn as inline code (${name})`, () => {
      const { container } = renderAnswer(body);
      expect(container.textContent).not.toContain("Soul Master");
      expect(container.textContent).not.toContain("bonsai-spoiler");
      expect(container.querySelector(".bonsai-spoiler-reveal-target")).not.toBeNull();
      expect(container.querySelector(".bonsai-md-inline-code")).toBeNull();
    });

    it(`never shows its words while it streams in (${name})`, () => {
      const opened = body.indexOf("bonsai-spoiler\n") + "bonsai-spoiler\n".length;
      for (let i = 1; i <= body.length; i++) {
        const { container, unmount } = renderAnswer(body.slice(0, i), true);
        if (i >= opened) {
          expect(container.textContent, `after ${i} letters of ${name}`).not.toContain("Soul");
        }
        unmount();
        resetAnswerStopRegistry();
      }
    });

    it(`is still hidden in Copy and Read aloud (${name})`, () => {
      for (const out of [buildAnswerCopyText({ body }), buildAnswerReadableText({ body })]) {
        expect(out).not.toContain("Soul Master");
        expect(out).not.toContain("bonsai-spoiler");
      }
    });
  }

  it("opens onto its words when tapped, keeping the sentence it was glued to", () => {
    const { container } = renderAnswer(SHAPES["glued, body on the next line"]!);
    expect(container.textContent).toContain("The");
    fireEvent.click(container.querySelector(".bonsai-spoiler-reveal-target button") as HTMLElement);
    expect(container.textContent).toContain(SECRET);
    expect(container.textContent).toContain("Good luck.");
  });

  it("puts the opening mark on its own line, and touches nothing else", () => {
    expect(expandOneLineSpoilerFences(`The${F}bonsai-spoiler\nx\n${F}`)).toBe(
      `The\n${F}bonsai-spoiler\nx\n${F}`
    );
    // Marks already at the start of a line, in a bullet, in a quote or indented, stay as written.
    for (const ok of [
      `${F}bonsai-spoiler\nx\n${F}`,
      `- ${F}bonsai-spoiler\n  x\n  ${F}`,
      `> ${F}bonsai-spoiler\n> x\n> ${F}`,
      `  ${F}bonsai-spoiler\n  x\n  ${F}`,
      `1. ${F}bonsai-spoiler\n   x\n   ${F}`,
      // A longer fence mark holds the three backticks too: it is not a glued marker.
      `${F}\`bonsai-spoiler\nx\n${F}\``,
    ]) {
      expect(expandOneLineSpoilerFences(ok)).toBe(ok);
    }
  });
});
