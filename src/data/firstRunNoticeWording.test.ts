/**
 * Guards the words a new player reads in their first minutes against claims that stopped being true.
 * bonsAI stopped changing the power limit on 2026-07-30 and the "Adjust power limits" switch went with it,
 * and the local-runtime notice must name the real tab and section.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf-8");
const gates = read("hooks/useDisclaimerAndLocalRuntimeGates.tsx");
const quickStart = read("data/pluginQuickStartInstructions.tsx");

describe("first-run notice wording", () => {
  it("never claims bonsAI changes hardware settings", () => {
    expect(gates).not.toMatch(/modifies system hardware/i);
    expect(gates).not.toMatch(/TDP and performance changes/i);
  });

  it("never points at the removed Adjust power limits switch", () => {
    expect(quickStart).not.toMatch(/Adjust power limits/i);
    expect(gates).not.toMatch(/Adjust power limits/i);
  });

  it("local-runtime notice names the Ollama tab and Where AI runs", () => {
    expect(gates).not.toMatch(/Under Connection/);
    expect(gates).not.toMatch(/Ollama on Deck in Settings/);
    expect(gates).toMatch(/under Where AI runs/);
    expect(gates).toMatch(/Run AI on this Deck on the Ollama tab/);
  });
});
