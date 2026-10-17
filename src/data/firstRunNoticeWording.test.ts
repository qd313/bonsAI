/**
 * Guards the words a new player reads in their first minutes against claims that stopped being true.
 * bonsAI stopped changing the power limit on 2026-07-30 and the "Adjust power limits" switch went with it,
 * and the local-runtime notice must name the real tab and section.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { findSrcFile } from "../test-harness/repoPaths";

const read = (name: string) => readFileSync(findSrcFile(name), "utf-8");
const gates = read("useDisclaimerAndLocalRuntimeGates.tsx");
const quickStart = read("pluginQuickStartInstructions.tsx");

describe("first-run notice wording", () => {
  it("never claims bonsAI changes hardware settings", () => {
    expect(gates).not.toMatch(/modifies system hardware/i);
    expect(gates).not.toMatch(/TDP and performance changes/i);
  });

  it("never points at the removed Adjust power limits switch", () => {
    expect(quickStart).not.toMatch(/Adjust power limits/i);
    expect(gates).not.toMatch(/Adjust power limits/i);
  });

  it("local-runtime notice names the Ollama tab and the real switch", () => {
    expect(gates).not.toMatch(/Under Connection/);
    expect(gates).not.toMatch(/Ollama on Deck in Settings/);
    // Plan 93 lane B9 cut the notice to 40 words: it points at the switch and the tab, no section.
    expect(gates).toMatch(/turn off Run AI on this Deck \(Ollama tab\)/);
  });

  it("no first-run notice names the old starter model or its old size", () => {
    expect(gates).not.toMatch(/qwen2\.5vl/i);
    expect(gates).not.toMatch(/3–4 GiB/);
    expect(gates).not.toMatch(/TIER1_ESSENTIALS_TAG/);
  });
});
