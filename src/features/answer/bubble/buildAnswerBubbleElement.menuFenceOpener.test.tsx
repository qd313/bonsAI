/**
 * Title: The hidden choice menu never flashes a box under an answer as it starts (plan 97, L4)
 *
 * Purpose: On the Deck (2026-10-22, Strategy mode) the answer jumped 48.6 px taller two to three
 * seconds before it finished and fell back. That is exactly the height of the "Code block
 * incoming…" box. A Strategy answer ends with the choice menu, written as a fenced block that the
 * back end hides from the live text -- but only once the opening line is long enough to name it.
 * For the few beats before that, the live text ended in a half-written opener ("```", "```bon",
 * "```bonsai-strategy-bra", or "```json" before its first key), the answer drew the box for it,
 * and the box vanished when the back end hid the menu. A lone "`" or "``" there drew an empty
 * paragraph first. None of it is ever a code block the reader will see.
 *
 * Used for: nothing -- these are tests. They render the whole bubble through the live text the
 * back end publishes at the end of a Strategy answer, beat by beat, with the scramble on and off,
 * and check what is drawn: the same stops, paragraphs and words as the answer alone, and no box.
 *
 * Does not: Measure pixels (jsdom has no layout); the 48.6 px was matched to the box's own height
 * in a browser with the plugin's stylesheet.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnswerBubbleElement } from "./buildAnswerBubbleElement";
import { FENCE_STREAM_WAIT_LABEL } from "../stream/streamMarkdownPrepare";
import { StreamScrambleContext, type StreamScrambleContextValue } from "../stream/streamScrambleContext";
import { resetLiveScrambleMemoForTests } from "../stream/liveScrambleMemo";

const ANSWER = [
  "Getting better comes down to a few habits you can build run after run, so start with these.",
  "",
  "**Keep moving.** Standing still is the fastest way to get swarmed, so walk in wide circles.",
  "",
  "- Mine the gold between waves.",
  "- Grab the supply pods when your health is low.",
  "",
  "Finally, review your deaths and think about what you would change next time you dive.",
].join("\n");

/** What the back end publishes as the menu's opening line is written, token by token. */
const MENU_OPENERS = [
  "\n\n`",
  "\n\n``",
  "\n\n```",
  "\n\n```bon",
  "\n\n```bonsai-strategy-bra",
  "\n\n```bonsai_strat",
  "\n\n```json",
  "\n\n```json\n",
  "\n\n```json\n{",
  '\n\n```json\n{\n  "',
  '\n\n```json\n{\n  "quest',
  "\n\n~~~",
];

const SCRAMBLE_ON: StreamScrambleContextValue = { enabled: true, style: "settle", color: "green", settleMs: 400 };
const SCRAMBLE_OFF: StreamScrambleContextValue = { ...SCRAMBLE_ON, enabled: false };

function bubble(body: string, scramble: StreamScrambleContextValue) {
  return (
    <StreamScrambleContext.Provider value={scramble}>
      {buildAnswerBubbleElement({
        body,
        streaming: true,
        spoilerMaskingEnabled: true,
        maxWidthCss: "100%",
        answerKey: "live",
      })}
    </StreamScrambleContext.Provider>
  );
}

/** What a person sees drawn: the stops, the blocks inside them, and the words. */
function drawn(container: HTMLElement) {
  const b = container.querySelector(".bonsai-chat-ai-bubble")!;
  return {
    stops: b.querySelectorAll(".bonsai-answer-stop").length,
    blocks: b.querySelectorAll(".bonsai-md-p, .bonsai-md-li, .bonsai-md-fenced-pre, .bonsai-stream-fence-wait").length,
    words: (b.textContent ?? "").replace(/\s+/g, " ").trim(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetLiveScrambleMemoForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe.each([
  ["on", SCRAMBLE_ON],
  ["off", SCRAMBLE_OFF],
])("the end of a Strategy answer, scramble %s", (_name, scramble) => {
  it("draws nothing new while the hidden menu's opening line is written", () => {
    const { container, rerender } = render(bubble(ANSWER, scramble));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const before = drawn(container);
    expect(before.words).toContain("next time you dive.");
    for (const opener of [...MENU_OPENERS, ""]) {
      act(() => {
        rerender(bubble(ANSWER + opener, scramble));
      });
      act(() => {
        vi.advanceTimersByTime(150);
      });
      const now = drawn(container);
      expect({ opener, ...now }).toEqual({ opener, ...before });
      expect(container.textContent).not.toContain(FENCE_STREAM_WAIT_LABEL);
    }
  });
});

describe("a real code block still shows its box while it streams", () => {
  it.each([
    ["a named fence", "\n\n```python\nprint('hi')"],
    ["a json block with its first key", '\n\n```json\n{"tdp_watts": 12'],
  ])("%s", (_name, tail) => {
    const { container } = render(bubble(ANSWER + tail, SCRAMBLE_OFF));
    expect(container.textContent).toContain(FENCE_STREAM_WAIT_LABEL);
  });
});
