/**
 * Title: Up reaches a spoiler cover the way Down does
 *
 * Purpose: Pin plan 74 lane 3, bug 6 (roadmap, ★★: "Reaching a spoiler cover by Up lands the ring
 * beside it, and A does nothing"; docs/test-evidence/plan70-SPOILER-CREDITS-01.json). Down already
 * parks on a still-hidden cover before walking on; Up had no such step, so it landed on the section
 * around the cover, where A does nothing. Now Up into a section that holds a hidden cover -- from the
 * section below, or into the answer from the row under it -- lands on the cover, and Up from a
 * cover steps to the section above its own, the same as from any section.
 *
 * Does not: prove the ring moves on the device; a plain focus inside the answer is the move Down's
 * own cover step already makes there (spoilerFenceRegistry.ts, measured 2026-08-04).
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  focusLastAnswerChunk,
  handleAnswerBubbleMoveDown,
  handleAnswerBubbleMoveUp,
  handleUpFromSpoilerCover,
} from "./answerBubbleNavigation";
import { registerAnswerStop, resetAnswerStopRegistry } from "./answerStopRegistry";
import { registerAnswerBubbleEl } from "./answerBubbleElRegistry";
import { registerSpoilerFence, resetSpoilerFenceRegistry } from "./spoilerFenceRegistry";
import { resetUiDocument } from "./uiDocument";

const KEY = "turn-1";
const ref = { current: 0 };

function stubRect(el: HTMLElement, top: number, bottom: number): void {
  el.getBoundingClientRect = () =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
}

/** Three sections all on screen (the panel shows 0-250), each 80 tall. */
function answer(): { bubble: HTMLElement; stops: HTMLElement[] } {
  const scroll = document.createElement("div");
  scroll.className = "TabContentsScroll";
  stubRect(scroll, 0, 250);
  document.body.appendChild(scroll);
  const bubble = document.createElement("div");
  bubble.className = "bonsai-chat-ai-bubble Panel Focusable";
  bubble.setAttribute("tabindex", "0");
  stubRect(bubble, 0, 240);
  bubble.scrollIntoView = () => {};
  scroll.appendChild(bubble);
  registerAnswerBubbleEl(KEY, bubble);
  const stops = [0, 1, 2].map((i) => {
    const stop = document.createElement("div");
    stop.className = "bonsai-answer-stop Panel Focusable";
    stop.setAttribute("tabindex", "0"); // Decky stamps this on the nodes Steam navigates
    stubRect(stop, i * 80, i * 80 + 80);
    bubble.appendChild(stop);
    registerAnswerStop(KEY, i, stop);
    return stop;
  });
  return { bubble, stops };
}

/** A still-hidden cover inside `section`, the shape MainTabBonsaiAiMarkdownChunk.tsx draws. */
function coverIn(section: HTMLElement, id: string): HTMLElement {
  const cover = document.createElement("div");
  cover.className = "bonsai-spoiler-reveal-target Panel Focusable";
  cover.setAttribute("tabindex", "0");
  const box = section.getBoundingClientRect();
  stubRect(cover, box.top + 10, box.top + 40);
  section.appendChild(cover);
  registerSpoilerFence(id, cover);
  return cover;
}

beforeEach(() => {
  resetAnswerStopRegistry();
  resetSpoilerFenceRegistry();
  resetUiDocument();
  registerAnswerBubbleEl(KEY, null);
  document.body.innerHTML = "";
});

describe("Up onto a spoiler cover", () => {
  it("Up into a section holding a hidden cover lands on the cover, not the section around it", () => {
    const { bubble, stops } = answer();
    const cover = coverIn(stops[0]!, "c0");
    stops[1]!.focus();

    expect(handleAnswerBubbleMoveUp(bubble, ref, 3, KEY)).toBe(true);
    expect(document.activeElement).toBe(cover);
  });

  it("Up into the answer from the row below lands on a hidden cover in the last section", () => {
    const { stops } = answer();
    const cover = coverIn(stops[2]!, "c2");

    expect(focusLastAnswerChunk(KEY)).toBe(true);
    expect(document.activeElement).toBe(cover);
  });

  it("a section with no cover is still an ordinary stop going Up", () => {
    const { bubble, stops } = answer();
    coverIn(stops[0]!, "c0");
    stops[2]!.focus();

    expect(handleAnswerBubbleMoveUp(bubble, ref, 3, KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[1]);
  });

  it("Up from a cover steps to the section above its own, not back to the top", () => {
    const { bubble, stops } = answer();
    const cover = coverIn(stops[2]!, "c2");
    cover.focus();

    expect(handleUpFromSpoilerCover(bubble, 3, KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[1]);
  });

  it("Up from a cover in the first section leaves the answer, the way the first section does", () => {
    const { bubble, stops } = answer();
    const cover = coverIn(stops[0]!, "c0");
    cover.focus();

    expect(handleUpFromSpoilerCover(bubble, 3, KEY)).toBe(false);
    expect(document.activeElement).toBe(cover);
  });

  it("Down from a cover reached by Up carries on to the next section, not back onto the cover", () => {
    const { bubble, stops } = answer();
    const cover = coverIn(stops[1]!, "c1");
    stops[2]!.focus();
    handleAnswerBubbleMoveUp(bubble, ref, 3, KEY);
    expect(document.activeElement).toBe(cover);

    expect(handleAnswerBubbleMoveDown(bubble, ref, 3, KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[2]);
  });
});
