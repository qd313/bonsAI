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
   * The thing the backend worked out this question named — a card title such as "Wheatley" or
   * "Dreadnought Twins" (plan 54 gap 2). Only ever set on the assistant turn (the fact belongs to
   * the question, but the backend only knows it once the question has been run). "" or absent:
   * no entity, or a turn saved before this field existed.
   */
  asked_entity?: string;
  /**
   * What the user saw as their question when it differs from `text` (the composed prompt).
   * Display only — reasoning about the turn keeps reading `text`. "" or absent: same as `text`.
   */
  display_text?: string;
  created_at?: number;
  /**
   * Whether this answer summed the chat up first (plan 68 step 2), so the screen can draw the
   * note or the warning line straight off the saved turn. Only ever set on an assistant turn, to
   * one of these two exact words -- absent otherwise, never "" and never a stored null, the same
   * "absent, not empty" rule the backend's `chat_slot_service.py` follows for `reasoning`.
   */
  chat_summary?: "written" | "failed";
};

/**
 * A chat's own summary of its older turns (plan 68 step 2), written just before the chat would
 * otherwise outgrow its room. Coverage is by turn id, not a count: `covers_through_turn_id` names
 * the newest turn the summary accounts for, and if that id is no longer among the chat's turns
 * (the 200-turn cap dropped it), no remaining turn is covered. `turns_covered` and
 * `hidden_notes_left_out` are cumulative across rewrites, not just the most recent one.
 */
export type ChatMemorySummary = {
  text: string;
  covers_through_turn_id: string;
  turns_covered: number;
  oldest_turns_unread: number;
  hidden_notes_left_out: number;
  written_at: string;
  seconds: number;
  model: string;
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
  /**
   * This chat's own summary of its older turns (plan 68 step 2). `null` on a chat with no summary
   * yet, or one saved before this existed -- never rendered on its own; the Session tab reads it.
   * This chat's remembered follow-up subject rides the same slot on the backend but never reaches
   * the screen, the same as it never did when it lived in the plugin-wide memory it replaces.
   */
  summary?: ChatMemorySummary | null;
  /**
   * The back end's answer to "is there anything to sum up" (plan 68 step 4): false while the whole
   * chat still fits in what the AI is shown. Absent on a build before this existed.
   */
  can_sum_up?: boolean;
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

export type SumUpStartResult = {
  accepted: boolean;
  /** "pending" once started; "busy" while an answer or another summary holds the one slot; "nothing_to_do" while the chat still fits. */
  status: "pending" | "busy" | "invalid" | "nothing_to_do";
  request_id?: number;
};

/**
 * Plan 68: the Session tab's *Sum up this chat*. Starts the back end's summary of this chat as a
 * job of its own, through the same one-at-a-time slot as a question; the caller follows it with
 * the ordinary background status (`kind: "sum_up"`).
 */
export async function sumUpChatSlot(slotId: string, pcIp = ""): Promise<SumUpStartResult> {
  // The same AI server an Ask would use: every question sends this address as PcIp.
  const res = await callDeckyWithTimeout<[string, string], Partial<SumUpStartResult>>("sum_up_chat_slot", [
    slotId,
    pcIp,
  ]);
  const status = res?.status;
  return {
    accepted: res?.accepted === true,
    status: status === "pending" || status === "busy" || status === "nothing_to_do" ? status : "invalid",
    ...(typeof res?.request_id === "number" ? { request_id: res.request_id } : {}),
  };
}

export async function renameChatSlot(slotId: string, label: string): Promise<ChatSlot | null> {
  const res = await callDeckyWithTimeout<[Record<string, string>], RenameSlotRpc>("rename_chat_slot", [
    { slot_id: slotId, label },
  ]);
  return res?.slot ?? null;
}
