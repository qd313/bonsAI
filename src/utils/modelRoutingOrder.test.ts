/**
 * Covers `modelSizeWarning`, added for the roadmap bug found while explaining the code
 * 2026-09-15: a model that is neither on the known-heavy list nor has a listed size read as
 * "safe" in the try-order picker, with no warning of any kind. `isHighVramTag` itself is
 * untouched -- it still decides what actually gets skipped at Ask time -- this only adds a
 * separate "unknown" reading for anything that displays a warning to a person.
 */
import { describe, expect, it } from "vitest";
import { isHighVramTag, modelSizeWarning } from "./modelRoutingOrder";

describe("modelSizeWarning", () => {
  it("warns nothing for a known small model", () => {
    expect(modelSizeWarning("qwen2.5:3b", 1.9)).toBe("none");
  });

  it("warns 'unknown' for a model with no listed size at all", () => {
    // Not on the known-heavy list, and no catalog entry to read a size from -- exactly the
    // uncatalogued/custom-pulled case the roadmap bug describes.
    expect(modelSizeWarning("some-custom-tag:latest")).toBe("unknown");
    expect(modelSizeWarning("some-custom-tag:latest", undefined)).toBe("unknown");
  });

  it("keeps the existing 'large' warning for a model on the known-heavy list, even with no size", () => {
    expect(modelSizeWarning("gemma3:27b")).toBe("large");
  });

  it("keeps the existing 'large' warning for a model whose listed size meets the threshold", () => {
    expect(modelSizeWarning("a-brand-new-tag:70b", 20)).toBe("large");
  });

  it("never disagrees with isHighVramTag about which models count as large", () => {
    expect(modelSizeWarning("gemma3:27b") === "large").toBe(isHighVramTag("gemma3:27b"));
    expect(modelSizeWarning("qwen2.5:3b", 1.9) === "large").toBe(isHighVramTag("qwen2.5:3b", 1.9));
  });
});
