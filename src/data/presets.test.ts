import { describe, expect, it } from "vitest";
import { detectPromptCategory, getContextualPresets, getRandomPresets } from "./presets";

/** Regression tests for preset sampling and category detection heuristics. */
describe("presets", () => {
  it("returns requested number of random presets when possible", () => {
    const presets = getRandomPresets(3);
    expect(presets.length).toBe(3);
  });

  it("detects category from explicit preset text", () => {
    expect(detectPromptCategory("Please help with battery optimization")).toBe("battery");
    expect(detectPromptCategory("How do I fix stuttering?")).toBe("troubleshooting");
  });

  it("returns contextual presets with requested length", () => {
    const presets = getContextualPresets("performance", 3);
    expect(presets.length).toBe(3);
  });
});
