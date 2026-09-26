import { describe, expect, it } from "vitest";
import { activeOllamaRoutingTag } from "./activeOllamaRoutingTag";

const disclosure = (model: string) => ({
  model,
  source_class: "foss" as const,
  read_more_anchor: "#test",
});

describe("activeOllamaRoutingTag", () => {
  it("reports the disclosed model as in use while a request is in flight", () => {
    expect(activeOllamaRoutingTag(true, disclosure("qwen2.5:1.5b"))).toBe("qwen2.5:1.5b");
  });

  it("clears the moment asking stops, even though the disclosure itself is not cleared", () => {
    // This is the exact shape from the Deck: a question was answered (disclosure stays set),
    // then isAsking goes false once the answer settles. Remove must stop being disabled here,
    // not stay disabled until a reload (plan64-PRELOAD-01-try3-timing.json).
    expect(activeOllamaRoutingTag(false, disclosure("qwen2.5:1.5b"))).toBeNull();
  });

  it("is null before any question has ever been answered", () => {
    expect(activeOllamaRoutingTag(false, null)).toBeNull();
  });

  it("is null while asking if no answer has disclosed a model yet", () => {
    expect(activeOllamaRoutingTag(true, null)).toBeNull();
  });
});
