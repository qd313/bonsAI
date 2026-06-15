import { describe, expect, it } from "vitest";
import { PULL_MODEL_CATALOG } from "../data/pullModelCatalog";
import { mergePullModelCatalog } from "./mergePullModelCatalog";

describe("mergePullModelCatalog", () => {
  it("returns bundled catalog when overlay is empty", () => {
    const merged = mergePullModelCatalog(PULL_MODEL_CATALOG, null);
    expect(merged.length).toBe(PULL_MODEL_CATALOG.length);
    expect(merged[0]?.tag).toBe(PULL_MODEL_CATALOG[0]?.tag);
  });

  it("adds overlay-only entries", () => {
    const merged = mergePullModelCatalog(PULL_MODEL_CATALOG, {
      entries: [
        {
          tag: "qwen3:2b",
          params: "2B",
          sizeGb: 1.6,
          releasedYm: "2025-04",
          license: "Apache 2.0",
          licenseClass: "foss",
          group: "smallest",
          tags: ["chat", "strategy"],
          rating: 5,
          blurb: "Overlay-only model.",
        },
      ],
      removed_tags: [],
      overrides: {},
    });
    expect(merged.some((e) => e.tag === "qwen3:2b")).toBe(true);
    expect(merged.length).toBe(PULL_MODEL_CATALOG.length + 1);
  });

  it("removes tags listed in removed_tags", () => {
    const merged = mergePullModelCatalog(PULL_MODEL_CATALOG, {
      entries: [],
      removed_tags: ["qwen2.5:1.5b"],
      overrides: {},
    });
    expect(merged.some((e) => e.tag === "qwen2.5:1.5b")).toBe(false);
    expect(merged.length).toBe(PULL_MODEL_CATALOG.length - 1);
  });

  it("applies partial overrides on bundled entries", () => {
    const merged = mergePullModelCatalog(PULL_MODEL_CATALOG, {
      entries: [],
      removed_tags: [],
      overrides: {
        "gemma4:latest": { rating: 5, blurb: "Patched blurb for tests." },
      },
    });
    const gemma = merged.find((e) => e.tag === "gemma4:latest");
    expect(gemma?.rating).toBe(5);
    expect(gemma?.blurb).toBe("Patched blurb for tests.");
  });

  it("rejects invalid overlay entries", () => {
    const merged = mergePullModelCatalog(PULL_MODEL_CATALOG, {
      entries: [
        {
          tag: "NOT VALID TAG",
          params: "1B",
          sizeGb: 1,
          releasedYm: "2025-01",
          license: "MIT",
          licenseClass: "foss",
          group: "smallest",
          tags: ["chat"],
          rating: 3,
          blurb: "bad",
        } as never,
      ],
      removed_tags: [],
      overrides: {},
    });
    expect(merged.length).toBe(PULL_MODEL_CATALOG.length);
  });
});
