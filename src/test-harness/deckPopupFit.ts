/**
 * Title: A Steam popup on the Deck's own screen, in the Deck's measured numbers
 *
 * Purpose: jsdom lays nothing out, so a test cannot ask it whether a box fits the screen. This works out where a
 *          drawn two-button box sits the way the Deck draws it, from two sets of numbers:
 *          - Steam's own popup frame, measured on the Deck's own screen (800 pixels tall at 1.5 pixels per point:
 *            854 x 534 points; workshop:test-evidence/plan64-MODELS-LIST-CAP-01-try2.json): Steam's top bar ends
 *            at y 40 and its bottom bar starts at y 492, so 452 points show; the popup's scrolling layer keeps 24
 *            points above the box and 24.5 below it; the box's own frame is 26 above and 26 below what it draws.
 *          - The box's own sizes, read back off the drawn box's styles: the title's font size and line height,
 *            the gap under it, the words' height limit and whether they scroll, the "More below" row, the gap
 *            above the buttons (with the last block's own margin, which a scrolling box keeps inside), and the
 *            buttons' height.
 *          Steam's glide onto the button holding the ring is deckAnswerWalk's `steamGlide`, run on the popup's
 *          scrolling layer, so a box taller than the room is slid up until its buttons show and its title goes
 *          under Steam's top bar: what the Deck showed on 2026-10-25
 *          (workshop:test-evidence/readme-STARTER-BOX-TOO-TALL.md). These numbers put the starter box's first
 *          model line exactly where that picture has it, cut in half by the top bar.
 * Used for: TwoButtonConfirmModal.fit.test.tsx and localOllamaStarterSet.boxFit.test.tsx (does the box fit, what
 *           shows, and what Up and Down do from its buttons), and TwoButtonConfirmModal.test.tsx (a press on the ring).
 * Does not: wrap lines. The words' own height (what they take with no limit) is handed in, in points or as lines
 *           and gaps (a line is read off the words' own font size and line height, so it grows with Text size);
 *           for the starter box it is read off the Deck's picture. Does not centre a short box: it sits 24 under
 *           Steam's bar, where the AI models box measured; a box that fits shows whole either way.
 */
import { act } from "@testing-library/react";

import { steamGlide, type SteamScrollRule } from "./deckAnswerWalk";
import { makeFontSizeReader } from "./settledFontSize";
import { steamRingHolder, type SteamEl } from "./steamRing";

/** Steam's popup on the Deck's own screen, in points (plan64-MODELS-LIST-CAP-01-try2.json). */
const DECK_POPUP = {
  /** Steam's top bar ends here (60 screen pixels). */
  visibleTop: 40,
  /** Steam's bottom bar, the button hints, starts here. */
  visibleBottom: 492,
  /** The popup's scrolling layer keeps this much clear above the box (the box's top edge at 64)... */
  layerPadTop: 24,
  /** ...and this much below it (the layer's 589 of scroll height, less 24 and the box's 540.5). */
  layerPadBottom: 24.5,
  /** The box's own frame above and below what is drawn in it (its title started 26 below its top edge). */
  framePad: 26,
} as const;

/** What the two bars leave for the box, less the layer's own room above and below it: 403.5 points. */
export const DECK_POPUP_ROOM =
  DECK_POPUP.visibleBottom - DECK_POPUP.visibleTop - DECK_POPUP.layerPadTop - DECK_POPUP.layerPadBottom;

/** A span on the screen, top and bottom, in points. */
export type Span = [top: number, bottom: number];

/** A height in points, or as lines of the element's own text plus the gaps between them. */
export type Height = number | { lines: number; gapsPx: number };

/** Every height in the box, top to bottom, read off its styles. */
export type PopupParts = { title: number; titleGap: number; words: number; more: number; wordsGap: number; buttons: number };

type Move = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";

/** A D-pad press on the stop that has the ring, the way Steam calls it: the nearest Focusable's handler. */
export function pressOnRing(key: Move): boolean | undefined {
  let el = steamRingHolder() as SteamEl | null;
  while (el && !el.__nav?.[key]) el = el.parentElement as SteamEl | null;
  const handler = el?.__nav?.[key];
  if (!handler) return undefined;
  let taken: unknown;
  act(() => void (taken = handler()));
  return taken as boolean | undefined;
}

/** A size written in points, or 0 when none is written. Anything else (a share of the screen) is refused. */
function points(value: string, what: string): number {
  if (value === "") return 0;
  const m = /^(-?[\d.]+)px$/.exec(value);
  if (!m) throw new Error(`${what} is written as "${value}": only fixed points fit both the Deck's screen and a monitor`);
  return Number(m[1]);
}

/** One line's height for `el`'s text: its font size times the nearest line height written on it or above it. */
function lineOf(el: HTMLElement, fontSize: (el: Element) => number): number {
  for (let at: HTMLElement | null = el; at; at = at.parentElement) {
    const lh = at.style.lineHeight;
    if (lh.endsWith("px")) return points(lh, "a line height");
    if (lh) return fontSize(el) * Number(lh);
  }
  throw new Error("no line height is written above the text");
}

/** The bottom margin the last block inside `el` carries down to `el`'s own bottom edge (text after it carries none). */
function trailingMargin(el: Element): number {
  let most = 0;
  let node: ChildNode | null = el.lastChild;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? "").trim()) {
      node = node.previousSibling;
      continue;
    }
    if (!(node instanceof HTMLElement)) return most;
    most = Math.max(most, points(node.style.marginBottom, "a margin"));
    node = node.lastChild;
  }
  return most;
}

/** scrollTop as the browser keeps it, between 0 and `max`. */
function clampedScroll(el: HTMLElement, max: () => number): void {
  let at = 0;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => at,
    set: (v: number) => void (at = Math.max(0, Math.min(max(), v))),
  });
}

/**
 * In: the drawn box's page, its title's words, the words' own height with no limit, and (`pinned`) the height of
 * the lines a caller keeps on screen at the top of the words. Out: the box's parts and height, and where its title,
 * words, pinned lines and buttons sit on the Deck's screen as the popup's layer and the words scroll; `glide` runs
 * Steam's glide onto the ring's button under `rule`.
 */
export function layOutDeckPopup(
  page: HTMLElement,
  titleText: string,
  opts: { words: Height; pinned?: Height; titleLines?: number; rule?: SteamScrollRule },
) {
  const fontSize = makeFontSizeReader("");
  const title = Array.from(page.querySelectorAll<HTMLElement>("div")).find((d) => d.textContent === titleText);
  if (!title) throw new Error(`no title "${titleText}" in the box`);
  const words = title.nextElementSibling as HTMLElement;
  const textEl = words.querySelector<HTMLElement>("div") ?? words;
  const height = (h: Height, el: HTMLElement) => (typeof h === "number" ? h : h.lines * lineOf(el, fontSize) + h.gapsPx);
  const natural = height(opts.words, textEl);
  const limit = () => (words.style.maxHeight ? points(words.style.maxHeight, "the words' height limit") : Infinity);
  const shown = () => Math.min(natural, limit());

  // Lay the words out first: the box reads its own height, picks its view and redraws.
  clampedScroll(words, () => Math.max(0, natural - shown()));
  Object.defineProperty(words, "scrollHeight", { configurable: true, value: natural });
  Object.defineProperty(words, "clientHeight", { configurable: true, get: () => shown() });
  act(() => void words.dispatchEvent(new Event("scroll")));
  if (natural > limit() && !/^(auto|scroll)$/.test(words.style.overflowY)) throw new Error("the words are cut off but do not scroll");

  const after = words.nextElementSibling as HTMLElement;
  const more = after.hasAttribute("flow-children") ? null : after;
  const row = (more ? more.nextElementSibling : after) as HTMLElement;
  const buttons = Array.from(row.querySelectorAll<HTMLElement>("button"));
  // Lines pinned to the top of the words (a sticky block); none pinned reads as 0 high, so they scroll with the rest.
  const pinnedEl = Array.from(words.querySelectorAll<HTMLElement>("div")).find((d) => d.style.position === "sticky");
  const pinnedPx = opts.pinned !== undefined && pinnedEl ? height(opts.pinned, pinnedEl) : 0;

  // A scrolling box keeps its last block's margin inside; a plain one lets it merge with its own gap.
  const ownGap = points(words.style.marginBottom, "the gap under the words");
  const lastGap = trailingMargin(words);
  const underWords = words.style.overflowY ? ownGap + lastGap : Math.max(ownGap, lastGap);
  const parts = (): PopupParts => ({
    title: lineOf(title, fontSize) * (opts.titleLines ?? 1),
    titleGap: points(title.style.marginBottom, "the gap under the title"),
    words: shown(),
    more: more ? points(more.style.height, "the More below row") : 0,
    wordsGap: underWords + (more ? points(more.style.marginBottom, "the gap under the More below row") : 0),
    buttons: Math.max(...buttons.map((b) => points(b.style.height, "a button's height"))),
  });
  const p = parts();
  const boxHeight = 2 * DECK_POPUP.framePad + p.title + p.titleGap + p.words + p.more + p.wordsGap + p.buttons;

  const layer = page.querySelector<HTMLElement>('[data-decky-ui="ModalRoot"]') ?? page;
  const shownHeight = DECK_POPUP.visibleBottom - DECK_POPUP.visibleTop;
  clampedScroll(layer, () => Math.max(0, DECK_POPUP.layerPadTop + boxHeight + DECK_POPUP.layerPadBottom - shownHeight));

  const titleTop = () => DECK_POPUP.visibleTop + DECK_POPUP.layerPadTop - layer.scrollTop + DECK_POPUP.framePad;
  const titleBox = (): Span => [titleTop(), titleTop() + p.title];
  const wordsBox = (): Span => [titleBox()[1] + p.titleGap, titleBox()[1] + p.titleGap + p.words];
  const buttonsBox = (): Span => [wordsBox()[1] + p.more + p.wordsGap, wordsBox()[1] + p.more + p.wordsGap + p.buttons];
  /** The pinned lines: at the top of the words' box however far the words have scrolled. */
  const pinnedBox = (): Span => [wordsBox()[0], wordsBox()[0] + pinnedPx];
  const rect = ([top, bottom]: Span) => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  layer.getBoundingClientRect = () => rect([DECK_POPUP.visibleTop, DECK_POPUP.visibleBottom]);
  for (const b of buttons) b.getBoundingClientRect = () => rect(buttonsBox());

  const line = lineOf(textEl, fontSize);
  /** Part of the words, from `fromPx` to `toPx` down their own height, where it is on screen now. */
  const wordsAt = (fromPx: number, toPx: number): Span => [wordsBox()[0] + fromPx - words.scrollTop, wordsBox()[0] + toPx - words.scrollTop];
  /** True when the whole span is on the screen, between Steam's two bars. */
  const shows = ([top, bottom]: Span) => top >= DECK_POPUP.visibleTop - 0.01 && bottom <= DECK_POPUP.visibleBottom + 0.01;
  /** True when part of the words can be read: on screen, inside the words' box, and not under the pinned lines. */
  const readable = (span: Span) => shows(span) && span[0] >= pinnedBox()[1] - 0.01 && span[1] <= wordsBox()[1] + 0.01;

  return {
    parts: p, boxHeight, title, words, layer, line, pinnedPx, titleBox, wordsBox, buttonsBox, pinnedBox, wordsAt, shows, readable,
    /** How much of the words can be read at once: their box less the pinned lines. */
    window: p.words - pinnedPx,
    /** The "More below" row's words now ("" once the end shows; null when the words fit and there is no row). */
    moreSign: () => (more ? (more.textContent ?? "") : null),
    /** Steam's glide onto the button holding the ring, once a press is over. */
    glide: () => {
      const ring = steamRingHolder();
      if (ring) steamGlide(ring, layer, opts.rule, { paneTop: DECK_POPUP.visibleTop, dockTop: DECK_POPUP.visibleBottom });
    },
  };
}
export type DeckPopup = ReturnType<typeof layOutDeckPopup>;

/**
 * Press Up or Down on the ring until a press moves nothing, at most `limit` times, with Steam's glide after each.
 * Every press must be taken (true) and leave the ring where it was; the words must move the way the press points,
 * never further than can be read at once (no line skipped), and never come back to a place they have been; the
 * title, the pinned lines and the buttons must stay on screen throughout. `places` lists where the words were
 * after each press; `ended` is true when a press found nothing more to show.
 */
export function walkWords(box: DeckPopup, key: "onMoveDown" | "onMoveUp", limit = 10) {
  const ring = steamRingHolder();
  const places = [box.words.scrollTop];
  const problems: string[] = [];
  let ended = false;
  for (let i = 1; i <= limit && !ended; i += 1) {
    const before = box.words.scrollTop;
    if (pressOnRing(key) !== true) problems.push(`press ${i}: not taken`);
    box.glide();
    if (steamRingHolder() !== ring) problems.push(`press ${i}: the ring moved`);
    if (![box.titleBox(), box.pinnedBox(), box.buttonsBox()].every(box.shows)) problems.push(`press ${i}: title, pinned lines or buttons off screen`);
    const moved = box.words.scrollTop - before;
    ended = moved === 0;
    if (ended) continue;
    if ((key === "onMoveDown") !== moved > 0) problems.push(`press ${i}: the words went the wrong way`);
    if (Math.abs(moved) > box.window) problems.push(`press ${i}: moved ${Math.abs(moved)}, more than the ${box.window} that shows`);
    if (places.includes(box.words.scrollTop)) problems.push(`press ${i}: back at ${box.words.scrollTop}`);
    places.push(box.words.scrollTop);
  }
  return { places, problems, ended };
}
