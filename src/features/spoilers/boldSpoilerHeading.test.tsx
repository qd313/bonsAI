/**
 * A hidden block on one line inside a bold heading must not leave two raw stars on screen
 * (plan 97 lane 3). Seen on the Deck 2026-10-14: an answer's "**7. <hidden boss name>" line drew
 * the two asterisks as plain text, because the one-line block was split onto its own lines and the
 * bold pair no longer sat in one paragraph.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { buildAnswerBubbleElement } from "../answer/bubble/buildAnswerBubbleElement";
import { expandOneLineSpoilerFences } from "./expandOneLineSpoilerFences";
import { resetAnswerStopRegistry } from "../../shared/dpad/answerStopRegistry";
import { resetSpoilerFenceOpenCountForTests } from "../answer/markdown/MainTabBonsaiAiMarkdownChunk";

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

const F = "`".repeat(3);
const SECRET = "Hornet";
const TAIL = "What to Find: This is a major landmark and a significant challenge.";

/** The shapes the model writes: bold around the block, bold opened but not closed, bold closed after. */
const SHAPES: Record<string, string> = {
  "bold closed after the block": `Swim in acid.\n\n**7. ${F}bonsai-spoiler ${SECRET}${F}**\n${TAIL}`,
  "bold closed after a space": `Swim in acid.\n\n**7. ${F}bonsai-spoiler ${SECRET} ${F} **\n${TAIL}`,
  "bold never closed": `Swim in acid.\n\n**7. ${F}bonsai-spoiler ${SECRET}${F}\n${TAIL}`,
  "bold closes later on the line": `Swim in acid.\n\n**7. ${F}bonsai-spoiler ${SECRET}${F} Boss**\n${TAIL}`,
  "bold inside a bullet": `- **7. ${F}bonsai-spoiler ${SECRET}${F}**\n${TAIL}`,
  "bold inside a heading": `## **7. ${F}bonsai-spoiler ${SECRET}${F}**\n${TAIL}`,
};

function renderAnswer(body: string, streaming = false) {
  const el = buildAnswerBubbleElement({
    body,
    streaming,
    spoilerMaskingEnabled: true,
    maxWidthCss: "100%",
    answerKey: "bold-heading",
  });
  expect(el).not.toBeNull();
  return render(el!);
}

describe("a hidden block on one line inside bold marks", () => {
  afterEach(() => {
    cleanup();
    resetAnswerStopRegistry();
    resetSpoilerFenceOpenCountForTests();
  });

  for (const [name, body] of Object.entries(SHAPES)) {
    it(`draws no stray stars, keeps the cover and the bold number (${name})`, () => {
      const { container } = renderAnswer(body);
      expect(container.textContent).not.toContain("**");
      expect(container.textContent).not.toContain(SECRET);
      expect(container.querySelector(".bonsai-spoiler-reveal-target button")).not.toBeNull();
      const bold = Array.from(container.querySelectorAll("strong")).map((s) => s.textContent ?? "");
      expect(bold.some((t) => t.includes("7."))).toBe(true);
      expect(container.textContent).toContain(TAIL);
    });
  }

  it("draws no stray stars while the answer is still streaming in", () => {
    const body = SHAPES["bold never closed"]!;
    const open = body.indexOf(`${F}bonsai-spoiler`);
    for (let i = open + 4; i <= body.length; i++) {
      const { container, unmount } = renderAnswer(body.slice(0, i), true);
      expect(container.textContent, `after ${i} letters`).not.toContain("**");
      expect(container.textContent, `after ${i} letters`).not.toContain(SECRET);
      unmount();
      resetAnswerStopRegistry();
    }
  });


  it("leaves bold that is already balanced before the block exactly as the usual rules left it", () => {
    const text = `**Name:** ${F}bonsai-spoiler ${SECRET}${F} then more.`;
    const expected = ["**Name:** ", `${F}bonsai-spoiler`, SECRET, F, " then more."].join("\n");
    expect(expandOneLineSpoilerFences(text)).toBe(expected);
  });

  it("closes the bold before the block and drops the lone closing pair after it", () => {
    const out = expandOneLineSpoilerFences(`**7. ${F}bonsai-spoiler ${SECRET}${F}**\nTail`);
    expect(out.split("\n")).toEqual(["**7.**", "", `${F}bonsai-spoiler`, SECRET, F, "", "Tail"]);
  });
});
