/**
 * Title: A suggestion chip keeps the ring when it changes question
 * Purpose: Pin the fix for PRESET-ONE-LINE-03's plan 70 failure in the fade and static chip styles:
 *          with the ring on the single chip, about 5 to 8 s later the chip swapped question and
 *          nothing held focus (docs/test-evidence/plan70-PRESET-ONE-LINE-03.json). Decode style
 *          passed the same walk, because it keeps one button per slot and only changes its text.
 * Used for: MainTabPresetAnimatedChipsInner (fade and static) in MainTabPresetAnimatedChips.tsx.
 * Does not: Prove the fix on the Deck. The check this owes: in fade and in static style, put the
 *           ring on the chip and wait 20 s without pressing anything; the ring stays on the chip.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import { setFrozenTestChips, type PresetPrompt } from "../data/presets";

const seed = (text: string): PresetPrompt => ({ text, category: "general" });

function renderOneChip(animationMode: "fade" | "static") {
  const outside = document.createElement("button");
  document.body.appendChild(outside);
  const view = render(
    <MainTabPresetAnimatedChips
      seeds={[seed("q1"), seed("q2"), seed("q3")]}
      setUnifiedInput={vi.fn()}
      animationMode={animationMode}
      fadeAnimationEnabled={animationMode === "fade"}
      presetSingleChip
    />,
  );
  const chip = () => view.container.querySelector<HTMLButtonElement>("button.bonsai-preset-glass")!;
  const chipText = () => chip()?.textContent;
  // The fade sits on the chip button itself (read by a rig as the chip's opacity).
  const slot = () => view.container.querySelector<HTMLElement>(".bonsai-preset-carousel-slot button")!;
  return { ...view, outside, chip, chipText, slot };
}

describe("a suggestion chip holding the ring keeps it when the chip changes question", () => {
  beforeEach(() => {
    setFrozenTestChips(["q1", "q2", "q3", "q4", "q5"]);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    setFrozenTestChips([]);
    document.body.innerHTML = "";
  });

  // Until plan 72 the static chip changed question under the ring and only the ring was kept. A
  // chip that changes under the ring takes a press meant for the words just read
  // (plan72-Z-FREEPLAY.json finding 4), so now it keeps its question while the ring is on it.
  it("static: the chip keeps its question and the ring while the ring is on it", () => {
    const row = renderOneChip("static");
    const button = row.chip();
    const first = row.chipText();
    act(() => button.focus());

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(row.chipText()).toBe(first);
    expect(button.isConnected).toBe(true);
    expect(row.chip()).toBe(button);
    expect(document.activeElement).toBe(button);
  });

  it("fade: the chip holding the ring does not fade out, and stays the ring's", () => {
    const row = renderOneChip("fade");
    act(() => {
      vi.advanceTimersByTime(2_000); // the first chip's stagger and fade-in
    });
    expect(row.slot().style.opacity).toBe("1");
    const button = row.chip();
    const first = row.chipText();
    act(() => button.focus());

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(button.isConnected).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(row.slot().style.opacity).toBe("1");
    expect(row.chipText()).toBe(first);
  });

  it("fade: once the ring leaves the chip, it fades and changes question again", () => {
    const row = renderOneChip("fade");
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    const first = row.chipText();
    act(() => row.chip().focus());
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    act(() => row.outside.focus());

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(row.chipText()).not.toBe(first);
  });
});
