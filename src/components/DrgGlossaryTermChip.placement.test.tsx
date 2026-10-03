import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

import { DrgGlossaryTermChip } from "./DrgGlossaryTermChip";
import { DRG_SURVIVOR_GLOSSARY_TERMS } from "../data/drgGlossaryTerms";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

/*
 * The Deck check for this fix: with a game running, at every underlined-word stop the tooltip's box
 * and the word's box do not overlap, and the tooltip sits inside the window above the dock. jsdom
 * has no layout, so these tests give the word, pane, dock and window real boxes (the numbers the
 * Deck measured on 2026-10-03, evidence plan81-P81-LOOK-TOOLTIP-WORDS) and read the tooltip's box
 * back from where the component drew it.
 */

const kitingTerm = DRG_SURVIVOR_GLOSSARY_TERMS.find((t) => t.id === "kiting")!;

const WINDOW_H = 534;
const PANE_TOP = 128;
const TIP_H = 32.7;

type Box = { top: number; bottom: number };
type Mount = {
  wordTop: number;
  wordH?: number;
  dockTop?: number;
  tipH?: number;
};

function rect(top: number, bottom: number, left = 0, right = 854): DOMRect {
  return { top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

function mount(opts: Mount) {
  let wordTop = opts.wordTop;
  const wordH = opts.wordH ?? 15;
  const dockTop = opts.dockTop ?? 330;
  const tipH = opts.tipH ?? TIP_H;
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: WINDOW_H });
  // The tooltip is the only element asked for its text height; jsdom has no layout.
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("bonsai-drg-glossary-tooltip") ? tipH - 2 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("bonsai-drg-glossary-term")) return rect(wordTop, wordTop + wordH, 155, 187);
    if (this.classList.contains("bonsai-scope")) return rect(PANE_TOP, WINDOW_H, 0, 360);
    if (this.classList.contains("fake-pane-TabContentsScroll")) return rect(PANE_TOP, WINDOW_H, 0, 360);
    if (this.classList.contains("bonsai-main-tab-dock")) return rect(dockTop, WINDOW_H, 0, 360);
    return rect(0, 0);
  });
  const view = render(
    <div className="fake-pane-TabContentsScroll TabContentsScroll_x">
      <div className="bonsai-scope">
        <DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />
      </div>
      <div className="bonsai-main-tab-dock" />
    </div>,
  );
  const chip = view.container.querySelector(".bonsai-drg-glossary-term") as HTMLElement;
  const tooltip = () => document.querySelector(".bonsai-drg-glossary-tooltip") as HTMLElement;
  /** Where the tooltip was drawn, read from its own style (top, or bottom against the window). */
  const tooltipBox = (): Box => {
    const s = tooltip().style;
    const h = s.maxHeight ? Math.min(parseFloat(s.maxHeight), tipH) : tipH;
    const top = s.top !== "" ? parseFloat(s.top) : WINDOW_H - parseFloat(s.bottom) - h;
    return { top, bottom: top + h };
  };
  const wordBox = (): Box => ({ top: wordTop, bottom: wordTop + wordH });
  return {
    chip,
    tooltip,
    tooltipBox,
    wordBox,
    dockTop,
    /** Steam scrolls the word to a new place and the pane says so. */
    scrollWordTo(top: number) {
      wordTop = top;
      act(() => {
        document.dispatchEvent(new Event("scroll"));
      });
    },
    open() {
      fireEvent.focus(chip);
    },
  };
}

const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

describe("glossary tooltip never sits on its own word", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("the 'kiting' stop: opened while the word was under the dock, then Steam scrolled it up", () => {
    // Deck 2026-10-03, answer 1 word 3: the tooltip was placed when the word stood at y338.9, then
    // the word moved to y309.6 (15 tall, dock 330, window 534) and the tooltip, drawn y300.2 to
    // y332.9, covered all of it.
    const m = mount({ wordTop: 338.9 });
    m.open();
    m.scrollWordTo(309.6);
    expect(overlap(m.tooltipBox(), m.wordBox())).toBe(0);
    expect(m.tooltipBox().top).toBeGreaterThanOrEqual(PANE_TOP);
    expect(m.tooltipBox().bottom).toBeLessThanOrEqual(m.dockTop);
  });

  it("a word that is already low when the popup opens: tooltip above, clear of the word", () => {
    const m = mount({ wordTop: 309.6 });
    m.open();
    expect(overlap(m.tooltipBox(), m.wordBox())).toBe(0);
    expect(m.tooltipBox().bottom).toBeLessThanOrEqual(m.dockTop);
  });

  it("a word near the pane top has no room above: tooltip goes below it, above the dock", () => {
    const m = mount({ wordTop: 140 });
    m.open();
    expect(overlap(m.tooltipBox(), m.wordBox())).toBe(0);
    expect(m.tooltipBox().top).toBeGreaterThanOrEqual(m.wordBox().bottom);
    expect(m.tooltipBox().bottom).toBeLessThanOrEqual(m.dockTop);
  });

  it("reads the dock from the page: a dock that stands higher still keeps the tooltip above it", () => {
    // Dock top 290 instead of 330 (a game or the other screen moves it). Word at 160, a tall
    // tooltip: no room above (26 px), so it goes below, and its bottom must stop at 290.
    const m = mount({ wordTop: 160, dockTop: 290, tipH: 48.1 });
    m.open();
    expect(overlap(m.tooltipBox(), m.wordBox())).toBe(0);
    expect(m.tooltipBox().bottom).toBeLessThanOrEqual(290);
  });

  it("fits on neither side: takes the side with more room and shortens itself, off the word", () => {
    // Band 128..200 (dock at 200), word at 150..165: room above 16, room below 29, tooltip 48.1.
    const m = mount({ wordTop: 150, dockTop: 200, tipH: 48.1 });
    m.open();
    expect(overlap(m.tooltipBox(), m.wordBox())).toBe(0);
    expect(m.tooltipBox().top).toBeGreaterThanOrEqual(PANE_TOP);
    expect(m.tooltipBox().bottom).toBeLessThanOrEqual(200);
    expect(m.tooltip().style.maxHeight).not.toBe("");
  });

  it("every word position down the band keeps the tooltip off the word and above the dock", () => {
    for (let top = 140; top <= 315; top += 7) {
      const m = mount({ wordTop: top, tipH: 48.1 });
      m.open();
      expect(overlap(m.tooltipBox(), m.wordBox()), `word top ${top}`).toBe(0);
      expect(m.tooltipBox().bottom, `word top ${top}`).toBeLessThanOrEqual(330);
      expect(m.tooltipBox().top, `word top ${top}`).toBeGreaterThanOrEqual(PANE_TOP);
      cleanup();
      vi.restoreAllMocks();
    }
  });

  beforeEach(() => {
    document.body.innerHTML = "";
  });
});
