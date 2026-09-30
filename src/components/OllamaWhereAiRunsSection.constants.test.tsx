import { describe, expect, it } from "vitest";
import { LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB } from "./OllamaWhereAiRunsSection.constants";

// Licence labels pass (plan 77): the default picture model's 3B size is under Qwen's own
// licence on Qwen's card, so the Tier 1 essentials line must not call it "FOSS".
describe("Tier 1 essentials size line", () => {
  it("does not call the download FOSS", () => {
    expect(LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB).not.toMatch(/FOSS/i);
    expect(LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB).toMatch(/multimodal/);
  });
});
