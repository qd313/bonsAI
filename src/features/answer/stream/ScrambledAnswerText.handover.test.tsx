/**
 * Title: Letters that settle go through the markdown, never as bare text (plan 97, L4 second try)
 *
 * Purpose: On the Deck (2026-10-22, scramble on, default style) the answer grew by 48 px near the
 * end and fell back over half a second. The letters that had just settled were written into the
 * slot as bare text, in a span that keeps every line break, so a paragraph break was an empty
 * line, a list item had no bullet and no margin, and a chunk of settled text was laid out taller
 * than the markdown lays it out. Once the markdown caught up, the answer fell back.
 *
 * Used for: nothing -- these are tests. jsdom has no layout, so the test asks the question that
 * decides the layout: is any settled text in the slot outside the markdown? There must be none at
 * any step, while the stream is writing and while the finish settles the last letters.
 *
 * Solves: Proves the slot holds only the churning letters (each in the line as itself), and the
 * markdown holds everything settled, at every step of a burst and of a finish.
 *
 * Does not: Measure pixels; the real heights were measured in a browser with the plugin's own
 * stylesheet.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrambledAnswerText } from "./ScrambledAnswerText";
import { StreamScrambleContext, type StreamScrambleContextValue } from "./streamScrambleContext";
import { resetLiveScrambleMemoForTests } from "./liveScrambleMemo";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

const SETTLE: StreamScrambleContextValue = { enabled: true, style: "settle", color: "green", settleMs: 400 };

const RAW =
  "Intro line here.\n\nHere is the list:\n- Keep moving, always.\n- Grab the minerals.\n\nFinally review your deaths and learn from them well.";

function view(raw: string, streaming: boolean) {
  return (
    <StreamScrambleContext.Provider value={SETTLE}>
      <ScrambledAnswerText plain={raw} raw={raw} streaming={streaming} spoilerMaskingEnabled />
    </StreamScrambleContext.Provider>
  );
}

/** Text sitting directly in the slot, beside the churning letters: it must always be empty. */
function bareText(container: HTMLElement): string {
  const slot = container.querySelector(".bonsai-stream-scramble");
  if (!slot) return "";
  return Array.from(slot.childNodes)
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent ?? "")
    .join("");
}

function advance(ms: number, each: () => void) {
  for (let left = ms; left > 0; left -= 25) {
    act(() => {
      vi.advanceTimersByTime(Math.min(25, left));
    });
    each();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  resetLiveScrambleMemoForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("settled letters", () => {
  it("a burst of text that settles all at once never shows as bare text in the slot", () => {
    const { container, rerender } = render(view("Warm up line.", true));
    advance(500, () => {});
    act(() => {
      rerender(view(`Warm up line.\n\n${RAW}`, true));
    });
    const seen: string[] = [];
    advance(1000, () => seen.push(bareText(container)));
    expect(seen.filter((s) => s !== "")).toEqual([]);
    expect(container.textContent).toContain("Finally review your deaths");
  });

  it("the finish settles the last letters through the markdown, with no bare text at any step", () => {
    const live = render(view(RAW, true));
    advance(100, () => {});
    live.unmount();
    const { container } = render(view(RAW, false));
    const seen: string[] = [];
    let churned = false;
    advance(700, () => {
      seen.push(bareText(container));
      if (container.querySelector(".bonsai-stream-scramble-churn")?.textContent) churned = true;
    });
    expect(churned).toBe(true);
    expect(seen.filter((s) => s !== "")).toEqual([]);
    expect(container.querySelector(".bonsai-stream-scramble")).toBeNull();
    expect(container.textContent).toContain("Finally review your deaths and learn from them well.");
  });
});
