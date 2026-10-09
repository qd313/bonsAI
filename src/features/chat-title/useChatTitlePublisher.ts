/**
 * Title: The Main tab telling Decky's bar which chat is open
 *
 * Purpose: Works out, from what the Main tab already holds, what the chat's name in Decky's bar shows
 * (the open chat's name, "chat 2 of 5" or "not saved yet", the unread and still-writing marks of
 * every chat, whether an answer is being written) and writes it into chatTitleStore.ts while the Main
 * tab is drawn, clearing it again when the Main tab goes away.
 *
 * Used for: MainTab.tsx.
 *
 * Solves: The name row lives in a separate React tree (Decky's title bar), so the Main tab cannot hand
 * it props; it writes here and the name row reads.
 *
 * Does not: Switch, create or rename a chat. The actions it publishes are handed in by the caller.
 *
 * The order of chats is the saved-chats row's own: the list as the back end sends it, newest first,
 * with the new-chat spot before the newest (place 0). "Chat 2 of 5" counts saved chats only.
 */
import { useEffect, useRef } from "react";

import type { ChatListRow } from "../chat-sum-up/chatSumUpModel";
import {
  clearChatTitle,
  publishChatTitle,
  type ChatTitleActions,
  type ChatTitleChat,
} from "./chatTitleStore";

/** What the Main tab knows that the name row needs. */
export type ChatTitleSource = {
  summaries: readonly ChatListRow[] | undefined;
  activeSlotId: string | null | undefined;
  /** The Main tab is showing the new-chat spot (a view, not a saved chat yet). */
  atCreate: boolean;
  generatingSlotId: string | null | undefined;
  unreadSlotIds: ReadonlySet<string> | undefined;
  answerInFlight: boolean;
  /** Nothing has been asked in the chat on screen: no turns and no question waiting. */
  transcriptEmpty: boolean;
};

/** The name a chat nobody has named yet carries, on both sides (chat_slot_service.py, useChatSlots.ts). */
const NEW_CHAT_LABEL = "New chat";

/**
 * Where the open chat sits in the old row's order: 0 for the new-chat spot (or no chat open), 1 to n
 * for the saved chats newest first; null while the open chat is not in the list yet.
 */
export function chatPlace(
  summaries: readonly { id: string }[],
  activeSlotId: string | null | undefined,
  atCreate: boolean,
): number | null {
  if (atCreate || !activeSlotId) return 0;
  const index = summaries.findIndex((row) => row.id === activeSlotId);
  return index < 0 ? null : index + 1;
}

/**
 * In: the Main tab's chat facts. Out: what the name row shows, or null while the open chat is not in
 * the list yet (the list loads a moment after the panel opens; the wordmark shows until then rather
 * than a wrong "New chat").
 */
export function buildChatTitleChat(src: ChatTitleSource): ChatTitleChat | null {
  const summaries = src.summaries ?? [];
  const place = chatPlace(summaries, src.activeSlotId, src.atCreate);
  if (place === null) return null;
  const active = place > 0 ? summaries[place - 1]! : null;
  /* A chat nobody has asked anything in and nobody has named: it is swept when left
     (useChatSlots.ts, `sweepIfNeverUsed`), so to a person it is not saved yet. */
  const unsaved = place === 0 || (src.transcriptEmpty && active?.label === NEW_CHAT_LABEL);
  const generating = src.generatingSlotId ?? null;
  return {
    name: active ? active.label : NEW_CHAT_LABEL,
    place,
    count: summaries.length,
    unsaved,
    answerInFlight: src.answerInFlight,
    chats: summaries.map((row) => ({
      id: row.id,
      label: row.label,
      /* Still writing wins over unread, as on the old row's dots: one chat cannot be both. */
      writing: row.id === generating,
      unread: row.id !== generating && src.unreadSlotIds?.has(row.id) === true,
      updatedAt: row.updated_at,
      current: active?.id === row.id,
    })),
  };
}

/**
 * Writes the chat into the store whenever what the name row shows changes, and clears it when the
 * caller unmounts. `actions` must keep its identity between renders (build it once, read the latest
 * values through a ref): a new object each render would wake the name row on every streamed word.
 */
export function useChatTitlePublisher(src: ChatTitleSource, actions: ChatTitleActions): void {
  const ownerRef = useRef<object>({});
  const chat = buildChatTitleChat(src);
  useEffect(() => {
    if (chat) publishChatTitle(ownerRef.current, chat, actions);
    else clearChatTitle(ownerRef.current);
  });
  useEffect(() => {
    const owner = ownerRef.current;
    return () => clearChatTitle(owner);
  }, []);
}
