import { describe, expect, it } from "vitest";
import {
  didNonSpoilerFenceJustClose,
  FENCE_STREAM_WAIT_LABEL,
  normalizeIncompleteInline,
  prepareStreamMarkdown,
  SPOILER_STREAM_MASK_LABEL,
} from "./streamMarkdownPrepare";

describe("prepareStreamMarkdown", () => {
  it("returns live prose tail with stay-open bold", () => {
    const r = prepareStreamMarkdown("**Hello wor");
    expect(r.closedBlocks).toEqual([]);
    expect(r.waitChip).toBeNull();
    expect(r.liveTail).toBe("**Hello wor**");
  });

  it("masks open spoiler fence body (S1)", () => {
    const t = "Hint.\n\n```bonsai-spoiler\nBoss name\nPhase 2";
    const r = prepareStreamMarkdown(t);
    expect(r.closedBlocks).toEqual(["Hint."]);
    expect(r.waitChip).toEqual({ kind: "spoiler", label: SPOILER_STREAM_MASK_LABEL });
    expect(r.liveTail).toBeNull();
    expect(JSON.stringify(r)).not.toContain("Boss name");
  });

  it("shows fence wait chip for open json fence (F2)", () => {
    const t = "Before.\n\n```json\n{\"tdp_watts\": 12";
    const r = prepareStreamMarkdown(t);
    expect(r.closedBlocks).toEqual(["Before."]);
    expect(r.waitChip).toEqual({ kind: "fence", label: FENCE_STREAM_WAIT_LABEL });
    expect(r.liveTail).toBeNull();
    expect(JSON.stringify(r)).not.toContain("tdp_watts");
  });

  it("moves closed fence into closedBlocks when fence completes", () => {
    const t = "Intro.\n\n```json\n{\"a\":1}\n```\n\nAfter.";
    const r = prepareStreamMarkdown(t);
    expect(r.closedBlocks.length).toBeGreaterThanOrEqual(2);
    expect(r.closedBlocks.some((b) => b.includes("```json"))).toBe(true);
    expect(r.waitChip).toBeNull();
    expect(r.liveTail).toBe("After.");
  });

  it("keeps complete spoiler fence in closedBlocks after close", () => {
    const t = "Hint.\n\n```bonsai-spoiler\nSecret\n```\n\nDone.";
    const r = prepareStreamMarkdown(t);
    expect(r.closedBlocks.some((b) => b.includes("bonsai-spoiler") && b.includes("Secret"))).toBe(
      true
    );
    expect(r.waitChip).toBeNull();
  });

  it("hands the scramble the live tail as written, before the stay-open closers are added", () => {
    expect(prepareStreamMarkdown("**Hello wor").liveTailRaw).toBe("**Hello wor");
    expect(prepareStreamMarkdown("Before.\n\n```json\n{").liveTailRaw).toBeNull();
    const spoiler = "Hint.\n\n```bonsai-spoiler\nFocus *the weak";
    expect(prepareStreamMarkdown(spoiler, { unwrapOpenSpoilerFence: () => true }).liveTailRaw).toBe(
      "Focus *the weak"
    );
  });

  it("streams an open spoiler fence as prose when the caller says it qualifies", () => {
    const t = "Hint.\n\n```bonsai-spoiler\nFocus fire the weak point while kiting";
    const r = prepareStreamMarkdown(t, { unwrapOpenSpoilerFence: () => true });
    expect(r.waitChip).toBeNull();
    expect(r.liveTail).toBe("Focus fire the weak point while kiting");
  });

  it("still masks an open spoiler fence when the caller says it does not qualify", () => {
    const t = "Hint.\n\n```bonsai-spoiler\nSecret ending";
    const r = prepareStreamMarkdown(t, { unwrapOpenSpoilerFence: () => false });
    expect(r.waitChip).toEqual({ kind: "spoiler", label: SPOILER_STREAM_MASK_LABEL });
    expect(r.liveTail).toBeNull();
    expect(JSON.stringify(r)).not.toContain("Secret ending");
  });

  it("still masks an open spoiler fence when no callback is passed (default behaviour unchanged)", () => {
    const t = "Hint.\n\n```bonsai-spoiler\nBoss name\nPhase 2";
    const r = prepareStreamMarkdown(t);
    expect(r.waitChip).toEqual({ kind: "spoiler", label: SPOILER_STREAM_MASK_LABEL });
  });

  it("does not unwrap a non-spoiler open fence even when the callback always returns true", () => {
    const t = "Before.\n\n```json\n{\"tdp_watts\": 12";
    const r = prepareStreamMarkdown(t, { unwrapOpenSpoilerFence: () => true });
    expect(r.waitChip).toEqual({ kind: "fence", label: FENCE_STREAM_WAIT_LABEL });
    expect(r.liveTail).toBeNull();
  });
});

describe("normalizeIncompleteInline", () => {
  it("closes open link bracket", () => {
    expect(normalizeIncompleteInline("[docs](https://x")).toBe("[docs](https://x)");
    expect(normalizeIncompleteInline("[docs](https://x")).toContain(")");
  });

  it("closes single backtick", () => {
    expect(normalizeIncompleteInline("use `foo")).toBe("use `foo`");
  });
});

describe("didNonSpoilerFenceJustClose", () => {
  it("detects fence close on target growth", () => {
    const prev = "text\n\n```json\n{\"a\":1}\n";
    const next = "text\n\n```json\n{\"a\":1}\n```\n";
    expect(didNonSpoilerFenceJustClose(prev, next)).toBe(true);
  });

  it("returns false when still inside fence", () => {
    const prev = "text\n\n```json\n";
    const next = "text\n\n```json\n{\"a\":";
    expect(didNonSpoilerFenceJustClose(prev, next)).toBe(false);
  });
});
