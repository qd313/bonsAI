/**
 * Title: The chip row after the Deck's two Dreadnought questions, from the back end's real answer
 * Purpose: Pin P104-CHIPS-CLOSEST-01 as the Deck measured it (block D1b, 2026-11-16, Deep Rock
 *          Galactic: Survivor). The two payloads below are what the real back end sends for the two
 *          questions, made from the shipped library by the same function the plugin calls (copied here
 *          as data; regenerate them if the library's notes for that game change). The Deck's second try
 *          had ONE clearly close note, so the row opened on it and an ordinary chip, and the second note
 *          came seven seconds late. The back end now pairs a lone close note with the next nearest, so
 *          the payload says 2 and the row opens on both.
 * Used for: plan 104, lane C2 fix round.
 * Does not: Prove the Deck, which times it from the end of the answer with a recording.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const call = vi.hoisted(() => vi.fn());
vi.mock("../../shared/deckyCall", () => ({
  callDeckyWithTimeout: call,
  DECKY_RPC_TIMEOUT_MS: 1000,
  formatDeckyRpcError: (e: unknown) => String(e),
}));

import { fetchSessionRagChipCandidates } from "./sessionRagChipCandidates";
import { setFrozenTestChips } from "./presets";
import { composeSessionPresets } from "./sessionRagComposer";
import { simulateChipRow, type ChipStyle } from "../../test-harness/chipRowSimulation";

const FIRST_QUESTION = {
  ok: true,
  reason: "",
  closest_count: 4,
  candidates: [
    { text: "How do I beat Glyphid Dreadnought?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I beat Dreadnought Twins?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I deal with Exploder?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I deal with Acid Spitter?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "Tips for Hollow Bough in this game?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I use Red Sugar?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "What should I know about Mining and the run timer?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I deal with Praetorian?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I use Nitra?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "What should I know about Classes?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "Any known Proton issues for this game?", category: "troubleshooting", prefer_ask_mode: null, domain: "compat" },
    { text: "Any Steam Input issues for this game?", category: "troubleshooting", prefer_ask_mode: null, domain: "compat" },
  ],
};

const SECOND_QUESTION = {
  ok: true,
  reason: "",
  closest_count: 2,
  candidates: [
    { text: "How do I beat Dreadnought Twins?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I beat Glyphid Dreadnought?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "Tips for Hollow Bough in this game?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I deal with Exploder?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I use Red Sugar?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "What should I know about Mining and the run timer?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I deal with Praetorian?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I use Nitra?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "What should I know about Classes?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "How do I deal with Acid Spitter?", category: "strategy", prefer_ask_mode: "strategy", domain: "strategy" },
    { text: "Any known Proton issues for this game?", category: "troubleshooting", prefer_ask_mode: null, domain: "compat" },
    { text: "Any Steam Input issues for this game?", category: "troubleshooting", prefer_ask_mode: null, domain: "compat" },
  ],
};

/** The ordinary chips the screen draws after a strategy answer, as on the Deck ("How do I get past this part?"). */
const STATIC_SEEDS = [
  { text: "How do I get past this part?", category: "strategy" },
  { text: "What should I know about Mining and the run timer?", category: "strategy" },
  { text: "Any Steam Input issues for this game?", category: "troubleshooting" },
];

const STYLES: ChipStyle[] = ["fade", "carousel", "static", "decode"];

beforeEach(() => call.mockReset());
afterEach(() => setFrozenTestChips([]));

describe.each(STYLES)("%s style, the Deck's Deep Rock Galactic: Survivor answers", (style) => {
  it.each([
    { name: "second try (one clear note)", payload: SECOND_QUESTION, first: ["How do I beat Dreadnought Twins?", "How do I beat Glyphid Dreadnought?"] },
    {
      name: "first try (four close notes)",
      payload: FIRST_QUESTION,
      first: ["How do I beat Glyphid Dreadnought?", "How do I beat Dreadnought Twins?"],
    },
  ])("$name: both chips on screen are the question's notes within five seconds", async ({ payload, first }) => {
    call.mockResolvedValue(payload);
    const candidates = await fetchSessionRagChipCandidates({ appId: "2321470", appName: "Deep Rock Galactic: Survivor" });
    const seeds = composeSessionPresets({ staticSeeds: STATIC_SEEDS, ragCandidates: candidates, random: () => 0.99 });
    const { events } = simulateChipRow({ style, single: false, minutes: 1, seed: 7, candidates, seeds });
    const byTime = [...events].sort((a, b) => a.t - b.t);
    expect(byTime.slice(0, 2).map((e) => e.text)).toEqual(first);
    expect(byTime[1]!.t).toBeLessThanOrEqual(5_000);
  }, 120_000);
});
