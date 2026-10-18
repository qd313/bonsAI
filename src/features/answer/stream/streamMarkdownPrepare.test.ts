import { describe, expect, it } from "vitest";
import {
  didNonSpoilerFenceJustClose,
  FENCE_STREAM_WAIT_LABEL,
  normalizeIncompleteInline,
  prepareStreamMarkdown,
  settleRevealCut,
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

/*
 * Plan 70, SPOILER-COVER-01: the reveal must never stop half-way through a fence marker line (a
 * half-typed "```bonsa" is read as an ordinary code fence) or inside a spoiler fence the snapshot
 * has already closed (a finished cover would drop back to "hidden until complete" on every flush).
 */
describe("settleRevealCut", () => {
  const covered = "Intro.\n\n```bonsai-spoiler\nThe Soul Master teleports.\n```\nKeep moving.";
  const coverEnd = covered.indexOf("Keep");

  it("leaves a cut in ordinary prose where it is", () => {
    expect(settleRevealCut(covered, 3)).toBe(3);
    expect(settleRevealCut(covered, coverEnd + 2)).toBe(coverEnd + 2);
  });

  it("moves a cut inside a closed spoiler fence's opener past its closer", () => {
    expect(settleRevealCut(covered, covered.indexOf("```") + 5)).toBe(coverEnd);
  });

  it("moves a cut inside a closed spoiler fence's body past its closer", () => {
    expect(settleRevealCut(covered, covered.indexOf("Soul"))).toBe(coverEnd);
    expect(settleRevealCut(covered, coverEnd - 2)).toBe(coverEnd);
  });

  it("finishes the opener line of a spoiler fence that is still open, and no more", () => {
    const open = "Intro.\n```bonsai-spoiler\nThe Soul";
    const opener = open.indexOf("```");
    expect(settleRevealCut(open, opener + 4)).toBe(open.indexOf("The"));
    expect(settleRevealCut(open, open.length - 2)).toBe(open.length - 2);
  });

  it("finishes an ordinary fence's marker line but leaves its body to the wait chip", () => {
    const code = "Run:\n```bash\necho hi\n```\nDone.";
    expect(settleRevealCut(code, code.indexOf("```") + 2)).toBe(code.indexOf("echo"));
    expect(settleRevealCut(code, code.indexOf("hi"))).toBe(code.indexOf("hi"));
  });

  it("covers the back end's own sentence cover, which starts with a blank line", () => {
    const own = "\n```bonsai-spoiler\nWhen fighting the Soul Master, the k\n```\n";
    expect(settleRevealCut(own, 3)).toBe(own.length);
    expect(settleRevealCut(own, 0)).toBe(0);
    expect(settleRevealCut(own, 1)).toBe(1);
  });
});

/*
 * Plan 76 lane 1: a ~~~ block, and a block fenced with four backticks, is one block from opener to
 * closer while the answer streams, exactly as the panel draws it once finished. The live parser
 * knew only three backticks, so a ~~~ hidden block was drawn as plain prose the whole time.
 */
describe("streaming fences other than three backticks", () => {
  const F = "`".repeat(3);
  const F4 = "`".repeat(4);
  const T = "~~~";

  it("masks an open ~~~ hidden block, blank lines and all", () => {
    const r = prepareStreamMarkdown(`Hint.\n\n${T}bonsai-spoiler\nBoss name\n\nPhase 2`);
    expect(r.closedBlocks).toEqual(["Hint."]);
    expect(r.waitChip).toEqual({ kind: "spoiler", label: SPOILER_STREAM_MASK_LABEL });
    expect(r.liveTail).toBeNull();
    expect(JSON.stringify(r)).not.toContain("Boss name");
  });

  it("closes a ~~~ block into one closed piece, blank line inside, and goes on with the prose", () => {
    const block = `${T}bonsai-spoiler\nBoss name\n\nPhase 2\n${T}`;
    const r = prepareStreamMarkdown(`Hint.\n\n${block}\n\nAfter it`);
    expect(r.closedBlocks).toEqual(["Hint.", block]);
    expect(r.waitChip).toBeNull();
    expect(r.liveTail).toBe("After it");
  });

  it("does not let a ``` line close a ~~~ block", () => {
    const r = prepareStreamMarkdown(`${T}bonsai-spoiler\nBoss name\n${F}\nPhase 2`);
    expect(r.waitChip).toEqual({ kind: "spoiler", label: SPOILER_STREAM_MASK_LABEL });
    expect(JSON.stringify(r)).not.toContain("Phase 2");
  });

  it("reads a four-backtick hidden block as one block, ``` line inside it", () => {
    const open = prepareStreamMarkdown(`Hint.\n\n${F4}bonsai-spoiler\nBoss name\n${F}\nPhase 2`);
    expect(open.waitChip).toEqual({ kind: "spoiler", label: SPOILER_STREAM_MASK_LABEL });
    expect(JSON.stringify(open)).not.toContain("Phase 2");
    const block = `${F4}bonsai-spoiler\nBoss name\n${F}\nPhase 2\n${F4}`;
    const done = prepareStreamMarkdown(`Hint.\n\n${block}\n\nAfter`);
    expect(done.closedBlocks).toEqual(["Hint.", block]);
  });

  it("shows the code wait chip for an open ~~~ code block", () => {
    const r = prepareStreamMarkdown(`Before.\n\n${T}json\n{"a": 1`);
    expect(r.waitChip).toEqual({ kind: "fence", label: FENCE_STREAM_WAIT_LABEL });
  });

  it("streams an open ~~~ hidden block as prose when the turn unwraps it", () => {
    const r = prepareStreamMarkdown(`${T}bonsai-spoiler\nBoss name`, { unwrapOpenSpoilerFence: () => true });
    expect(r.waitChip).toBeNull();
    expect(r.liveTail).toBe("Boss name");
  });

  it("does not count a closing mark glued onto a sentence as a closer", () => {
    const r = prepareStreamMarkdown(`${F}bonsai-spoiler\nOne sentence.${F}\nMore`);
    expect(r.waitChip).toEqual({ kind: "spoiler", label: SPOILER_STREAM_MASK_LABEL });
    expect(JSON.stringify(r)).not.toContain("More");
  });

  it("didNonSpoilerFenceJustClose sees a ~~~ block close", () => {
    const prev = `text\n\n${T}json\n{"a":1}\n`;
    expect(didNonSpoilerFenceJustClose(prev, `${prev}${T}\n`)).toBe(true);
    expect(didNonSpoilerFenceJustClose(prev, `${prev}{"b":2}\n`)).toBe(false);
  });

  it("settleRevealCut never stops inside a ~~~ hidden block the snapshot has closed", () => {
    const covered = `Intro.\n\n${T}bonsai-spoiler\nThe Soul Master teleports.\n\nAnd more.\n${T}\nKeep moving.`;
    const end = covered.indexOf("Keep");
    expect(settleRevealCut(covered, covered.indexOf("Soul"))).toBe(end);
    expect(settleRevealCut(covered, covered.indexOf("And"))).toBe(end);
    expect(settleRevealCut(covered, 3)).toBe(3);
  });

  it("settleRevealCut finishes a half-typed ~~~ marker line", () => {
    const open = `Intro.\n${T}bonsai-spoiler\nThe Soul`;
    expect(settleRevealCut(open, open.indexOf(T) + 5)).toBe(open.indexOf("The"));
  });
});
