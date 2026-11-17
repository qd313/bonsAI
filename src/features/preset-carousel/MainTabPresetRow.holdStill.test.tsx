/**
 * The suggestion chips hold still while an answer is being written (plan 72, roadmap "The
 * suggestion chips keep rotating and animating while a question is being answered", found by
 * plan 70's helper S). While `isAsking` is true the panel is busy and a chip that changes under
 * the ring can take a press meant for another, so no mode may start a new chip change; one
 * already under way finishes. They start again once the answer finishes or is stopped (the
 * `isAsking` true -> false edge, which also restarts the walk from the reseeded chips -- D58 #3).
 *
 * Driven through the real MainTabPresetRow and the real chips, with fake timers, so the wiring
 * from `isAsking` down to each mode's own timer is what is tested, not a stub.
 *
 * Also pins that every mode keeps rotating for as long as the row is mounted. Until plan 72 each
 * mode rested one minute after mounting (`PRESET_CAROUSEL_ACTIVE_MS`, by design since
 * 2026-04-15); the maintainer dropped the rest, and this test used to pin it.
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetRow } from "./MainTabPresetRow";
import { setFrozenTestChips, type PresetPrompt } from "./presets";
import { resetFakeDeckyRpc } from "../../test-harness/fakeDeckyRpc";
import { stubReducedMotion } from "../../test-harness/reducedMotion";

/* The row has two looks: plain swaps when the system asks for less motion, decode otherwise (plan 105). */
type Mode = "static" | "decode";
const MODES: readonly Mode[] = ["static", "decode"];

const seed = (text: string): PresetPrompt => ({ text, category: "general" });
const seeds = [seed("q1"), seed("q2"), seed("q3")];

function row(mode: Mode, isAsking: boolean) {
  stubReducedMotion(mode === "static");
  return (
    <MainTabPresetRow
      suggestedPrompts={seeds}
      showPluginHelpChip={false}
      onOpenPluginHelp={vi.fn()}
      setUnifiedInput={vi.fn()}
      isAsking={isAsking}
      focusUnifiedTextField={() => false}
      presetCarouselHostRef={React.createRef<HTMLDivElement | null>()}
    />
  );
}

/** Everything that moves on screen: the words and each chip button's opacity. */
function frame(container: HTMLElement): string {
  const slots = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-preset-carousel-slot"));
  return JSON.stringify({
    text: container.textContent,
    opacity: slots.map((s) => s.querySelector<HTMLElement>("button")?.style.opacity),
  });
}

/** How many different frames showed while `ms` passed, sampled every 250 ms. */
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

describe("MainTabPresetRow: the chips hold still while an answer is written", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    setFrozenTestChips(["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setFrozenTestChips([]);
  });

  for (const mode of MODES) {
    it(`${mode}: no chip changes or animates while an answer arrives, and rotation resumes after`, () => {
      const { container, rerender } = render(row(mode, false));
      act(() => {
        vi.advanceTimersByTime(3_000);
      });

      // The question is sent. Anything already under way may finish (a fade out and in is 3 s).
      rerender(row(mode, true));
      act(() => {
        vi.advanceTimersByTime(6_000);
      });

      // The row would otherwise have changed several times in this window.
      expect(distinctFramesOver(container, 40_000), `${mode}: the row moved while answering`).toBe(1);

      // The answer finishes (or is stopped): the chips start again.
      rerender(row(mode, false));
      expect(distinctFramesOver(container, 20_000), `${mode}: the row never resumed`).toBeGreaterThan(1);
    });
  }

  for (const mode of MODES) {
    it(`${mode}: left idle, the row keeps rotating minute after minute`, () => {
      const { container } = render(row(mode, false));
      for (let minute = 1; minute <= 6; minute++) {
        expect(distinctFramesOver(container, 60_000), `${mode}: no change in minute ${minute}`).toBeGreaterThan(1);
      }
    });
  }
});
