import { describe, expect, it } from "vitest";
import {
  findCoverageGaps,
  recommendPullModelsForGaps,
  scorePullModelPerformance,
} from "./pullModelRecommendations";
import { PULL_MODEL_CATALOG } from "../data/pullModelCatalog";

describe("pullModelRecommendations", () => {
  it("scores smaller high-rated multimodal models higher", () => {
    const essentials = PULL_MODEL_CATALOG.find((e) => e.tag === "qwen2.5vl:3b")!;
    const qwen14 = PULL_MODEL_CATALOG.find((e) => e.tag === "qwen2.5:14b")!;
    expect(scorePullModelPerformance(essentials)).toBeGreaterThan(scorePullModelPerformance(qwen14));
  });

  it("treats essentials VLM as covering all roles", () => {
    const installed = new Set(["qwen2.5vl:3b"]);
    expect(findCoverageGaps(installed)).toEqual([]);
    expect(recommendPullModelsForGaps(installed, { limit: 1 })).toEqual([]);
  });

  it("recommends one pull when speed/vision gaps exist", () => {
    const installed = new Set(["deepseek-r1:1.5b"]);
    const gaps = findCoverageGaps(installed);
    expect(gaps).toContain("speed");
    expect(gaps).toContain("vision");
    const recs = recommendPullModelsForGaps(installed, { limit: 1 });
    expect(recs.length).toBe(1);
    expect(recs[0]?.tag).toBe("qwen2.5vl:3b");
  });
});
