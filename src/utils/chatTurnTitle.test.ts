import { describe, expect, it } from "vitest";
import { buildCollapsedTurnTitle } from "./chatTurnTitle";

describe("buildCollapsedTurnTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(buildCollapsedTurnTitle("  hello   world  ")).toBe("hello world");
  });

  it("returns empty for blank input", () => {
    expect(buildCollapsedTurnTitle("")).toBe("");
    expect(buildCollapsedTurnTitle("   ")).toBe("");
  });

  it("returns short text unchanged", () => {
    expect(buildCollapsedTurnTitle("How do I beat the boss?")).toBe("How do I beat the boss?");
  });

  it("truncates with ellipsis when over maxLen", () => {
    const long = "a".repeat(80);
    const title = buildCollapsedTurnTitle(long, 60);
    expect(title.length).toBe(60);
    expect(title.endsWith("…")).toBe(true);
  });

  it("respects custom maxLen", () => {
    expect(buildCollapsedTurnTitle("abcdefghijklmnop", 10)).toBe("abcdefghi…");
  });
});
