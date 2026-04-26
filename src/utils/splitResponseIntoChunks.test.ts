import { describe, expect, it } from "vitest";
import { splitResponseIntoChunks } from "./splitResponseIntoChunks";

describe("splitResponseIntoChunks", () => {
  it("splits prose at blank lines but keeps a fenced block intact", () => {
    const t = "Intro line.\n\n```json\n{\"tdp_watts\": 8}\n```\n\nMore text after.";
    const c = splitResponseIntoChunks(t);
    expect(c).toHaveLength(3);
    expect(c[0]).toContain("Intro");
    expect(c[1]).toMatch(/```json/);
    expect(c[1]).toContain("tdp_watts");
    expect(c[2]).toContain("More text");
  });

  it("does not split inside a code fence when a blank line appears inside the fence", () => {
    const t = "Start\n\n```\nline1\n\nline2\n```\n\nEnd";
    const c = splitResponseIntoChunks(t);
    expect(c.length).toBeGreaterThanOrEqual(1);
    const withFence = c.find((x) => x.includes("line1") && x.includes("line2"));
    expect(withFence).toBeDefined();
    expect(withFence).toMatch(/```/);
  });

  it("returns a single chunk for short fenced-only content", () => {
    const t = "```json\n{\"a\":1}\n```";
    const c = splitResponseIntoChunks(t);
    expect(c).toEqual([t.trim()]);
  });
});
