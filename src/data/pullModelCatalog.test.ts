import { describe, expect, it } from "vitest";
import { PULL_MODEL_CATALOG } from "./pullModelCatalog";

// Sept 2026 bake-off additions to the Expert (large) group (docs/planning/41-deck-model-survey.md,
// D73): the models that beat today's Gemma 4 on the answer test, now offered for download.
describe("PULL_MODEL_CATALOG stretch (Expert large) additions", () => {
  const byTag = (tag: string) => PULL_MODEL_CATALOG.find((e) => e.tag === tag);

  it("adds the five bake-off candidates to the stretch group", () => {
    for (const tag of [
      "gemma4:12b-it-qat",
      "qwen3.5:9b",
      "granite4.2:8b",
      "gemma4:e4b-it-qat",
      "lfm2.5:8b",
    ]) {
      const entry = byTag(tag);
      expect(entry, `expected ${tag} in the catalog`).toBeDefined();
      expect(entry?.group).toBe("stretch");
    }
  });

  it("marks Gemma 4 12B, Qwen 3.5 9B, Granite 4.2 8B and Gemma 4 E4B open source", () => {
    expect(byTag("gemma4:12b-it-qat")?.licenseClass).toBe("foss");
    expect(byTag("qwen3.5:9b")?.licenseClass).toBe("foss");
    expect(byTag("granite4.2:8b")?.licenseClass).toBe("foss");
    expect(byTag("gemma4:e4b-it-qat")?.licenseClass).toBe("foss");
  });

  it("marks LFM 2.5 open-weight, not open source", () => {
    expect(byTag("lfm2.5:8b")?.licenseClass).toBe("open_weight");
  });

  it("uses honest download sizes from the roster (data/model_bakeoff/roster.json)", () => {
    expect(byTag("gemma4:12b-it-qat")?.sizeGb).toBe(7.2);
    expect(byTag("qwen3.5:9b")?.sizeGb).toBe(6.6);
    expect(byTag("granite4.2:8b")?.sizeGb).toBe(5.3);
    expect(byTag("gemma4:e4b-it-qat")?.sizeGb).toBe(6.1);
    expect(byTag("lfm2.5:8b")?.sizeGb).toBe(5.2);
  });
});
