import { beforeEach, describe, expect, it, vi } from "vitest";

const call = vi.hoisted(() => vi.fn());
vi.mock("../../shared/deckyCall", () => ({
  callDeckyWithTimeout: call,
  DECKY_RPC_TIMEOUT_MS: 1000,
  formatDeckyRpcError: (e: unknown) => String(e),
}));

import { fetchSessionRagChipCandidates } from "./sessionRagChipCandidates";

const raw = (text: string, domain = "strategy") => ({ text, category: "strategy", prefer_ask_mode: "strategy", domain });
const ask = () => fetchSessionRagChipCandidates({ appId: "1", appName: "Game" });

describe("fetchSessionRagChipCandidates: which chips the back end calls the closest (plan 104, lane C2)", () => {
  beforeEach(() => call.mockReset());

  it("marks the first closest_count chips as closest, and no others", async () => {
    call.mockResolvedValue({
      ok: true,
      closest_count: 2,
      candidates: [raw("G1"), raw("G2"), raw("G3"), raw("Proton?", "compat")],
    });
    const out = await ask();
    expect(out.map((c) => [c.text, c.closest === true])).toEqual([
      ["G1", true],
      ["G2", true],
      ["G3", false],
      ["Proton?", false],
    ]);
  });

  it("marks nothing when the count is 0, missing or not a number", async () => {
    for (const closest_count of [0, undefined, "3", -1, null]) {
      call.mockResolvedValue({ ok: true, closest_count, candidates: [raw("G1"), raw("G2")] });
      const out = await ask();
      expect(out.some((c) => c.closest), `closest_count ${String(closest_count)}`).toBe(false);
    }
  });

  it("never marks a shared Deck tip, even if the count runs past the game's chips", async () => {
    call.mockResolvedValue({ ok: true, closest_count: 4, candidates: [raw("G1"), raw("Proton?", "compat")] });
    const out = await ask();
    expect(out.map((c) => c.closest === true)).toEqual([true, false]);
  });
});
