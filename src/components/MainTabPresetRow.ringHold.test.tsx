/**
 * Title: The suggestion chips hold still while Steam's ring is on them
 * Purpose: Pin the fix for plan 72 free play, finding 4 (docs/test-evidence/plan72-Z-FREEPLAY.json):
 *          the driver read "Why is my Deck running hot?" with the ring on it, pressed A about 2 s
 *          later, and got "Recommended TDP for this game?" -- the chip had changed under the ring
 *          (decode style, scrambled letters on it). Roadmap: "a rotating suggestion chip can take a
 *          press meant for a different chip". While the ring is anywhere in the chip row, no style
 *          starts a new chip change; the row resumes once the ring leaves.
 * Used for: MainTabPresetRow and every chip style, through usePresetRowNav's rowHeld().
 * Does not: Prove it on the Deck. The ring is Steam's `.gpfocus` class here, the same marker
 *           elementHasGamepadFocus reads on device, never DOM focus.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetRow } from "./MainTabPresetRow";
import { setFrozenTestChips, type PresetPrompt } from "../data/presets";
import { resetFakeDeckyRpc } from "../test-harness/fakeDeckyRpc";

type Mode = "fade" | "static" | "carousel" | "decode";
const MODES: readonly Mode[] = ["fade", "static", "carousel", "decode"];

const seed = (text: string): PresetPrompt => ({ text, category: "general" });
const seeds = [seed("q1"), seed("q2"), seed("q3")];

function renderRow(mode: Mode) {
  const setUnifiedInput = vi.fn();
  const view = render(
    <MainTabPresetRow
      suggestedPrompts={seeds}
      showPluginHelpChip={false}
      onOpenPluginHelp={vi.fn()}
      presetChipAnimation={mode}
      setUnifiedInput={setUnifiedInput}
      isAsking={false}
      focusUnifiedTextField={() => false}
      presetCarouselHostRef={React.createRef<HTMLDivElement | null>()}
    />,
  );
  /** The first chip that is a focus stop right now (a carousel keeps off-window chips rendered). */
  const firstStop = () =>
    view.container.querySelector<HTMLElement>(
      '[data-bonsai-preset-visible="true"] button.bonsai-preset-glass',
    )!;
  return { ...view, setUnifiedInput, firstStop };
}

/** Everything that moves on screen: the words, each chip button's opacity, and the carousel's window. */
function frame(container: HTMLElement): string {
  const slots = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-preset-carousel-slot"));
  const track = container.querySelector<HTMLElement>(".bonsai-preset-carousel-track");
  return JSON.stringify({
    text: container.textContent,
    opacity: slots.map((s) => s.querySelector<HTMLElement>("button")?.style.opacity),
    window: track?.style.getPropertyValue("--bonsai-preset-window-start") ?? null,
  });
}

function distinctFramesOver(container: HTMLElement, ms: number): number {
  const seen = new Set<string>([frame(container)]);
  for (let t = 0; t < ms; t += 250) {
    act(() => {
      vi.advanceTimersByTime(250);
    });
    seen.add(frame(container));
  }
  return seen.size;
}

describe("MainTabPresetRow: the chips hold still while the ring is on them", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    setFrozenTestChips(["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    setFrozenTestChips([]);
    document.body.innerHTML = "";
  });

  for (const mode of MODES) {
    it(`${mode}: no chip changes while the ring is on a chip, A takes the words shown, and it resumes after`, () => {
      const row = renderRow(mode);
      act(() => {
        vi.advanceTimersByTime(3_000);
      });

      // Steam puts its ring on the first chip. Anything already under way may finish.
      const chip = row.firstStop();
      chip.classList.add("gpfocus");
      act(() => {
        vi.advanceTimersByTime(6_000);
      });

      // Several hold times (at least 8 s each) and carousel steps (5.8 s).
      expect(distinctFramesOver(row.container, 30_000), `${mode}: the row moved under the ring`).toBe(1);

      // A lands on the words the chip is showing.
      const shown = chip.textContent ?? "";
      expect(shown.trim()).not.toBe("");
      fireEvent.click(chip);
      expect(row.setUnifiedInput).toHaveBeenLastCalledWith(expect.stringContaining(shown.trim()));

      // The ring leaves the row: the chips start again.
      chip.classList.remove("gpfocus");
      const elsewhere = document.createElement("button");
      elsewhere.className = "gpfocus";
      document.body.appendChild(elsewhere);
      expect(distinctFramesOver(row.container, 20_000), `${mode}: the row never resumed`).toBeGreaterThan(1);
    });
  }
});
