/**
 * Title: The thumbs-down call to the back end
 * Purpose: Pin the call name, the argument order the back end reads (number, kind, reason, undo) and what the
 *          screen gets back: the marks the note holds when it works, a plain "not ok" when it fails.
 * Used for: demoteNoteApi.ts (plan 98, lane C).
 * Does not: Talk to a real back end; the call is a stand-in.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { callDeckyWithTimeout } = vi.hoisted(() => ({ callDeckyWithTimeout: vi.fn() }));
vi.mock("../../shared/deckyCall", () => ({ callDeckyWithTimeout }));

import { demoteRagCorpusNote } from "./demoteNoteApi";

describe("demoteRagCorpusNote", () => {
  beforeEach(() => callDeckyWithTimeout.mockReset());

  it("sends the number, the kind, the reason and undo in the order the back end reads them", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, downs: 1, excluded: false });
    await expect(demoteRagCorpusNote(123, "note", "wrong_tip")).resolves.toEqual({ ok: true, downs: 1, excluded: false });
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("demote_rag_corpus_note", [123, "note", "wrong_tip", false]);
  });

  it("sends undo through for taking a mark back, and says when three marks leave a tip out", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, downs: 3, excluded: true });
    await expect(demoteRagCorpusNote(7, "tip", "outdated", true)).resolves.toEqual({ ok: true, downs: 3, excluded: true });
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("demote_rag_corpus_note", [7, "tip", "outdated", true]);
  });

  it("reads a refusal, a malformed answer and a failed call as not ok", async () => {
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: false, error: "Invalid reason." });
    await expect(demoteRagCorpusNote(1, "note", "outdated")).resolves.toEqual({ ok: false });
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: true });
    await expect(demoteRagCorpusNote(1, "note", "outdated")).resolves.toEqual({ ok: false });
    callDeckyWithTimeout.mockRejectedValueOnce(new Error("RPC timeout"));
    await expect(demoteRagCorpusNote(1, "note", "outdated")).resolves.toEqual({ ok: false });
  });
});
