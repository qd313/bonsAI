/**
 * Title: Ask with ten chats saved and none open: pick a chat to delete first
 *
 * Purpose: The gate at the front of every question. With no chat open and ten chats already saved, the
 * plugin cannot make a chat for the question, so instead of quietly filing it in the newest chat it opens
 * the same list the + button opens at ten chats ("You have 10 chats", useStartNewChat.tsx). Picking a chat
 * opens the usual Delete chat? box; Delete removes it, makes a fresh chat, and the question then goes into
 * that fresh chat. Cancel and B, in the list or the box, send nothing and leave the question in the box.
 *
 * Used for: index.tsx, which hands the returned `holdAskAtChatLimit` to the Ask code (onAskOllama's first
 * step) through a ref. Every way to ask goes through it: the Ask button, the keyboard's Enter, voice, a
 * retry, a suggestion chip, and the low-memory warning's "Ask anyway".
 *
 * Solves: Plan 87 F2b filed the question in the newest chat with a notice ("Ten chats are saved") because
 * the Ask path could not stop to ask. It can now: the gate runs before the question box is cleared and
 * before the spinner starts.
 *
 * Does not: Delete or make anything by itself, or reach the back end. The list and the boxes are
 * useStartNewChat's own, so the + button and this gate cannot drift apart. The question is carried by
 * heldAsk.ts, which survives the screen being rebuilt as the boxes close.
 *
 * Gotchas: The ring goes back to the chat's name in Decky's title bar (the same place the + button's boxes
 * return it), because the question box is rebuilt when the boxes close and cannot register itself in time.
 * If the screen's chat list is a moment stale, the gate lets the question through and
 * `ensureActiveSlotForAsk` (useChatSlots.ts) is still the safety net: the back end refuses the eleventh
 * chat and the question goes into the newest chat with a notice.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";

import { chatNameElement, returnRingToChatName } from "../title/chatNameNav";
import type { ChatSlotSummary } from "./chatSlotsApi";
import { MAX_CHAT_SLOTS } from "./chatSlotLimit";
import { holdAsk, noteHeldAskBoxClosed, noteHeldAskChatMade, registerLiveAsk, type HeldAskOptions } from "./heldAsk";
import { useStartNewChat } from "./useStartNewChat";

export type UseAskAtChatLimitArgs = {
  /** Every saved chat, newest first (useChatSlots' list). */
  summaries: ReadonlyArray<Pick<ChatSlotSummary, "id" | "label" | "updated_at">>;
  /** The open chat's pointer; null when no chat is open. */
  activeSlotIdRef: { readonly current: string | null };
  /** useChatSlots' `createSlot`: makes the chat and opens it. */
  createSlot: () => Promise<unknown>;
  deleteSlot: (slotId: string) => Promise<boolean>;
  /** The Ask code's `onAskOllama`: sends the held question once the new chat is open. */
  ask: (question: string, opts?: HeldAskOptions) => unknown;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
};

/**
 * In: the chat list, the open chat's pointer, the create and delete calls, and the Ask call.
 * Out: `holdAskAtChatLimit(question, opts)`, true when it opened the list and the Ask must stop, false
 * when the Ask goes on as usual (a chat is open, or fewer than ten are saved).
 */
export function useAskAtChatLimit({
  summaries,
  activeSlotIdRef,
  createSlot,
  deleteSlot,
  ask,
  onBeforeNestedDeckyModal,
  onCompleteNestedDeckyModalClose,
}: UseAskAtChatLimitArgs): (question: string, opts?: HeldAskOptions) => boolean {
  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(
    () =>
      registerLiveAsk({
        ask: (question, opts) => askRef.current(question, opts),
        ready: () => activeSlotIdRef.current !== null,
      }),
    [activeSlotIdRef],
  );

  const chats = useMemo(
    () => summaries.map((row) => ({ id: row.id, label: row.label, updatedAt: row.updated_at })),
    [summaries],
  );
  const makeChat = useCallback(async () => {
    const made = await createSlot();
    if (made) noteHeldAskChatMade();
    return made;
  }, [createSlot]);
  const closeBox = useCallback(
    (close: () => void) => {
      if (onCompleteNestedDeckyModalClose) onCompleteNestedDeckyModalClose(close);
      else close();
      noteHeldAskBoxClosed();
    },
    [onCompleteNestedDeckyModalClose],
  );
  const startNewChat = useStartNewChat({
    chats,
    createSlot: makeChat,
    deleteSlot,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose: closeBox,
  });

  return useCallback(
    (question: string, opts?: HeldAskOptions) => {
      if (activeSlotIdRef.current !== null || summaries.length < MAX_CHAT_SLOTS) return false;
      holdAsk(question, opts);
      startNewChat(chatNameElement(), returnRingToChatName);
      return true;
    },
    [activeSlotIdRef, startNewChat, summaries.length],
  );
}
