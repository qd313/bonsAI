/**
 * Title: The Search tab's calls to the back end
 * Purpose: Pin the call name and what the tab gets back for the chats' questions (contract C6): the list
 *          when the call is fine, nothing when it fails or answers with an error.
 * Used for: searchApi.ts (plan 92, lane N3).
 * Does not: Talk to a real back end; the call is a stand-in.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { callDeckyWithTimeout } = vi.hoisted(() => ({ callDeckyWithTimeout: vi.fn() }));
vi.mock("../../utils/deckyCall", () => ({ callDeckyWithTimeout }));

import { listChatSlotQuestions } from "./searchApi";

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
