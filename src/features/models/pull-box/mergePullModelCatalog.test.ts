import { describe, expect, it } from "vitest";
import { isPlausibleOllamaPullTag } from "./mergePullModelCatalog";

describe("isPlausibleOllamaPullTag", () => {
  it("accepts a plain model name with no variant", () => {
    expect(isPlausibleOllamaPullTag("llama3.2")).toBe(true);
  });

  it("accepts a model name with a size/variant tag", () => {
    expect(isPlausibleOllamaPullTag("llama3.2:3b")).toBe(true);
  });

  it("trims surrounding whitespace before checking", () => {
    expect(isPlausibleOllamaPullTag("  qwen2.5vl:3b  ")).toBe(true);
  });

  it("rejects an empty or whitespace-only string", () => {
    expect(isPlausibleOllamaPullTag("")).toBe(false);
    expect(isPlausibleOllamaPullTag("   ")).toBe(false);
  });

  it("rejects uppercase letters and spaces, matching the backend's registry rule", () => {
    expect(isPlausibleOllamaPullTag("NOT VALID TAG")).toBe(false);
    expect(isPlausibleOllamaPullTag("Llama3.2")).toBe(false);
  });

  it("rejects a tag over 96 characters, same cap as is_valid_ollama_pull_tag", () => {
    expect(isPlausibleOllamaPullTag("a".repeat(97))).toBe(false);
    expect(isPlausibleOllamaPullTag("a".repeat(64))).toBe(true);
  });

  it("rejects a variant longer than 32 characters", () => {
    expect(isPlausibleOllamaPullTag(`llama3.2:${"b".repeat(33)}`)).toBe(false);
    expect(isPlausibleOllamaPullTag(`llama3.2:${"b".repeat(32)}`)).toBe(true);
  });
});
