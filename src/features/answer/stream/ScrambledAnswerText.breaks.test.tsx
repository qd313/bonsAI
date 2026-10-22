/**
 * Title: The scramble draws breaks the way the settled text will (plan 97, L4)
 *
 * Purpose: While an answer writes, it must never shrink by a line. The unsettled letters sit in a
 * span that keeps every line break (pre-wrap), but the settled markdown lays the same breaks out
 * differently: a paragraph break is a small margin, not a whole empty line. When the settle point
 * crossed such a break the answer lost the difference at once (measured on the Deck, 2026-10-14:
 * dips of 6 to 27 px, about seven in one long answer).
 *
 * Used for: nothing -- these are tests. jsdom has no layout, so each test counts what the page
 * would lay out as a line: an empty line is two line-break text nodes in a row with nothing
 * between them. The real heights were measured in a browser with the plugin's own stylesheet.
 *
 * Solves: Proves the span never draws an empty line where the markdown will draw a margin, at
 * every beat of a stream that walks through a break, and that the margin the span draws instead
 * is the same size as the markdown's.
 *
 * Does not: Measure pixels; the stylesheet test below ties the two margins to one number.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrambledAnswerText } from "./ScrambledAnswerText";
import { StreamScrambleContext, type StreamScrambleContextValue } from "./streamScrambleContext";
import { resetLiveScrambleMemoForTests } from "./liveScrambleMemo";
import { SCRAMBLE_CHURN_MS } from "./streamScrambleMath";
import { buildAnswerBubbleSection } from "../bubble/answerBubble";
import { buildAnswerMarkdownFormattingSection } from "../markdown/answerMarkdownFormatting";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

const ON: StreamScrambleContextValue = { enabled: true, style: "tail", color: "green", settleMs: 400 };

function view(raw: string) {
  return (
    <StreamScrambleContext.Provider value={ON}>
      <ScrambledAnswerText plain={raw} raw={raw} streaming spoilerMaskingEnabled />
    </StreamScrambleContext.Provider>
  );
}

/** Empty lines the page would draw in the unsettled stretch: two line-break nodes side by side. */
function emptyLinesDrawn(container: HTMLElement): number {
  const churn = container.querySelector(".bonsai-stream-scramble-churn");
  if (!churn) return 0;
  let empty = 0;
  let previousWasBreak = false;
  for (const node of Array.from(churn.childNodes)) {
    const isBreak = node.nodeType === 3 && node.textContent === "\n";
    if (isBreak && previousWasBreak) empty += 1;
    previousWasBreak = isBreak;
  }
  return empty;
}

/** Line breaks the page would draw in the unsettled stretch: text nodes that are a bare newline. */
function lineBreaksDrawn(container: HTMLElement): number {
  const churn = container.querySelector(".bonsai-stream-scramble-churn");
  if (!churn) return 0;
  return Array.from(churn.childNodes).filter((n) => n.nodeType === 3 && n.textContent === "\n").length;
}

function gapsDrawn(container: HTMLElement): number {
  return container.querySelectorAll(".bonsai-stream-scramble-gap").length;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetLiveScrambleMemoForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a paragraph break in the unsettled stretch", () => {
  const FIRST = "Dig down first and mine the gold.";
  const SECOND = "Then take the lift to the next cave.";

  it("is drawn as one gap block, never as an empty line, at every beat of the stream", () => {
    const full = `${FIRST}\n\n${SECOND}`;
    const { container, rerender } = render(view(full.slice(0, 5)));
    const seen: Array<{ at: number; empty: number; gaps: number }> = [];
    for (let n = 6; n <= full.length; n += 3) {
      act(() => {
        rerender(view(full.slice(0, n)));
        vi.advanceTimersByTime(SCRAMBLE_CHURN_MS);
      });
      seen.push({ at: n, empty: emptyLinesDrawn(container), gaps: gapsDrawn(container) });
    }
    expect(seen.filter((s) => s.empty > 0)).toEqual([]);
    /* The break did get drawn while it was unsettled (the tail style keeps ten letters churning). */
    expect(seen.some((s) => s.gaps === 1)).toBe(true);
  });

  it("is drawn as one gap even when the model sends three line breaks", () => {
    const { container } = render(view(`${FIRST}\n\n\nThen go.`));
    expect(emptyLinesDrawn(container)).toBe(0);
    expect(gapsDrawn(container)).toBe(1);
  });

  it("leaves a single line break before a list item alone: it is still a line break", () => {
    const { container } = render(view(`- one\n- two`));
    expect(gapsDrawn(container)).toBe(0);
    expect(lineBreaksDrawn(container)).toBe(1);
  });
});

describe("a single line break in the unsettled stretch", () => {
  it("inside a paragraph is drawn as a space, because the markdown joins those lines", () => {
    const { container } = render(view("Note this down.\nSecond"));
    expect(lineBreaksDrawn(container)).toBe(0);
  });

  it("is a space at every beat while the next line is still arriving", () => {
    const full = "Note this down.\nSecond";
    const { container, rerender } = render(view(full.slice(0, 10)));
    for (let n = 11; n <= full.length; n += 1) {
      act(() => {
        rerender(view(full.slice(0, n)));
        vi.advanceTimersByTime(SCRAMBLE_CHURN_MS);
      });
      expect(lineBreaksDrawn(container)).toBe(0);
    }
  });

  it.each([
    ["a list item follows", "Items:\n- one"],
    ["a numbered item follows", "Items:\n1. one"],
    ["a heading follows", "Items:\n## One"],
    ["the line before is a heading", "## Items\nOne two"],
    ["a quote follows", "Items:\n> one"],
  ])("stays a line break when %s", (_name, text) => {
    const { container } = render(view(text));
    expect(lineBreaksDrawn(container)).toBe(1);
  });

  it("turns into a line break once the next line turns out to be a list item", () => {
    const { container, rerender } = render(view("Items:\n"));
    expect(lineBreaksDrawn(container)).toBe(0);
    act(() => {
      rerender(view("Items:\n- o"));
      vi.advanceTimersByTime(SCRAMBLE_CHURN_MS);
    });
    expect(lineBreaksDrawn(container)).toBe(1);
  });
});

describe("the gap's size", () => {
  it("is the margin the markdown puts between two paragraphs", () => {
    const gap = /\.bonsai-stream-scramble-gap\s*\{[^}]*height:\s*([\d.]+em)/.exec(buildAnswerBubbleSection());
    const paragraph = /\.bonsai-md-p\s*\{\s*margin:\s*0 0 ([\d.]+em) 0/.exec(buildAnswerMarkdownFormattingSection());
    expect(gap?.[1]).toBeDefined();
    expect(gap?.[1]).toBe(paragraph?.[1]);
  });
});

describe("a list that holds a paragraph gap", () => {
  const css = buildAnswerBubbleSection();

  it("gives up its trailing margin, because the text after the gap belongs to the next paragraph", () => {
    /* The gap stands for the margin between the list and the next paragraph. The list's own bottom
       margin would be counted a second time at the end of the answer until the text left the list. */
    for (const list of ["bonsai-md-ul", "bonsai-md-ol"]) {
      const rule = new RegExp(String.raw`\.${list}:has\(\.bonsai-stream-scramble-gap\)[^{]*\{[^}]*margin-bottom:\s*0`);
      expect(css).toMatch(rule);
    }
    expect(css).toMatch(/\.bonsai-md-li:last-child:has\(\.bonsai-stream-scramble-gap\)[^{]*\{[^}]*margin-bottom:\s*0/);
  });
});
