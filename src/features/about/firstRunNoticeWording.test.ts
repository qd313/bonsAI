/**
 * Guards the words a new player reads in their first minutes against claims that stopped being true.
 * bonsAI stopped changing the power limit on 2026-07-30 and the "Adjust power limits" switch went with it,
 * and the where-the-AI-runs popup must name the real tab and switch.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { findSrcFile } from "../../test-harness/repoPaths";

const read = (name: string) => readFileSync(findSrcFile(name), "utf-8");
const gates = read("useDisclaimerAndLocalRuntimeGates.tsx");
const popup = read("FirstRunWhereAiRunsModal.tsx");
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

  it("the where-the-AI-runs popup names the Ollama tab and the real switch", () => {
    expect(popup).not.toMatch(/Under Connection/);
    expect(popup).not.toMatch(/Ollama on Deck in Settings/);
    // Plan 96 N1 replaced the Local runtime notice: the popup says where to change it later, and names the switch.
    expect(popup).toMatch(/You can change this later on the Ollama tab/);
    expect(popup).toMatch(/Run AI on this Deck/);
    expect(gates).not.toMatch(/strTitle="bonsAI - Local runtime/);
  });

  it("no first-run notice names the old starter model or its old size", () => {
    expect(gates).not.toMatch(/qwen2\.5vl/i);
    expect(gates).not.toMatch(/3–4 GiB/);
    expect(gates).not.toMatch(/TIER1_ESSENTIALS_TAG/);
    expect(popup).not.toMatch(/qwen2\.5vl/i);
    expect(popup).not.toMatch(/3–4 GiB/);
  });
});
