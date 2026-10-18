/**
 * Title: A long chip reads its words twice, stands still, then may leave
 *
 * Purpose: Pin plan 79 helper I, part one. A suggestion chip whose words are too long for it scrolls
 *          its words sideways; when they reach the end they stand still a second
 *          (PRESET_CHIP_READ_PAUSE_MS), jump back, scroll to the end again and stand a second time
 *          (plan 96 F22) before the chip may leave, and a chip whose words fit never moves. Read the way the screen shows it: the text block's transform and its phase mark.
 *          jsdom lays nothing out, so the two widths the scroller measures on the live element
 *          (words and room) are given by a stand-in, as the other layout tests do.
 * Used for: PresetChipText and PresetChipScrollText in presetChipButton.tsx; the stay time in
 *           presetRowLayout.ts; the chip row in MainTabPresetAnimatedChips.tsx.
 * Does not: Prove the scroll on the Deck. The check this owes: a long chip scrolls to its end, stands
 *           about a second, jumps back, scrolls to the end again, stands, then leaves; a short chip
 *           never moves.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import { setFrozenTestChips, type PresetPrompt } from "./presets";
import { PresetChipText } from "./presetChipButton";
import {
  PRESET_CHIP_READ_PAUSE_MS,
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

  it("reads the words twice: waits, scrolls to the end, stands, snaps back, scrolls again, stands", () => {
    const { container } = render(<PresetChipText text={LONG} scroll />);
    const plan = presetScrollPlan(OVERFLOW_PX)!;
    expect(plan.readPauseMs).toBe(PRESET_CHIP_READ_PAUSE_MS);
    const at = () => run(container);
    const step = (ms: number) => act(() => vi.advanceTimersByTime(ms));
    // Before the wait is over the words have not moved.
    expect(at().dataset.scrollPhase).toBe("waiting");
    expect(at().style.transform).toBe("translateX(0px)");
    step(plan.delayMs - 1);
    expect(at().dataset.scrollPhase).toBe("waiting");
    // Then they scroll, over the time the speed sets, as far as the words overflow.
    step(1);
    expect(at().dataset.scrollPhase).toBe("scrolling");
    expect(at().style.transform).toBe(`translateX(-${OVERFLOW_PX}px)`);
    expect(at().style.transition).toBe(`transform ${plan.crawlMs}ms linear`);
    expect(plan.crawlMs).toBe((OVERFLOW_PX / PRESET_MARQUEE_SPEED) * 1000);
    step(plan.crawlMs - 1);
    expect(at().dataset.scrollPhase).toBe("scrolling");
    // They reach the end and stand still for a second.
    step(1);
    expect(at().dataset.scrollPhase).toBe("end");
    expect(at().dataset.scrollPass).toBe("1");
    expect(at().style.transform).toBe(`translateX(-${OVERFLOW_PX}px)`);
    step(plan.readPauseMs - 1);
    expect(at().dataset.scrollPhase).toBe("end");
    expect(at().style.transform).toBe(`translateX(-${OVERFLOW_PX}px)`);
    // Then they jump back to the start, quickly.
    step(1);
    expect(at().dataset.scrollPhase).toBe("back");
    expect(at().style.transform).toBe("translateX(0px)");
    expect(at().style.transition).toBe(`transform ${plan.snapBackMs}ms ease-out`);
    expect(plan.snapBackMs).toBeLessThan(plan.crawlMs);
    step(plan.snapBackMs - 1);
    expect(at().dataset.scrollPhase).toBe("back");
    // And scroll to the end a second time, at the same speed.
    step(1);
    expect(at().dataset.scrollPhase).toBe("scrolling");
    expect(at().dataset.scrollPass).toBe("2");
    expect(at().style.transform).toBe(`translateX(-${OVERFLOW_PX}px)`);
    expect(at().style.transition).toBe(`transform ${plan.crawlMs}ms linear`);
    step(plan.crawlMs - 1);
    expect(at().dataset.scrollPhase).toBe("scrolling");
    // The second end: nothing moves again for the whole second stand (and for as long as the chip stays).
    step(1);
    expect(at().dataset.scrollPhase).toBe("end");
    expect(at().dataset.scrollPass).toBe("2");
    const atEnd = at().style.transform;
    expect(atEnd).toBe(`translateX(-${OVERFLOW_PX}px)`);
    for (let waited = 0; waited < plan.readPauseMs + 20_000; waited += 250) {
      step(250);
      expect(at().dataset.scrollPhase).toBe("end");
      expect(at().style.transform).toBe(atEnd);
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

    // The first end: the words stand a second, jump back, and scroll again, with the same question showing.
    act(() => vi.advanceTimersByTime(plan.endMs));
    expect(label()?.dataset.scrollPhase).toBe("end");
    let elapsed = plan.endMs;
    while (elapsed + 100 <= plan.secondEndMs) {
      act(() => vi.advanceTimersByTime(100));
      elapsed += 100;
      expect(label()?.textContent).toBe(first);
    }
    act(() => vi.advanceTimersByTime(plan.secondEndMs - elapsed));
    expect(label()?.dataset.scrollPhase).toBe("end");
    expect(label()?.dataset.scrollPass).toBe("2");
    // The second end: the chip is still the same one for the whole stand, and leaves exactly when it
    // is over (plan 81: the row used to wait on its own, much longer, beat).
    const secondEndAt = plan.secondEndMs;
    act(() => vi.advanceTimersByTime(plan.readPauseMs - 1));
    expect(label()?.textContent).toBe(first);
    act(() => vi.advanceTimersByTime(1));
    expect(label()?.textContent).not.toBe(first);
    expect(secondEndAt + plan.readPauseMs).toBe(plan.stayMs);
    expect(presetTurnMs(longA, 1)).toBeGreaterThan(plan.stayMs);
  });
});
