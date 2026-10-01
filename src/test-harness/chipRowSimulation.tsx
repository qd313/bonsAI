/**
 * Title: Chip row simulation
 * Purpose: Run the real suggestion chip row, in any of its four styles, for a stretch of simulated
 *          time and record every chip it shows, with the time it appeared and whether it carries the
 *          game's Tip badge. It is the level the Deck check looks at: chips a minute, how many are
 *          the game's own, whether two general chips ever run back to back.
 * Used for: MainTabPresetAnimatedChips.simulation.test.tsx.
 * Does not: Prove anything on the Deck. Time is fake, the random source is seeded, and the chips are
 *           read off the drawn row (the Tip badge decides "the game's own"), not off internal state.
 */
import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import { MainTabPresetAnimatedChips } from "../components/MainTabPresetAnimatedChips";
import type { PresetPrompt } from "../data/presets";
import { setSessionRagCarouselCandidates } from "../features/preset-carousel/composePresetSeedsWithSessionRag";
import type { SessionRagChipCandidate } from "../features/preset-carousel/sessionRagComposer";

export type ChipStyle = "fade" | "carousel" | "static" | "decode";
export type ChipEvent = { t: number; spot: number; text: string; game: boolean };
export type ChipSimulation = {
  /** Every chip that appeared, in order (the chips on screen at the start are events at t = 0). */
  events: ChipEvent[];
  /** At each sample, how many of the chips on screen were the game's own. */
  gameOnScreen: { t: number; count: number; total: number }[];
};

const SAMPLE_MS = 100;

/** Small seeded generator, so a run is the same every time. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Eight game chips and two shared Deck tips, as the back end offers them (game chips first). */
function gameCandidates(count = 6): SessionRagChipCandidate[] {
  const game = Array.from({ length: count }, (_, i) => ({
    text: `How do I beat boss number ${i + 1}?`,
    category: "strategy",
    preferAskMode: "strategy" as const,
    domain: "strategy",
  }));
  return [
    ...game,
    { text: "Any known Proton issues for this game?", category: "troubleshooting", domain: "compat" },
    { text: "Any Steam Input issues for this game?", category: "troubleshooting", domain: "compat" },
  ];
}

/** The three opening chips as the composer deals them: a general chip first, then the game's own. */
function openingSeeds(): PresetPrompt[] {
  return [
    { text: "What are the best settings for 60fps?", category: "performance" },
    { text: "How do I beat boss number 1?", category: "strategy", ragTip: true, preferAskMode: "strategy" },
    { text: "How do I fix stuttering?", category: "performance" },
  ];
}

function readSpots(container: HTMLElement, style: ChipStyle): { text: string; game: boolean; resolved: boolean }[] {
  const slots = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-preset-carousel-slot"));
  const shown = style === "carousel" ? slots.filter((s) => s.getAttribute("data-bonsai-preset-visible") === "true") : slots;
  return shown.map((slot) => ({
    text: slot.querySelector("button")?.textContent ?? "",
    game: slot.querySelector(".bonsai-preset-chip-tip-badge") !== null,
    // Decode draws scrambled letters until a chip has settled, so only its settled text is a name.
    resolved: slot.querySelector(".bonsai-preset-chip-text--churn") === null,
  }));
}

export function simulateChipRow(opts: {
  style: ChipStyle;
  single: boolean;
  minutes: number;
  seed: number;
  candidates?: SessionRagChipCandidate[];
  seeds?: PresetPrompt[];
}): ChipSimulation {
  const { style, single, minutes, seed } = opts;
  const candidates = opts.candidates ?? gameCandidates();
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  const random = vi.spyOn(Math, "random").mockImplementation(seededRandom(seed));
  setSessionRagCarouselCandidates(candidates);
  const view = render(
    <MainTabPresetAnimatedChips
      seeds={opts.seeds ?? openingSeeds()}
      setUnifiedInput={vi.fn()}
      animationMode={style}
      fadeAnimationEnabled={style === "fade"}
      useLocalKnowledgeBase
      presetSingleChip={single}
    />,
  );

  const events: ChipEvent[] = [];
  const gameOnScreen: ChipSimulation["gameOnScreen"] = [];
  let previous: string[] = [];
  const pendingChurn = new Set<number>();
  const churnStart = new Map<number, number>();
  try {
    for (let t = 0; t <= minutes * 60_000; t += SAMPLE_MS) {
      const spots = readSpots(view.container, style);
      const settled = spots.filter((s) => s.resolved);
      gameOnScreen.push({ t, count: settled.filter((s) => s.game).length, total: settled.length });
      if (style === "carousel") {
        // The carousel's window slides along its history: a chip is new when it was not on screen
        // a moment ago, wherever in the window it now sits.
        spots.forEach((spot, i) => {
          if (!previous.includes(spot.text)) events.push({ t, spot: i, text: spot.text, game: spot.game });
        });
        previous = spots.map((s) => s.text);
      } else {
        spots.forEach((spot, i) => {
          if (!spot.resolved) {
            if (!pendingChurn.has(i)) {
              pendingChurn.add(i);
              churnStart.set(i, t);
            }
            return;
          }
          const wasChurning = pendingChurn.delete(i);
          if (previous[i] !== spot.text || wasChurning) {
            events.push({ t: wasChurning ? (churnStart.get(i) ?? t) : t, spot: i, text: spot.text, game: spot.game });
          }
          previous[i] = spot.text;
        });
      }
      act(() => {
        vi.advanceTimersByTime(SAMPLE_MS);
      });
    }
  } finally {
    view.unmount();
    random.mockRestore();
    setSessionRagCarouselCandidates([]);
    vi.useRealTimers();
  }
  return { events, gameOnScreen };
}
