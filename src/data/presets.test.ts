import { describe, expect, it } from "vitest";
import {
  detectPromptCategory,
  getContextualPresets,
  getRandomPresetExcluding,
  getRandomPresets,
  holdMsForPresetText,
} from "./presets";

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

  it("holdMsForPresetText clamps by length", () => {
    expect(holdMsForPresetText("a")).toBe(4000);
    expect(holdMsForPresetText("x".repeat(200))).toBe(28000);
    expect(holdMsForPresetText("How do I fix stuttering?")).toBeGreaterThan(4000);
    expect(holdMsForPresetText("How do I fix stuttering?")).toBeLessThan(28000);
  });

  it("getRandomPresetExcluding avoids listed texts when possible", () => {
    const all = getRandomPresets(50).map((p) => p.text);
    const exclude = new Set(all.slice(0, all.length - 1));
    const one = getRandomPresetExcluding(exclude);
    expect(exclude.has(one.text)).toBe(false);
  });
});
