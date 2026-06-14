import { describe, expect, it } from "vitest";
import { splitResponseIntoChunks } from "./splitResponseIntoChunks";

describe("streaming answer sections", () => {
  it("splits streaming body into multiple sections when paragraphs exist", () => {
    const body = "First paragraph.\n\nSecond paragraph.\n\nThird still typing";
    const chunks = splitResponseIntoChunks(body);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("returns one section for short streaming line", () => {
    const chunks = splitResponseIntoChunks("Short stream");
    expect(chunks).toHaveLength(1);
  });
});
