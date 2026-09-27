/**
 * The suggestion chips hold still while an answer is being written (plan 72, roadmap "The
 * suggestion chips keep rotating and animating while a question is being answered", found by
 * plan 70's helper S). While `isAsking` is true the panel is busy and a chip that changes under
 * the ring can take a press meant for another, so no mode may start a new chip change; one
 * already under way finishes. They start again once the answer finishes or is stopped (the
 * `isAsking` true -> false edge, which also restarts the one-minute walk -- D58 #3).
 *
 * Driven through the real MainTabPresetRow and the real chips, with fake timers, so the wiring
 * from `isAsking` down to each mode's own timer is what is tested, not a stub.
 *
 * Also pins the designed stop (`PRESET_CAROUSEL_ACTIVE_MS`): every mode rotates for one minute
 * after the row mounts or an Ask completes, then rests. That is by design since 2026-04-15, not
 * a fault -- see the report for plan 72 lane 11.
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainTabPresetRow } from "./MainTabPresetRow";
import { setFrozenTestChips, type PresetPrompt } from "../data/presets";
import { PRESET_CAROUSEL_ACTIVE_MS } from "../features/preset-carousel/presetChipShared";
import { resetFakeDeckyRpc } from "../test-harness/fakeDeckyRpc";

type Mode = "fade" | "static" | "carousel" | "decode";
const MODES: readonly Mode[] = ["fade", "static", "carousel", "decode"];

const seed = (text: string): PresetPrompt => ({ text, category: "general" });
const seeds = [seed("q1"), seed("q2"), seed("q3")];

function row(mode: Mode, isAsking: boolean) {
  return (
    <MainTabPresetRow
      suggestedPrompts={seeds}
      showPluginHelpChip={false}
      onOpenPluginHelp={vi.fn()}
      presetChipAnimation={mode}
      setUnifiedInput={vi.fn()}
      isAsking={isAsking}
      focusUnifiedTextField={() => false}
      presetCarouselHostRef={React.createRef<HTMLDivElement | null>()}
    />
  );
}

/** Everything that moves on screen: the words, each slot's opacity, and the carousel's window. */
function frame(container: HTMLElement): string {
  const slots = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-preset-carousel-slot"));
  const track = container.querySelector<HTMLElement>(".bonsai-preset-carousel-track");
  return JSON.stringify({
    text: container.textContent,
    opacity: slots.map((s) => s.style.opacity),
    window: track?.style.getPropertyValue("--bonsai-preset-window-start") ?? null,
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

      // Still well inside the one-minute walk, so a stop here is the hold, not the designed rest.
      expect(distinctFramesOver(container, 40_000), `${mode}: the row moved while answering`).toBe(1);

      // The answer finishes (or is stopped): the chips start again.
      rerender(row(mode, false));
      expect(distinctFramesOver(container, 20_000), `${mode}: the row never resumed`).toBeGreaterThan(1);
    });
  }

  for (const mode of MODES) {
    it(`${mode}: left idle, the row rotates for its one minute and then rests (by design)`, () => {
      const { container } = render(row(mode, false));
      expect(distinctFramesOver(container, 30_000), `${mode}: no rotation in the first half minute`).toBeGreaterThan(1);
      act(() => {
        vi.advanceTimersByTime(PRESET_CAROUSEL_ACTIVE_MS);
      });
      expect(distinctFramesOver(container, 180_000), `${mode}: still rotating after the minute`).toBe(1);
    });
  }
});
