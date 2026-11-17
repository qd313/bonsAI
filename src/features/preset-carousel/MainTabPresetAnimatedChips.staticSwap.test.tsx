/**
 * Title: The static look swaps a chip's words at once, with nothing fading
 * Purpose: Keep what the old fade-style test also pinned for the static look (plan 82's Deck finding read the
 *          chip button itself, every 50 ms, across every word change): the button never carries an opacity of its
 *          own (it reads as full), so a swap is instant. The fade look itself is gone (plan 105), and with it the rest of
 *          that test.
 * Used for: MainTabPresetPlainSlots in MainTabPresetAnimatedChips.tsx and PresetChipButton in presetChipButton.tsx.
 * Does not: Prove it on the Deck; the static look is only drawn when the system asks for less motion.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import { setFrozenTestChips, type PresetPrompt } from "./presets";

const seed = (text: string): PresetPrompt => ({ text, category: "general" });
const CHIPS = ["q1 one", "q2 two", "q3 three", "q4 four", "q5 five", "q6 six", "q7 seven"];

describe("the static look: the chip button swaps its words at once", () => {
  beforeEach(() => {
    setFrozenTestChips(CHIPS);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    setFrozenTestChips([]);
    document.body.innerHTML = "";
  });

  it("the button never gets an opacity of its own across every swap, and the words do change", () => {
    const view = render(
      <MainTabPresetAnimatedChips seeds={CHIPS.slice(0, 3).map(seed)} setUnifiedInput={vi.fn()} animationMode="static" />,
    );
    const seen = new Set<string>();
    for (let t = 0; t < 90_000; t += 50) {
      act(() => {
        vi.advanceTimersByTime(50);
      });
      for (const b of Array.from(view.container.querySelectorAll<HTMLElement>("button.bonsai-preset-glass"))) {
        seen.add(b.textContent ?? "");
        expect(b.style.opacity).toBe("");
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
