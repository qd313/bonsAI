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

/**
 * A still-hidden cover inside `section`, the shape MainTabBonsaiAiMarkdownChunk.tsx draws. By default
 * it fills the section (a section that is only its cover, which has no box stop of its own); with
 * `textAfter` a paragraph runs on below it, and the section's box is a stop of its own (plan 77).
 */
function coverIn(section: HTMLElement, id: string, textAfter = false): HTMLElement {
  const cover = document.createElement("div");
  cover.className = "bonsai-spoiler-reveal-target Panel Focusable";
  cover.setAttribute("tabindex", "0");
  const box = section.getBoundingClientRect();
  stubRect(cover, box.top + 10, box.top + (textAfter ? 40 : 70));
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

  it("Up into a section with text after its cover lands on the section's box first, then the cover", () => {
    const { bubble, stops } = answer();
    const cover = coverIn(stops[0]!, "c0", true);
    stops[1]!.focus();

    expect(handleAnswerBubbleMoveUp(bubble, ref, 3, KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
    expect(handleAnswerBubbleMoveUp(bubble, ref, 3, KEY)).toBe(true);
    expect(document.activeElement).toBe(cover);
  });

  it("Up from the second of two covers in one section lands on the first before leaving", () => {
    const { bubble, stops } = answer();
    const first = coverIn(stops[1]!, "c1a", true);
    const second = document.createElement("div");
    second.className = "bonsai-spoiler-reveal-target Panel Focusable";
    second.setAttribute("tabindex", "0");
    stubRect(second, 140, 155);
    stops[1]!.appendChild(second);
    registerSpoilerFence("c1b", second);
    second.focus();

    expect(handleUpFromSpoilerCover(bubble, 3, KEY)).toBe(true);
    expect(document.activeElement).toBe(first);
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

/*
 * The Deck's shape (docs/test-evidence/plan74-P74-COVER-UP.json): the first section is a hidden cover
 * at its top plus one paragraph (131 tall, cover 55 tall 8 below its top), the second is four
 * paragraphs in one tall section (327) that Up scrolls inside, 80 px a press, before leaving. Going
 * Up, a section comes into view from its bottom, so its cover is the last part of it to appear:
 * round one's step took the cover only when the cover itself was already on screen, and landed on
 * the section around it instead. The boxes here move with the panel's scroll, as they do on screen.
 */
describe("Up onto a cover that is still above the screen", () => {
  const PANE = 300;

  function scrollingAnswer(sections: Array<[number, number]>, coverAt = 8) {
    const pane = document.createElement("div");
    pane.className = "TabContentsScroll";
    Object.defineProperty(pane, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(pane, "clientHeight", { value: PANE, configurable: true });
    stubRect(pane, 0, PANE);
    document.body.appendChild(pane);
    /** Place `el` at `top`..`bottom` in the answer's own coordinates; its box follows the scroll. */
    const place = (el: HTMLElement, top: number, bottom: number) => {
      el.getBoundingClientRect = () => {
        const y = top - pane.scrollTop;
        return { top: y, bottom: y + bottom - top, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y, toJSON: () => ({}) } as DOMRect;
      };
    };
    const bubble = document.createElement("div");
    bubble.className = "bonsai-chat-ai-bubble Panel Focusable";
    bubble.setAttribute("tabindex", "0");
    place(bubble, 0, sections[sections.length - 1]![1]);
    pane.appendChild(bubble);
    registerAnswerBubbleEl(KEY, bubble);
    const stops = sections.map(([top, bottom], i) => {
      const stop = document.createElement("div");
      stop.className = "bonsai-answer-stop Panel Focusable";
      stop.setAttribute("tabindex", "0");
      place(stop, top, bottom);
      bubble.appendChild(stop);
      registerAnswerStop(KEY, i, stop);
      return stop;
    });
    const cover = document.createElement("div");
    cover.className = "bonsai-spoiler-reveal-target Panel Focusable";
    cover.setAttribute("tabindex", "0");
    place(cover, sections[0]![0] + coverAt, sections[0]![0] + coverAt + 55);
    stops[0]!.appendChild(cover);
    registerSpoilerFence("first", cover);
    const onScreen = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= PANE;
    };
    return { pane, bubble, stops, cover, onScreen };
  }

  it("Up out of a tall section that scrolls inside first lands on the first section's cover", () => {
    const { pane, bubble, stops, cover, onScreen } = scrollingAnswer([[0, 131], [131, 458]]);
    pane.scrollTop = 360; // the ring came up into the tall section; its top is above the screen
    stops[1]!.focus();

    let presses = 0;
    while (document.activeElement === stops[1] && presses < 10) {
      expect(handleAnswerBubbleMoveUp(bubble, ref, 2, KEY)).toBe(true);
      presses += 1;
    }

    expect(presses).toBe(4); // three scroll presses inside it, then the hand-over, as on the Deck
    // The hand-over lands on the first section's box (plan 77: Down stops there, so Up does), and the
    // next Up on the cover, both wholly on screen.
    expect(document.activeElement).toBe(stops[0]);
    expect(onScreen(stops[0]!)).toBe(true);
    expect(handleAnswerBubbleMoveUp(bubble, ref, 2, KEY)).toBe(true);
    expect(document.activeElement).toBe(cover);
    expect(onScreen(cover)).toBe(true);
  });

  it("one Up with only the bottom of the first section showing lands on its box and shows it, the next on its cover", () => {
    const { pane, bubble, stops, cover, onScreen } = scrollingAnswer([[0, 131], [131, 458]]);
    pane.scrollTop = 120; // 11 px of the first section showing; its cover is above the screen
    stops[1]!.focus();

    expect(handleAnswerBubbleMoveUp(bubble, ref, 2, KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
    expect(onScreen(stops[0]!)).toBe(true); // the whole short section, cover and text under it too
    expect(onScreen(cover)).toBe(true);
    expect(handleAnswerBubbleMoveUp(bubble, ref, 2, KEY)).toBe(true);
    expect(document.activeElement).toBe(cover);
  });

  it("Up from that cover then leaves the answer, as Up from the first section always did", () => {
    const { pane, bubble, stops, cover } = scrollingAnswer([[0, 131], [131, 458]]);
    pane.scrollTop = 120;
    stops[1]!.focus();
    handleAnswerBubbleMoveUp(bubble, ref, 2, KEY);
    handleAnswerBubbleMoveUp(bubble, ref, 2, KEY);
    expect(document.activeElement).toBe(cover);

    expect(handleUpFromSpoilerCover(bubble, 2, KEY)).toBe(false);
  });

  it("a cover lower in its section brings the section's text above it onto the screen too", () => {
    const { pane, bubble, stops, cover, onScreen } = scrollingAnswer([[60, 231], [231, 558]], 40);
    pane.scrollTop = 220; // 11 px of the first section showing; its cover and the line above it are not
    stops[1]!.focus();

    expect(handleAnswerBubbleMoveUp(bubble, ref, 2, KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
    expect(onScreen(stops[0]!)).toBe(true);
    expect(handleAnswerBubbleMoveUp(bubble, ref, 2, KEY)).toBe(true);
    expect(document.activeElement).toBe(cover);
  });

  it("a cover more than a screen above stays for later presses, so no text is scrolled past unread", () => {
    const { pane, bubble, stops } = scrollingAnswer([[0, 700], [700, 900]]);
    pane.scrollTop = 650; // the first section's last 50 px showing; its cover is 580 px above
    stops[1]!.focus();

    expect(handleAnswerBubbleMoveUp(bubble, ref, 2, KEY)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
    expect(pane.scrollTop).toBe(650);
  });
});
