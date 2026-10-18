import { describe, expect, it } from "vitest";
import { stripSoftContinueCue } from "./stripSoftContinueCue";

describe("stripSoftContinueCue", () => {
  it("removes a trailing cue", () => {
    expect(stripSoftContinueCue("Body text\n\nContinuing…")).toBe("Body text");
  });

  it("removes a trailing cue with trailing whitespace", () => {
    expect(stripSoftContinueCue("Body text\n\nContinuing…   \n")).toBe("Body text");
  });

  it("leaves a mid-sentence occurrence untouched", () => {
    const raw = "Say Continuing… aloud";
    expect(stripSoftContinueCue(raw)).toBe(raw);
  });

  it("leaves plain body text unchanged", () => {
    expect(stripSoftContinueCue("Nothing to strip here.")).toBe("Nothing to strip here.");
  });

  it("returns empty input as-is", () => {
    expect(stripSoftContinueCue("")).toBe("");
  });
});
