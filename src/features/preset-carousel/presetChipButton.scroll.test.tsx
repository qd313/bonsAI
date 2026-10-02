/**
 * Title: A long chip scrolls to its end, stands still, then may leave
 *
 * Purpose: Pin plan 79 helper I, part one. A suggestion chip whose words are too long for it scrolls
 *          its words sideways; when they reach the end they stand still for the pause
 *          (PRESET_CHIP_END_PAUSE_MS) before the chip may leave, and a chip whose words fit never
 *          moves. Read the way the screen shows it: the text block's transform and its phase mark.
 *          jsdom lays nothing out, so the two widths the scroller measures on the live element
 *          (words and room) are given by a stand-in, as the other layout tests do.
 * Used for: PresetChipText and PresetChipScrollText in presetChipButton.tsx; the stay time in
 *           presetRowLayout.ts; the chip row in MainTabPresetAnimatedChips.tsx.
 * Does not: Prove the scroll on the Deck. The check this owes: a long chip scrolls to its end, stands
 *           still for about a second and a half, then leaves; a short chip never moves.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetAnimatedChips } from "../../components/MainTabPresetAnimatedChips";
import { setFrozenTestChips, type PresetPrompt } from "../../data/presets";
import { PresetChipText } from "./presetChipButton";
import {
  PRESET_CHIP_END_PAUSE_MS,
  PRESET_MARQUEE_SPEED,
  presetScrollPlan,
  presetTurnMs,
} from "./presetRowLayout";

const PX_PER_CHAR = 6.45;
const ROOM_PX = 284; // one wide chip: 300 less 2 x 8 padding

/** jsdom has no layout: give the words and the room their widths, read off the live elements. */
function standInForLayout(roomPx: number) {
  const words = vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (this: Element) {
    return this.classList.contains("bonsai-preset-chip-text-run")
      ? Math.round((this.textContent ?? "").length * PX_PER_CHAR)
      : 0;
  });
  const room = vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (this: Element) {
    return this.classList.contains("bonsai-preset-chip-text--marquee") ? roomPx : 0;
  });
  return () => {
    words.mockRestore();
    room.mockRestore();
  };
}

const LONG = "x".repeat(80); // 516 px of words in 284 px of room: 232 px to scroll
const OVERFLOW_PX = Math.round(LONG.length * PX_PER_CHAR) - ROOM_PX;

describe("a long chip's words reach the end, stand still, and only then may the chip leave", () => {
  let restore: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    restore = standInForLayout(ROOM_PX);
  });
  afterEach(() => {
    restore();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  const run = (c: HTMLElement) => c.querySelector<HTMLElement>(".bonsai-preset-chip-text-run")!;

  it("waits at the start, scrolls to the end, then stands still for the whole pause", () => {
    const { container } = render(<PresetChipText text={LONG} scroll />);
    const plan = presetScrollPlan(OVERFLOW_PX)!;
    expect(plan.pauseMs).toBe(PRESET_CHIP_END_PAUSE_MS);
    // Before the wait is over the words have not moved.
    expect(run(container).dataset.scrollPhase).toBe("waiting");
    expect(run(container).style.transform).toBe("translateX(0px)");
    act(() => vi.advanceTimersByTime(plan.delayMs - 1));
    expect(run(container).dataset.scrollPhase).toBe("waiting");
    // Then they scroll, over the time the speed sets, as far as the words overflow.
    act(() => vi.advanceTimersByTime(1));
    expect(run(container).dataset.scrollPhase).toBe("scrolling");
    expect(run(container).style.transform).toBe(`translateX(-${OVERFLOW_PX}px)`);
    expect(run(container).style.transition).toBe(`transform ${plan.crawlMs}ms linear`);
    expect(plan.crawlMs).toBe((OVERFLOW_PX / PRESET_MARQUEE_SPEED) * 1000);
    act(() => vi.advanceTimersByTime(plan.crawlMs - 1));
    expect(run(container).dataset.scrollPhase).toBe("scrolling");
    // They reach the end, and nothing moves for the whole pause (and for as long as the chip stays).
    act(() => vi.advanceTimersByTime(1));
    expect(run(container).dataset.scrollPhase).toBe("end");
    const atEnd = run(container).style.transform;
    expect(atEnd).toBe(`translateX(-${OVERFLOW_PX}px)`);
    for (let waited = 0; waited < plan.pauseMs + 20_000; waited += 250) {
      act(() => vi.advanceTimersByTime(250));
      expect(run(container).dataset.scrollPhase).toBe("end");
      expect(run(container).style.transform).toBe(atEnd);
    }
  });

  it("never moves the words of a chip that fits", () => {
    const { container } = render(<PresetChipText text="Short one" scroll />);
    expect(run(container).dataset.scrollPhase).toBe("fits");
    const before = run(container).style.transform;
    act(() => vi.advanceTimersByTime(60_000));
    expect(run(container).dataset.scrollPhase).toBe("fits");
    expect(run(container).style.transform).toBe(before);
    expect(run(container).style.transform).not.toMatch(/-\d/);
  });

  it("does not scroll at all when motion is reduced: the words are cut off with an ellipsis", () => {
    const { container } = render(<PresetChipText text={LONG} scroll={false} />);
    expect(container.querySelector(".bonsai-preset-chip-text-run")).toBeNull();
    expect(container.querySelector(".bonsai-preset-chip-text--marquee")).toBeNull();
    act(() => vi.advanceTimersByTime(60_000));
    expect(container.textContent).toBe(LONG);
  });

  it("starts over for a chip that changes its words", () => {
    const { container, rerender } = render(<PresetChipText text={LONG} scroll />);
    act(() => vi.advanceTimersByTime(presetScrollPlan(OVERFLOW_PX)!.stayMs));
    expect(run(container).dataset.scrollPhase).toBe("end");
    rerender(<PresetChipText text={"y".repeat(81)} scroll />);
    expect(run(container).dataset.scrollPhase).toBe("waiting");
  });
});

/**
 * The same, one step up where the row sits: a chip in the real row, long enough to scroll, does not
 * change its question until its words have reached the end and stood still for the pause.
 */
describe("a chip in the row does not leave in the middle of a scroll or of the pause", () => {
  let restore: () => void;
  beforeEach(() => {
    setFrozenTestChips(["q1", "q2", "q3", "q4", "q5"]);
    vi.useFakeTimers();
    restore = standInForLayout(ROOM_PX);
  });
  afterEach(() => {
    restore();
    vi.useRealTimers();
    setFrozenTestChips([]);
    document.body.innerHTML = "";
  });

  const seed = (text: string): PresetPrompt => ({ text, category: "general" });

  it("static style, one chip: scroll, then the pause, then the next question", () => {
    const longA = "a".repeat(80);
    const longB = "b".repeat(80);
    const view = render(
      <MainTabPresetAnimatedChips
        seeds={[seed(longA), seed(longB)]}
        setUnifiedInput={vi.fn()}
        animationMode="static"
        fadeAnimationEnabled={false}
        presetSingleChip
      />,
    );
    const label = () => view.container.querySelector<HTMLElement>("button.bonsai-preset-glass .bonsai-preset-chip-text-run");
    const first = label()?.textContent;
    expect(first).toBeTruthy();
    const plan = presetScrollPlan(80 * PX_PER_CHAR - ROOM_PX)!;

    // The words reach the end, and stand still for the whole pause, with the same question showing.
    act(() => vi.advanceTimersByTime(plan.endMs));
    expect(label()?.dataset.scrollPhase).toBe("end");
    const atEnd = label()?.style.transform;
    for (let waited = 0; waited < plan.pauseMs; waited += 100) {
      act(() => vi.advanceTimersByTime(100));
      expect(label()?.textContent).toBe(first);
      expect(label()?.style.transform).toBe(atEnd);
    }
    // The chip is still the same one right up to scroll plus pause, and has changed by its turn's end.
    expect(label()?.textContent).toBe(first);
    expect(presetTurnMs(longA, 1)).toBeGreaterThan(plan.stayMs);
    act(() => vi.advanceTimersByTime(presetTurnMs(longA, 1) + 2_000));
    expect(label()?.textContent).not.toBe(first);
  });
});
