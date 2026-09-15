/**
 * Title: Asking the back end for saved chats
 *
 * Purpose: The player can keep more than one saved chat with the AI at once, switch between them, and
 * rename or delete the ones they no longer want. This file is what actually asks the back end to do
 * each of those five things — list the saved chats, load one, start a new one, delete one, rename one
 * — and describes the shape of what comes back.
 *
 * Used for: useChatSlots, and this file's own tests.
 *
 * Solves: every one of these calls to the back end gets the same timeout handling and the same typed
 * shape, instead of every caller making the raw call itself and guessing at what comes back.
 *
 * Does not: turn the raw list of turns a loaded chat comes back with into the paired
 * question-and-answer rows the screen shows — see chatSlotTurns.ts for that.
 */
import { callDeckyWithTimeout } from "./deckyCall";
import type { ChatSlotTurnTransparency } from "./inputTransparency";

export type ChatSlotTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  request_id?: number | null;
  transparency?: ChatSlotTurnTransparency | null;
  /**
   * Steam AppID of the game running when this turn happened, written by chat_slot_service.py.
   * Optional because turns saved before the field existed come back without it — see the
   * fallback chain in chatSlotTurns.ts.
   */
  app_id?: string;
  /**
   * Display name of the game running when this turn happened, alongside `app_id` — needed for a
   * title reachable only by name, an emulator shortcut with no Steam AppID (plan 54 gap 1).
   * Optional for the same reason `app_id` is: a turn saved before this field existed comes back
   * without it.
   */
  app_name?: string;
  /**
   * What the user saw as their question when it differs from `text` (the composed prompt).
   * Display only — reasoning about the turn keeps reading `text`. "" or absent: same as `text`.
   */
  display_text?: string;
  created_at?: number;
};

export type ChatSlotSummary = {
  id: string;
  label: string;
  created_at: number;
  updated_at: number;
  origin_app_id?: string;
  /** Display name of the game the slot was opened under. Absent on slots saved before it was kept. */
  origin_app_name?: string;
  turn_count?: number;
};

export type ChatSlot = {
  id: string;
  label: string;
  created_at: number;
  updated_at: number;
  origin_app_id?: string;
  /** Display name of the game the slot was opened under. Absent on slots saved before it was kept. */
  origin_app_name?: string;
  turns: ChatSlotTurn[];
};

type ListSlotsRpc = { slots: ChatSlotSummary[] };
type GetSlotRpc = { ok: boolean; slot?: ChatSlot; error?: string };
type CreateSlotRpc = { ok: boolean; slot?: ChatSlot };
type DeleteSlotRpc = { ok: boolean; error?: string };
type RenameSlotRpc = { ok: boolean; slot?: ChatSlot; error?: string };

export async function listChatSlots(): Promise<ChatSlotSummary[]> {
  const res = await callDeckyWithTimeout<[], ListSlotsRpc>("list_chat_slots", []);
  return Array.isArray(res?.slots) ? res.slots : [];
}

export async function getChatSlot(slotId: string): Promise<ChatSlot | null> {
  const res = await callDeckyWithTimeout<[string], GetSlotRpc>("get_chat_slot", [slotId]);
  if (!res?.ok || !res.slot) return null;
  return res.slot;
}

export async function createChatSlot(args: {
  originAppId?: string;
  appName?: string;
  firstQuestion?: string;
  label?: string;
}): Promise<ChatSlot | null> {
  const res = await callDeckyWithTimeout<[Record<string, string>], CreateSlotRpc>("create_chat_slot", [
    {
      origin_app_id: args.originAppId ?? "",
      app_name: args.appName ?? "",
      first_question: args.firstQuestion ?? "",
      label: args.label ?? "",
    },
  ]);
  return res?.slot ?? null;
}

export async function deleteChatSlot(slotId: string): Promise<boolean> {
  const res = await callDeckyWithTimeout<[string], DeleteSlotRpc>("delete_chat_slot", [slotId]);
  return res?.ok === true;
}

export async function renameChatSlot(slotId: string, label: string): Promise<ChatSlot | null> {
  const res = await callDeckyWithTimeout<[Record<string, string>], RenameSlotRpc>("rename_chat_slot", [
    { slot_id: slotId, label },
  ]);
  return res?.slot ?? null;
}
