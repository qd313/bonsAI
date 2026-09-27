/**
 * Title: The open question bubble hugs its longest line (option D, plan 72)
 * Purpose: Pin the maintainer's pick of 2026-09-26: right-aligned text, lines evened out by the
 *          browser (text-wrap: balance), the bubble shrunk to its longest line, and the text 3 px
 *          from the Retry arrow. Measured on the Deck (plan72-P-QBUBBLE-handheld.json): a
 *          three-line question had lines 193.6 / 225.0 / 105.8 wide in a 245.3 title box, so
 *          20.3 px of empty space sat left of the widest line.
 * Used for: questionBubbleFit.ts, buildTurnHeaderElement.tsx and questionBubble.ts.
 * Does not: Check where Steam's own font breaks the lines. jsdom has no layout, so the line boxes
 *           are stubbed; the Deck check settles the real breaks.
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTurnHeaderElement } from "./buildTurnHeaderElement";
import { buildQuestionBubbleSection } from "../styles/sections/questionBubble";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

/* The Deck's three-line question, as measured. */
const DECK_LINES = [
  { left: 137.634, width: 193.591, top: 191.1 },
  { left: 106.274, width: 224.951, top: 205.4 },
  { left: 225.464, width: 105.762, top: 219.7 },
];
const HEADER_WIDTH = 266.809;
const TITLE_WIDTH = 245.251;
const FLOAT_WIDTH = 19;

let lines = DECK_LINES;
let rangeReads = 0;
let observers: { cb: ResizeObserverCallback; target: Element | null }[] = [];

function rect(left: number, width: number, top = 0, height = 14.3): DOMRect {
  return { left, right: left + width, width, top, bottom: top + height, x: left, y: top, height } as DOMRect;
}

beforeEach(() => {
  lines = DECK_LINES;
  rangeReads = 0;
  observers = [];
  (Range.prototype as unknown as { getClientRects: () => DOMRect[] }).getClientRects = function () {
    rangeReads += 1;
    /* Two fragments on the widest line, as a browser can report: they merge into one line. */
    const out = lines.map((l) => rect(l.left, l.width, l.top));
    if (lines === DECK_LINES) out.push(rect(DECK_LINES[1].left + 10, 20, DECK_LINES[1].top + 0.4));
    return out;
  };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("bonsai-chat-turn-row-header")) return rect(75.195, HEADER_WIDTH);
    if (this.classList.contains("bonsai-chat-turn-row-title")) return rect(85.974, TITLE_WIDTH);
    return rect(0, 290);
  });
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, pseudo?: string | null) => {
    /* The float exists only on an open bubble with Retry; with no content, Chromium says "auto". */
    if (pseudo === "::after" && (el as HTMLElement).classList.contains("bonsai-chat-turn-row-title")) {
      const withRetry = el.closest(".bonsai-chat-turn-row-header--with-retry.bonsai-chat-turn-row-header--expanded");
      return { width: withRetry ? `${FLOAT_WIDTH}px` : "auto" } as CSSStyleDeclaration;
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
  delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
});

function header(over: Partial<Parameters<typeof buildTurnHeaderElement>[0]> = {}) {
  return buildTurnHeaderElement({
    turnId: "live",
    title: "Explain in detail how the Steam Deck performance overlay levels differ and what each number means",
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

describe("the open question bubble's stylesheet (option D)", () => {
  const css = buildQuestionBubbleSection();

  it("evens out the open question's lines, after the rule that sets white-space", () => {
    const match = css.match(
      /\.bonsai-scope \.bonsai-chat-turn-row-header--expanded \.bonsai-chat-turn-row-title\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toContain("text-wrap: balance !important");
    expect(body.indexOf("text-wrap")).toBeGreaterThan(body.indexOf("white-space"));
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
       starts after the padding and the float that keeps it clear of the icon. */
    expect(paddingLeft + floatWidth - (iconLeft + iconWidth)).toBe(3);
  });
});

describe("the open question bubble's width", () => {
  it("shrinks to its longest line, plus its padding and the room kept for Retry", () => {
    const { container } = render(header());
    const el = headerEl(container);
    const extra = HEADER_WIDTH - TITLE_WIDTH;
    expect(el.style.getPropertyValue("width")).toBe(`${Math.ceil(224.951 + extra + FLOAT_WIDTH)}px`);
    /* Inline and !important, or the stylesheet's own width: fit-content !important wins. */
    expect(el.style.getPropertyPriority("width")).toBe("important");
  });

  it("keeps no room for Retry on a bubble without the arrow", () => {
    const { container } = render(header({ onRetry: undefined }));
    const extra = HEADER_WIDTH - TITLE_WIDTH;
    expect(headerEl(container).style.getPropertyValue("width")).toBe(`${Math.ceil(224.951 + extra)}px`);
  });

  it("leaves a one-line question exactly as it is", () => {
    lines = [{ left: 167.188, width: 164.038, top: 155.3 }];
    const { container } = render(header({ title: "Is there a day limit in Pikmin 2?" }));
    expect(headerEl(container).style.getPropertyValue("width")).toBe("");
  });

  it("never touches a collapsed history row, and gives the width back when a bubble closes", () => {
    const { container, rerender } = render(header({ expanded: false, onRetry: undefined, variant: "history" }));
    expect(headerEl(container).style.getPropertyValue("width")).toBe("");
    expect(rangeReads).toBe(0);

    rerender(header({ expanded: true, onRetry: undefined, variant: "history" }));
    expect(headerEl(container).style.getPropertyValue("width")).not.toBe("");
    rerender(header({ expanded: false, onRetry: undefined, variant: "history" }));
    expect(headerEl(container).style.getPropertyValue("width")).toBe("");
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
    const reads = rangeReads;
    const fire = (width: number) =>
      watching!.cb([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver);

    fire(290); /* the first report after mount may fit once more */
    fire(290); /* same width: nothing */
    const afterSame = rangeReads;
    lines = [
      { left: 120, width: 180, top: 191.1 },
      { left: 150, width: 150, top: 205.4 },
    ];
    fire(250);
    expect(rangeReads).toBeGreaterThan(afterSame);
    expect(el.style.getPropertyValue("width")).toBe(
      `${Math.ceil(180 + (HEADER_WIDTH - TITLE_WIDTH) + FLOAT_WIDTH)}px`,
    );
    expect(afterSame - reads).toBeLessThanOrEqual(1);
  });
});
