/**
 * Title: The fade style's chip button itself fades before its words change
 * Purpose: Pin plan 82's Deck finding (plan82-P79-LONG-CHIPS-NOGAME.json): with the chips' style set
 *          to fade, the rig read the chip button every 100 ms for 120 s and its opacity was 1.00 at
 *          every read, through 32 word changes, so the words appeared to swap with no fade. The fade
 *          used to sit on a box around the button, which a read of the button never sees. These
 *          tests read the button's own opacity, the way the rig does, across every word change.
 * Used for: MainTabPresetAnimatedChipsInner (fade and static styles) in
 *           MainTabPresetAnimatedChips.tsx and PresetChipButton in presetChipButton.tsx.
 * Does not: Prove it on the Deck. The check this owes: Developer tab, "Preset suggestions" on fade,
 *           ring on the question box, read the chip buttons every 100 ms for 60 s; at every word
 *           change the button's opacity reads below 1.00 at least once in the 500 ms before, and the
 *           words never swap at opacity 1.00.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetAnimatedChips } from "./MainTabPresetAnimatedChips";
import { setFrozenTestChips, type PresetPrompt } from "../data/presets";

const seed = (text: string): PresetPrompt => ({ text, category: "general" });
const CHIPS = ["q1 one", "q2 two", "q3 three", "q4 four", "q5 five", "q6 six", "q7 seven"];

type Sample = { t: number; words: string[]; opacity: string[] };

function watchRow(mode: "fade" | "static", single: boolean, forMs: number): Sample[] {
  const view = render(
    <MainTabPresetAnimatedChips
      seeds={CHIPS.slice(0, 3).map(seed)}
      setUnifiedInput={vi.fn()}
      animationMode={mode}
      fadeAnimationEnabled={mode === "fade"}
      presetSingleChip={single}
    />,
  );
  const samples: Sample[] = [];
  for (let t = 0; t < forMs; t += 50) {
    act(() => {
      vi.advanceTimersByTime(50);
    });
    const buttons = Array.from(view.container.querySelectorAll<HTMLElement>("button.bonsai-preset-glass"));
    samples.push({
      t,
      words: buttons.map((b) => b.textContent ?? ""),
      opacity: buttons.map((b) => b.style.opacity),
    });
  }
  return samples;
}

/** Every moment a chip's words changed, with the button's opacity then and over the 500 ms before. */
function wordChanges(samples: Sample[]) {
  const found: { slot: number; at: number; opacityThen: string; lowBefore: boolean }[] = [];
  for (let n = 1; n < samples.length; n++) {
    samples[n]!.words.forEach((w, slot) => {
      const was = samples[n - 1]!.words[slot];
      // A chip that has not shown any words yet (first fade-in) is not a swap.
      if (!was || w === was) return;
      const window = samples.filter((s) => s.t > samples[n]!.t - 500 && s.t <= samples[n]!.t);
      found.push({
        slot,
        at: samples[n]!.t,
        opacityThen: samples[n]!.opacity[slot]!,
        lowBefore: window.some((s) => Number(s.opacity[slot]) < 1),
      });
    });
  }
  return found;
}

describe("the fade style: the chip button fades out before its words change", () => {
  beforeEach(() => {
    setFrozenTestChips(CHIPS);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    setFrozenTestChips([]);
    document.body.innerHTML = "";
  });

  for (const single of [true, false]) {
    it(`fade, ${single ? "one chip" : "two chips"}: at every word change the button's own opacity was below 1 in the 500 ms before, and is below 1 at the swap`, () => {
      const changes = wordChanges(watchRow("fade", single, 90_000));
      expect(changes.length).toBeGreaterThanOrEqual(4);
      for (const c of changes) {
        expect(c.lowBefore, `chip ${c.slot} at ${c.at} ms swapped without having faded`).toBe(true);
        expect(Number(c.opacityThen), `chip ${c.slot} at ${c.at} ms swapped at full opacity`).toBeLessThan(1);
      }
    });
  }

  it("fade: the new words come in from low opacity and reach full opacity", () => {
    const samples = watchRow("fade", true, 40_000);
    const values = samples.map((s) => Number(s.opacity[0]));
    expect(Math.min(...values)).toBeLessThan(1);
    expect(Math.max(...values)).toBe(1);
  });

  it("static: the button's opacity stays 1 across every swap, so a swap is instant", () => {
    const samples = watchRow("static", false, 90_000);
    expect(wordChanges(samples).length).toBeGreaterThanOrEqual(4);
    for (const s of samples) for (const o of s.opacity) expect(o).toBe("1");
  });
});
