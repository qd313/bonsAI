/**
 * Title: The open question bubble hugs its longest line (option D, plan 72)
 * Purpose: Pin the maintainer's pick of 2026-09-26: right-aligned text, lines evened out, the
 *          bubble shrunk to its longest line, and the text 3 px from the Retry arrow. Measured on
 *          the Deck (plan72-P-QBUBBLE-handheld.json): a three-line question had lines 193.6 /
 *          225.0 / 105.8 wide in a 245.3 title box, so 20.3 px of empty space sat left of the
 *          widest line. The Deck re-check (plan72-F-BUBBLE.json) then found text-wrap: balance did
 *          nothing there, so the helper evens the lines itself.
 * Used for: questionBubbleFit.ts, buildTurnHeaderElement.tsx and questionBubble.ts.
 * Does not: Check where Steam's own font breaks the lines. jsdom has no layout, so a small
 *           stand-in wraps the words; the Deck check settles the real breaks.
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTurnHeaderElement } from "./buildTurnHeaderElement";
import { buildQuestionBubbleSection } from "../styles/sections/questionBubble";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

/* The Deck's three-line question, and its lines as measured on the Deck before balancing. */
const QUESTION =
  "Explain in detail how the Steam Deck performance overlay levels differ and what each number means";
const DECK_LINES: [string, number][] = [
  ["Explain in detail how the Steam Deck", 193.591],
  ["performance overlay levels differ and what", 224.951],
  ["each number means", 105.762],
];
const HEADER_WIDTH = 266.809;
const TITLE_WIDTH = 245.251;
const EXTRA = HEADER_WIDTH - TITLE_WIDTH; /* the bubble's padding and border */
const FLOAT_WIDTH = 19;
const LINE_HEIGHT = 14.3;
const TEXT_RIGHT = 331.226;

/*
 * A stand-in for the browser's line breaking, since jsdom has none: each word is as wide as its
 * share of the line it sat on at the Deck (other text: 5.4 px a letter), a space as wide as a
 * letter, lines break greedily at the title's width, and the Retry float takes 19 px of the last
 * line or drops below it. Real breaks with Steam's font can differ by a word; the Deck settles it.
 */
const deckWords = new Map<string, number>();
const deckLetter = new Map<string, number>();
for (const [line, width] of DECK_LINES) {
  const perLetter = width / line.length;
  for (const word of line.split(" ")) {
    deckWords.set(word, word.length * perLetter);
    deckLetter.set(word, perLetter);
  }
}
/* Where the stylesheet puts the Retry float: an open bubble with Retry, not yet fitted. */
const FLOAT_ON =
  ".bonsai-chat-turn-row-header--with-retry.bonsai-chat-turn-row-header--expanded:not([data-bonsai-fitted])";
let naturalTitleWidth = TITLE_WIDTH;
let fixedLines: number[] | null = null;
let rangeReads = 0;
let observers: { cb: ResizeObserverCallback; target: Element | null }[] = [];

function wrap(title: HTMLElement): { widths: number[]; dropped: boolean } {
  const max = parseFloat(title.style.getPropertyValue("max-width"));
  const width = Number.isFinite(max) ? Math.min(max, naturalTitleWidth) : naturalTitleWidth;
  const withFloat = Boolean(
    title.closest(FLOAT_ON),
  );
  const widths: number[] = [];
  let current = -1;
  for (const word of (title.textContent ?? "").split(" ")) {
    const w = deckWords.get(word) ?? word.length * 5.4;
    const space = deckLetter.get(word) ?? 5.4;
    if (current >= 0 && current + space + w <= width) current += space + w;
    else {
      if (current >= 0) widths.push(current);
      current = w;
    }
  }
  widths.push(current);
  const dropped = withFloat && widths[widths.length - 1]! + FLOAT_WIDTH > width;
  return { widths, dropped };
}

/** The lines as the stand-in lays them out now, for the tests to read back. */
function laidOut(container: HTMLElement): number[] {
  return wrap(container.querySelector(".bonsai-chat-turn-row-title") as HTMLElement).widths;
}

function rect(left: number, width: number, top = 0, height = LINE_HEIGHT): DOMRect {
  return { left, right: left + width, width, top, bottom: top + height, x: left, y: top, height } as DOMRect;
}

beforeEach(() => {
  naturalTitleWidth = TITLE_WIDTH;
  fixedLines = null;
  rangeReads = 0;
  observers = [];
  (Range.prototype as unknown as { getClientRects: () => DOMRect[] }).getClientRects = function (this: Range) {
    rangeReads += 1;
    const widths = fixedLines ?? wrap(this.startContainer as HTMLElement).widths;
    const out = widths.map((w, i) => rect(TEXT_RIGHT - w, w, 191.1 + i * LINE_HEIGHT));
    /* Two fragments on one line, as a browser can report: they merge into one line. */
    if (out.length > 1) out.push(rect(TEXT_RIGHT - 20, 20, 191.1 + 0.4));
    return out;
  };
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLElement) {
      if (!this.classList.contains("bonsai-chat-turn-row-title")) return 0;
      const { widths, dropped } = wrap(this);
      return (widths.length + (dropped ? 1 : 0)) * LINE_HEIGHT;
    },
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("bonsai-chat-turn-row-header")) return rect(75.195, naturalTitleWidth + EXTRA);
    if (this.classList.contains("bonsai-chat-turn-row-title")) return rect(85.974, naturalTitleWidth);
    return rect(0, 290);
  });
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, pseudo?: string | null) => {
    /* The float exists only on an open bubble with Retry; with no content, Chromium says "auto". */
    if (pseudo === "::after" && (el as HTMLElement).classList.contains("bonsai-chat-turn-row-title")) {
      return { width: el.closest(FLOAT_ON) ? `${FLOAT_WIDTH}px` : "auto" } as CSSStyleDeclaration;
    }
    return real(el);
  });
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    private entry: { cb: ResizeObserverCallback; target: Element | null };
    constructor(cb: ResizeObserverCallback) {
      this.entry = { cb, target: null };
      observers.push(this.entry);
    }
    observe(target: Element) {
      this.entry.target = target;
    }
    disconnect() {
      this.entry.target = null;
    }
    unobserve() {}
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (Range.prototype as unknown as { getClientRects?: unknown }).getClientRects;
  delete (HTMLElement.prototype as unknown as { scrollHeight?: unknown }).scrollHeight;
  delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
});

function header(over: Partial<Parameters<typeof buildTurnHeaderElement>[0]> = {}) {
  return buildTurnHeaderElement({
    turnId: "live",
    title: QUESTION,
    expanded: true,
    variant: "live",
    onActivate: () => {},
    onRetry: () => {},
    ...over,
  });
}

function headerEl(container: HTMLElement): HTMLElement {
  return container.querySelector(".bonsai-chat-turn-row-header") as HTMLElement;
}

function titleEl(container: HTMLElement): HTMLElement {
  return container.querySelector(".bonsai-chat-turn-row-title") as HTMLElement;
}

/** The bubble's width, as set inline, in px. */
function widthOf(el: HTMLElement): number {
  return parseFloat(el.style.getPropertyValue("width"));
}

describe("the open question bubble's stylesheet (option D)", () => {
  const css = buildQuestionBubbleSection();

  it("asks for even lines after the rule that sets white-space, and parks a narrowed title on the right", () => {
    const match = css.match(
      /\.bonsai-scope \.bonsai-chat-turn-row-header--expanded \.bonsai-chat-turn-row-title\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toContain("text-wrap: balance !important");
    expect(body.indexOf("text-wrap")).toBeGreaterThan(body.indexOf("white-space"));
    expect(body).toContain("margin-left: auto !important");
    /* Still right-aligned: the bubble's own rule sets it, and nothing here overrides it. */
    expect(body).not.toContain("text-align");
    expect(css.match(/\.bonsai-scope \.bonsai-chat-turn-row-header\s*\{([^}]*)\}/)![1]).toContain(
      "text-align: right !important",
    );
  });

  it("leaves the collapsed one-line title alone: no wrap, an ellipsis, no balance", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-chat-turn-row-title\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toContain("white-space: nowrap !important");
    expect(body).toContain("text-overflow: ellipsis !important");
    expect(body).not.toContain("balance");
  });

  it("puts the text 3 px from the Retry arrow", () => {
    const px = (source: string, re: RegExp) => Number(source.match(re)![1]);
    const header = css.match(/\.bonsai-scope \.bonsai-chat-turn-row-header\s*\{([^}]*)\}/)![1]!;
    const slot = css.match(/> div\.bonsai-turn-retry-corner-slot\s*\{([^}]*)\}/)![1]!;
    const icon = css.match(/\.bonsai-turn-retry-corner\.DialogButton\s*\{([^}]*)\}/)![1]!;
    const float = css.match(/\.bonsai-chat-turn-row-title::after\s*\{([^}]*)\}/)![1]!;
    const paddingLeft = px(header, /padding:\s*\d+px (\d+)px/);
    const iconLeft = px(slot, /left:\s*calc\((\d+)px/);
    const iconWidth = px(icon, /width:\s*calc\((\d+)px/);
    const floatWidth = px(float, /width:\s*calc\((\d+)px/);
    /* Both measured from the bubble's padding edge: the icon ends at left + width, the text
       starts after the padding and the room kept for the icon. */
    expect(paddingLeft + floatWidth - (iconLeft + iconWidth)).toBe(3);
  });

  it("drops the Retry float once the bubble is fitted, since the text box itself keeps the room", () => {
    const match = css.match(
      /\.bonsai-chat-turn-row-header--with-retry\.bonsai-chat-turn-row-header--expanded\[data-bonsai-fitted\]\s*\.bonsai-chat-turn-row-title::after\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    expect(match![1]!).toContain("content: none !important");
  });
});

describe("the open question bubble's width", () => {
  it("evens out the Deck's question itself: about 166.7 / 166.1 / 192.3, was 193.6 / 225.0 / 105.8", () => {
    const { container } = render(header());
    const lines = laidOut(container);
    expect(lines.map((w) => Math.round(w * 10) / 10)).toEqual([166.7, 166.1, 192.3]);
    /* Still three lines, so the title is no taller than before. */
    expect(titleEl(container).scrollHeight).toBe(3 * LINE_HEIGHT);
  });

  it("shrinks to its longest line, plus its padding and the room kept for Retry", () => {
    const { container } = render(header());
    const el = headerEl(container);
    const widest = Math.max(...laidOut(container));
    /* The text's own box is the bubble less its padding and the Retry room. The widest line fills
       it to within a pixel, so it starts 3 px from the arrow like the last line. */
    const textBox = widthOf(el) - EXTRA - FLOAT_WIDTH;
    expect(textBox).toBeGreaterThanOrEqual(widest);
    expect(textBox - widest).toBeLessThan(1.5);
    /* About 31 px narrower than the fit before balancing (224.951 + padding + Retry = 266). */
    expect(widthOf(el)).toBeLessThan(240);
    /* Inline and !important, or the stylesheet's own width: fit-content !important wins. */
    expect(el.style.getPropertyPriority("width")).toBe("important");
  });

  it("keeps the room for Retry on the left of every line, not twice on the last", () => {
    const { container } = render(header());
    const el = headerEl(container);
    expect(el.hasAttribute("data-bonsai-fitted")).toBe(true);
    /* The title box is the bubble less padding and room, and every line fits inside it. */
    const title = titleEl(container);
    const box = parseFloat(title.style.getPropertyValue("max-width"));
    expect(widthOf(el)).toBe(Math.ceil(box + EXTRA + FLOAT_WIDTH));
    for (const w of laidOut(container)) expect(w).toBeLessThanOrEqual(box);
  });

  it("falls back to the plain fit, float kept, when the even lines will not fit beside Retry", () => {
    /* Eighteen short words: two lines of 237.6 at the natural width, three if 19 px narrower. */
    const { container } = render(header({ title: Array(18).fill("abcd").join(" ") }));
    const el = headerEl(container);
    expect(el.hasAttribute("data-bonsai-fitted")).toBe(false);
    expect(titleEl(container).style.getPropertyValue("max-width")).toBe("");
    const lines = laidOut(container);
    expect(lines).toHaveLength(2);
    expect(widthOf(el)).toBe(Math.ceil(Math.max(...lines) + EXTRA + FLOAT_WIDTH));
  });

  it("keeps no room for Retry on a bubble without the arrow", () => {
    const { container } = render(header({ onRetry: undefined }));
    const widest = Math.max(...laidOut(container));
    const textBox = widthOf(headerEl(container)) - EXTRA;
    expect(textBox).toBeGreaterThanOrEqual(widest);
    expect(textBox - widest).toBeLessThan(1.5);
  });

  it("takes a few layouts to even the lines out, not one per pixel", () => {
    render(header());
    expect(rangeReads).toBeLessThanOrEqual(10);
  });

  it("leaves a one-line question exactly as it is", () => {
    fixedLines = [164.038];
    const { container } = render(header({ title: "Is there a day limit in Pikmin 2?" }));
    expect(headerEl(container).style.getPropertyValue("width")).toBe("");
    expect(titleEl(container).style.getPropertyValue("max-width")).toBe("");
  });

  it("never touches a collapsed history row, and gives the width back when a bubble closes", () => {
    const { container, rerender } = render(header({ expanded: false, onRetry: undefined, variant: "history" }));
    expect(headerEl(container).style.getPropertyValue("width")).toBe("");
    expect(rangeReads).toBe(0);

    rerender(header({ expanded: true, onRetry: undefined, variant: "history" }));
    expect(headerEl(container).style.getPropertyValue("width")).not.toBe("");
    rerender(header({ expanded: false, onRetry: undefined, variant: "history" }));
    expect(headerEl(container).style.getPropertyValue("width")).toBe("");
    expect(titleEl(container).style.getPropertyValue("max-width")).toBe("");
  });

  it("measures again when the text changes, not on every render", () => {
    const { rerender } = render(header());
    const afterFirst = rangeReads;
    expect(afterFirst).toBeGreaterThan(0);
    rerender(header());
    rerender(header());
    expect(rangeReads).toBe(afterFirst);
    rerender(header({ title: "A different question that also wraps onto more than one line here" }));
    expect(rangeReads).toBeGreaterThan(afterFirst);
  });

  it("measures again when the column's width changes, and only then", () => {
    const { container } = render(header());
    const el = headerEl(container);
    const watching = observers.find((o) => o.target === el.parentElement);
    expect(watching).toBeTruthy();
    const fire = (width: number) =>
      watching!.cb([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver);

    fire(290); /* the first report after mount may fit once more */
    const afterFirstReport = rangeReads;
    fire(290); /* same width: nothing */
    expect(rangeReads).toBe(afterFirstReport);

    naturalTitleWidth = 180; /* a narrower column: four lines now */
    fire(250);
    expect(rangeReads).toBeGreaterThan(afterFirstReport);
    const lines = laidOut(container);
    expect(lines).toHaveLength(4);
    const textBox = widthOf(el) - EXTRA - FLOAT_WIDTH;
    expect(textBox).toBeGreaterThanOrEqual(Math.max(...lines));
    expect(textBox - Math.max(...lines)).toBeLessThan(1.5);
  });
});
