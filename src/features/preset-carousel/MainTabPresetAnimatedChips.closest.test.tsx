/**
 * Title: The chip row right after an answer, in every style
 * Purpose: Pin what the Deck check P104-CHIPS-CLOSEST-01 looks at, with fake time and a seeded random
 *          source: after an answer that came with closest chips (the back end sends at most four, fewer
 *          when few notes are close), the chips the row shows first, across its spots, are those closest
 *          chips in the back end's order, with the opening row composed the way the screen composes it.
 *          After them the usual rule runs. Without any closest chips nothing is changed, which the
 *          existing chip row simulation pins.
 * Used for: plan 104, lane C2 (the chips keep the closest notes in front; roadmap row P103-CHIP-ORDER-01).
 * Does not: Prove the Deck; the check does that, with a recording.
 */
import { afterEach, describe, expect, it } from "vitest";
import { setFrozenTestChips } from "./presets";
import { composeSessionPresets, type SessionRagChipCandidate } from "./sessionRagComposer";
import { simulateChipRow, type ChipStyle } from "../../test-harness/chipRowSimulation";

const STYLES: ChipStyle[] = ["static", "decode"];

const game = (text: string, closest?: true): SessionRagChipCandidate => ({
  text,
  category: "strategy",
  preferAskMode: "strategy",
  domain: "strategy",
  ...(closest ? { closest } : {}),
});

/** What the back end could send: `count` closest chips first (never more than four), then today's order, then tips. */
function afterAnAnswer(count: number): SessionRagChipCandidate[] {
  return [
    ...Array.from({ length: count }, (_, i) => game(`How do I beat Closest ${i + 1}?`, true)),
    ...Array.from({ length: 6 }, (_, i) => game(`How do I get through Other ${i + 1}?`)),
    { text: "Any known Proton issues for this game?", category: "troubleshooting", domain: "compat" },
  ];
}

/** The opening row as the screen composes it from three ordinary static chips, every roll losing. */
function openingRow(candidates: SessionRagChipCandidate[]) {
  return composeSessionPresets({
    staticSeeds: [
      { text: "What are the best settings for 60fps?", category: "performance" },
      { text: "How do I fix stuttering?", category: "performance" },
      { text: "Why is my Deck running hot?", category: "thermal" },
    ],
    ragCandidates: candidates,
    random: () => 0.99,
  });
}

afterEach(() => setFrozenTestChips([]));

describe.each(STYLES)("%s style right after an answer", (style) => {
  it.each([
    { count: 4, single: false },
    { count: 4, single: true },
    { count: 2, single: false },
    { count: 2, single: true },
  ])("$count closest chips, single chip $single: they are the first chips shown, in order", ({ count, single }) => {
    const candidates = afterAnAnswer(count);
    const { events } = simulateChipRow({
      style,
      single,
      minutes: 1,
      seed: 11,
      candidates,
      seeds: openingRow(candidates),
    });
    const shown = [...events].sort((a, b) => a.t - b.t).map((e) => e.text);
    expect(shown.slice(0, count), `${style}: ${shown.slice(0, 6).join(" | ")}`).toEqual(
      Array.from({ length: count }, (_, i) => `How do I beat Closest ${i + 1}?`),
    );
    // No closest chip comes round a second time before the rest have had a turn.
    expect(new Set(shown.slice(0, count)).size).toBe(count);
    // About half a minute in all: the last of them is on screen within 45 seconds of the answer.
    const byTime = [...events].sort((a, b) => a.t - b.t).slice(0, count);
    expect(byTime[byTime.length - 1]!.t).toBeLessThanOrEqual(45_000);
  }, 120_000);
});
