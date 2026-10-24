/**
 * Title: The Search tab's calls to the back end
 * Purpose: Pin the call names, the arguments and what the tab gets back for the chats' questions (C6), the
 *          notes and their switch (C3) and the game notes (C7): the list when the call is fine, nothing when
 *          it fails or answers with an error, the back end's own words when a save is refused.
 * Used for: searchApi.ts (plan 92, lane N3).
 * Does not: Talk to a real back end; the call is a stand-in.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { callDeckyWithTimeout } = vi.hoisted(() => ({ callDeckyWithTimeout: vi.fn() }));
vi.mock("../../shared/deckyCall", () => ({ callDeckyWithTimeout }));

import { listChatSlotQuestions, listUserNotes, saveUserNote, searchRagCorpusNotes } from "./searchApi";

const CHAT = {
  slot_id: "a",
  label: "Hollow Knight help",
  updated_at: 1_800_000_000,
  questions: [{ turn_id: "t1", text: "Where do I find the Mantis Claw?", created_at: 1_799_990_000, app_id: "367520", game_title: "Hollow Knight" }],
};

describe("listChatSlotQuestions", () => {
  beforeEach(() => callDeckyWithTimeout.mockReset());

  it("asks list_chat_slot_questions with no arguments and returns the chats", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, chats: [CHAT] });
    await expect(listChatSlotQuestions()).resolves.toEqual([CHAT]);
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("list_chat_slot_questions", []);
  });

  it("reads an error answer, a missing list and a failed call as no chats", async () => {
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: false, error: "nope" });
    await expect(listChatSlotQuestions()).resolves.toEqual([]);
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: true });
    await expect(listChatSlotQuestions()).resolves.toEqual([]);
    callDeckyWithTimeout.mockRejectedValueOnce(new Error("RPC timeout"));
    await expect(listChatSlotQuestions()).resolves.toEqual([]);
  });
});

const NOTE = {
  id: "n-1",
  text: "I'm on a Steel Soul run (one life).",
  app_id: "367520",
  game_title: "Hollow Knight",
  on: true,
  created_at: "2026-10-12T03:15:00Z",
  source_turn_id: "",
};

describe("listUserNotes", () => {
  beforeEach(() => callDeckyWithTimeout.mockReset());

  it("asks list_user_notes and returns the notes", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, notes: [NOTE] });
    await expect(listUserNotes()).resolves.toEqual([NOTE]);
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("list_user_notes", []);
  });

  it("reads a failure as no notes", async () => {
    callDeckyWithTimeout.mockRejectedValueOnce(new Error("RPC timeout"));
    await expect(listUserNotes()).resolves.toEqual([]);
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: false });
    await expect(listUserNotes()).resolves.toEqual([]);
  });
});

describe("saveUserNote", () => {
  beforeEach(() => callDeckyWithTimeout.mockReset());

  it("sends only the id and the switch, and returns the saved note", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, note: { ...NOTE, on: false } });
    await expect(saveUserNote({ id: "n-1", on: false })).resolves.toEqual({ ok: true, note: { ...NOTE, on: false } });
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("save_user_note", [{ id: "n-1", on: false }]);
  });

  it("hands back the back end's own words when it refuses, and plain ones when the call fails", async () => {
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: false, error: "That note is gone.", code: "not_found" });
    await expect(saveUserNote({ id: "n-9", on: true })).resolves.toEqual({ ok: false, error: "That note is gone." });
    callDeckyWithTimeout.mockRejectedValueOnce(new Error("RPC timeout"));
    await expect(saveUserNote({ id: "n-1", on: true })).resolves.toEqual({ ok: false, error: "That note could not be saved." });
  });
});

describe("searchRagCorpusNotes", () => {
  beforeEach(() => callDeckyWithTimeout.mockReset());
  const GAME_NOTE = { name: "Mantis Lords", kind: "boss", game_title: "Hollow Knight", snippet: "Three lords.", text: "The Mantis Lords...", name_matches: true };

  it("asks with the word and the game and returns the notes", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, installed: true, notes: [GAME_NOTE], reason: "" });
    await expect(searchRagCorpusNotes("mantis", "Hollow Knight")).resolves.toEqual({ installed: true, notes: [GAME_NOTE], reason: "" });
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("search_rag_corpus_notes", ["mantis", "Hollow Knight"]);
  });

  it("reads a library that is not installed as an empty answer with its reason", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, installed: false, notes: [], reason: "The knowledge library is not installed." });
    await expect(searchRagCorpusNotes("mantis", "")).resolves.toEqual({ installed: false, notes: [], reason: "The knowledge library is not installed." });
  });

  it("reads a failed call as not installed, never an error", async () => {
    callDeckyWithTimeout.mockRejectedValueOnce(new Error("RPC timeout"));
    await expect(searchRagCorpusNotes("mantis", "")).resolves.toEqual({ installed: false, notes: [], reason: "" });
  });
});
