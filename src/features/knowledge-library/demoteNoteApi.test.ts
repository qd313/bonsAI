/**
 * Title: The thumbs-down call to the back end
 * Purpose: Pin the call name, the argument order the back end reads (number, kind, reason, undo) and what the
 *          screen gets back: the marks the note holds when it works, a plain "not ok" when it fails.
 *          Also the "Lowered notes" row's two calls: how many notes hold a mark, and clear them all (plan 100).
 * Used for: demoteNoteApi.ts (plan 98, lane C; plan 100, lane U).
 * Does not: Talk to a real back end; the call is a stand-in.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { callDeckyWithTimeout } = vi.hoisted(() => ({ callDeckyWithTimeout: vi.fn() }));
vi.mock("../../shared/deckyCall", () => ({ callDeckyWithTimeout }));

import { clearLoweredNotes, countLoweredNotes, demoteRagCorpusNote } from "./demoteNoteApi";

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

describe("countLoweredNotes", () => {
  beforeEach(() => callDeckyWithTimeout.mockReset());

  it("asks the back end's list and answers how many notes and tips hold a mark", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, count: 2, notes: [{}, {}] });
    await expect(countLoweredNotes()).resolves.toBe(2);
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("list_rag_corpus_demotes", []);
  });

  it("answers null for a refusal, a malformed answer or a failed call, so the row stays hidden", async () => {
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: false });
    await expect(countLoweredNotes()).resolves.toBeNull();
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: true, count: "2" });
    await expect(countLoweredNotes()).resolves.toBeNull();
    callDeckyWithTimeout.mockRejectedValueOnce(new Error("RPC timeout"));
    await expect(countLoweredNotes()).resolves.toBeNull();
  });
});

describe("clearLoweredNotes", () => {
  beforeEach(() => callDeckyWithTimeout.mockReset());

  it("asks the back end to clear every mark and answers how many were cleared", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, cleared: 2 });
    await expect(clearLoweredNotes()).resolves.toEqual({ ok: true, cleared: 2 });
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("clear_rag_corpus_demotes", []);
  });

  it("reads a failed write, a malformed answer and a failed call as not ok", async () => {
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: false, error: "disk full" });
    await expect(clearLoweredNotes()).resolves.toEqual({ ok: false });
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: true });
    await expect(clearLoweredNotes()).resolves.toEqual({ ok: false });
    callDeckyWithTimeout.mockRejectedValueOnce(new Error("RPC timeout"));
    await expect(clearLoweredNotes()).resolves.toEqual({ ok: false });
  });
});
