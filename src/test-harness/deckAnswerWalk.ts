/**
 * Title: An answer inside a scrolling pane, in the Steam Deck's numbers
 * Purpose: Test helper for the answer-walk tests (plan 76 lane 3). Builds an answer bubble with its
 *          sections, hidden covers, underlined game words and a revealed cover's hide line inside a
 *          pane shaped like the Deck's own screen: the pane runs from y 88 to y 366, the dock starts
 *          at y 290 (so the readable band is 202 px), and every box follows the pane's scrollTop.
 * Used for: answerBubbleNavigation.ringFollowsScroll.test.ts and answerBubbleNavigation.coverMirror.test.ts.
 * Does not: know Steam's real scroll rule. On the device Steam glides the panel a moment AFTER a stop
 *           takes focus, and the Deck showed several landings (a cover moved 69 px down, then 37 px
 *           back up; a section's box pulled to the top of the pane). `steamScroll` models that
 *           glide, applied after the press returns, in three deliberately different rules, so a walk
 *           that only works under one of them is caught: "top" aligns a stop that is not wholly on
 *           screen to the top of the pane, "padded" puts a small stop 116 px below it (Steam's
 *           scroll padding), "center" also re-centres a small stop that was already on screen.
 */
import { handleAnswerBubbleMoveDown, handleAnswerBubbleMoveUp, handleUpFromSpoilerCover } from "../utils/answerBubbleNavigation";
import { registerAnswerStop, resetAnswerStopRegistry } from "../utils/answerStopRegistry";
import { registerAnswerBubbleEl } from "../utils/answerBubbleElRegistry";
import { registerSpoilerFence, resetSpoilerFenceRegistry } from "../utils/spoilerFenceRegistry";
import { registerDrgGlossaryTermChip, resetDrgGlossaryTermRegistry } from "../utils/drgGlossaryTermRegistry";
import { resetUiDocument } from "../utils/uiDocument";

const KEY = "turn-1";
const ref = { current: 0 };
export const PANE_TOP = 88;
const DOCK_TOP = 290;
const PANE_BOTTOM = 366;

export type Box = [top: number, bottom: number];

/**
 * An answer inside a scroll pane, in the Deck's numbers. A box is given as [top, bottom] in the
 * answer's own coordinates (its screen y when the panel is scrolled to 0), and follows the scroll.
 */
export type SteamScrollRule = "top" | "padded" | "center";

export function deckAnswer(sections: Box[], scrollTop = 0, steamScroll?: SteamScrollRule) {
  const pane = document.createElement("div");
  pane.className = "TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 2000, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: PANE_BOTTOM - PANE_TOP, configurable: true });
  const rect = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  pane.getBoundingClientRect = () => rect(PANE_TOP, PANE_BOTTOM);
  document.body.appendChild(pane);
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => rect(DOCK_TOP, PANE_BOTTOM);
  pane.appendChild(dock);
  pane.scrollTop = scrollTop;

  const place = (el: HTMLElement, [top, bottom]: Box) => {
    el.getBoundingClientRect = () => rect(top - pane.scrollTop, bottom - pane.scrollTop);
  };
  const bubble = document.createElement("div");
  bubble.className = "bonsai-chat-ai-bubble Panel Focusable";
  bubble.setAttribute("tabindex", "0");
  place(bubble, [sections[0]![0], sections[sections.length - 1]![1]]);
  pane.appendChild(bubble);
  registerAnswerBubbleEl(KEY, bubble);

  const stops = sections.map((box, i) => {
    const stop = document.createElement("div");
    stop.className = "bonsai-answer-stop Panel Focusable";
    stop.setAttribute("tabindex", "0"); // Decky stamps this on the nodes Steam navigates
    place(stop, box);
    bubble.appendChild(stop);
    registerAnswerStop(KEY, i, stop);
    return stop;
  });

  let fenceSeq = 0;
  /** A still-hidden cover, the shape MainTabBonsaiAiMarkdownChunk.tsx draws; `reveal` is what A calls. */
  const cover = (section: HTMLElement, box: Box, reveal?: () => void): HTMLElement => {
    const el = document.createElement("div");
    el.className = "bonsai-spoiler-reveal-target Panel Focusable";
    el.setAttribute("tabindex", "0");
    place(el, box);
    section.appendChild(el);
    fenceSeq += 1;
    registerSpoilerFence(`cover-${fenceSeq}`, el, reveal);
    return el;
  };
  /** An underlined game word (a glossary chip), a Focusable inside the section's text. */
  const word = (section: HTMLElement, box: Box): HTMLElement => {
    const el = document.createElement("div");
    el.className = "bonsai-drg-glossary-term Panel Focusable";
    el.setAttribute("tabindex", "0");
    place(el, box);
    section.appendChild(el);
    registerDrgGlossaryTermChip(`word-${fenceSeq++}`, el);
    return el;
  };
  /** A revealed cover's "tap to hide" line: a Focusable that is not a stop and not registered. */
  const hideLine = (section: HTMLElement, box: Box): HTMLElement => {
    const el = document.createElement("div");
    el.className = "bonsai-spoiler-collapse-target Panel Focusable";
    el.setAttribute("tabindex", "0");
    place(el, box);
    section.appendChild(el);
    return el;
  };

  /* Steam's glide to a stop that just took focus, applied once the press that moved the ring is over. */
  let landed: HTMLElement | null = null;
  pane.addEventListener("focusin", (event) => {
    landed = event.target as HTMLElement;
  });
  const settle = () => {
    const el = landed;
    landed = null;
    if (!steamScroll || !el || el === bubble || !bubble.contains(el)) return;
    const r = el.getBoundingClientRect();
    const height = r.bottom - r.top;
    const small = height < 100;
    const inside = r.top >= PANE_TOP && r.bottom <= DOCK_TOP;
    let target: number | null = null;
    if (steamScroll === "center" && small) target = PANE_TOP + (DOCK_TOP - PANE_TOP - height) / 2;
    else if (!inside) target = steamScroll === "padded" && small ? PANE_TOP + 116 : PANE_TOP;
    if (target !== null) pane.scrollTop = Math.max(0, pane.scrollTop + r.top - target);
  };

  const top = (el: HTMLElement) => el.getBoundingClientRect().top;
  const bottom = (el: HTMLElement) => el.getBoundingClientRect().bottom;
  /** The press Steam routes to the answer, the way buildAnswerBubbleElement's moveDown/moveUp do. */
  const down = () => {
    const handled = handleAnswerBubbleMoveDown(bubble, ref, sections.length, KEY);
    settle();
    return handled;
  };
  const up = () => {
    const ring = document.activeElement as HTMLElement | null;
    const handled = ring?.closest(".bonsai-spoiler-reveal-target, .bonsai-spoiler-collapse-target")
      ? handleUpFromSpoilerCover(bubble, sections.length, KEY)
      : handleAnswerBubbleMoveUp(bubble, ref, sections.length, KEY);
    settle();
    return handled;
  };
  /** Put the ring on `el` the way Steam does when a press lands there (the glide follows). */
  const land = (el: HTMLElement) => {
    el.focus();
    settle();
  };
  return { pane, bubble, stops, cover, word, hideLine, top, bottom, down, up, land };
}

/** Clear every registry and the page, for a test's beforeEach. */
export function resetDeckAnswerWalk(): void {
  resetAnswerStopRegistry();
  resetSpoilerFenceRegistry();
  resetDrgGlossaryTermRegistry();
  resetUiDocument();
  document.body.innerHTML = "";
}
