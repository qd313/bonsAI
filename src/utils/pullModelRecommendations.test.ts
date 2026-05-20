import { describe, expect, it } from "vitest";
import {
  findCoverageGaps,
  recommendPullModelsForGaps,
  scorePullModelPerformance,
} from "./pullModelRecommendations";
import { PULL_MODEL_CATALOG } from "../data/pullModelCatalog";

describe("pullModelRecommendations", () => {
  it("scores smaller high-rated multimodal models higher", () => {
    const gemma4 = PULL_MODEL_CATALOG.find((e) => e.tag === "gemma4:4b")!;
    const qwen14 = PULL_MODEL_CATALOG.find((e) => e.tag === "qwen2.5:14b")!;
    expect(scorePullModelPerformance(gemma4)).toBeGreaterThan(scorePullModelPerformance(qwen14));
  });

  it("recommends pulls when speed/vision gaps exist", () => {
    const installed = new Set(["deepseek-r1:1.5b"]);
    const gaps = findCoverageGaps(installed);
    expect(gaps).toContain("speed");
    expect(gaps).toContain("vision");
    const recs = recommendPullModelsForGaps(installed, { limit: 3 });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((e) => !installed.has(e.tag))).toBe(true);
  });
});
