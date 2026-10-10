/**
 * Title: The Main tab's side of the + and the delete icon on the chat's name row
 *
 * Purpose: Builds the two calls the icons make (chatRowActions.ts) from what the Main tab already holds, and
 * keeps them registered while the Main tab is drawn.
 *   - New chat (the +): exactly what the chats menu's New chat does: F2's shared rule (`useStartNewChat`, in
 *     chat-slots), so below ten chats it makes a chat at once and at ten it opens the same picker ("which chat
 *     to drop"). It also closes the chats menu if it is open. The picker's boxes give the ring back to the
 *     chat's name, as the menu's New chat does.
 *   - Delete chat (the delete icon): the usual "Delete chat?" box for the open chat, Cancel first
 *     (useChatSlotDeleteConfirm.tsx, called, not changed). The ring comes back to the delete icon when the
 *     box closes on Cancel or B, and to the chat's name after Delete, by Steam's transfer (chatRowIconNav.ts).
 *
 * Used for: MainTab.tsx (one call).
 *
 * Solves: The icons live in Decky's title bar, outside the Main tab's tree, so they cannot be handed props;
 * the Main tab registers the calls instead, as it does the chat itself (chatTitleStore.ts).
 *
 * Does not: Draw anything, or decide whether the icons are greyed (the open chat's place does:
 * ChatRowIcons.tsx). Does not change the chats menu: it keeps both its own actions.
 *
 * Gotchas: Closing a Decky box rebuilds the tab behind it, so the "come back here" note is not kept in this
 * hook (it would be gone): it lives in chatRowIconNav.ts, and the box-return registry holds the owner.
 */
import { useCallback, useEffect, useRef } from "react";

import { registerModalReturnFocusOwner } from "../plugin-shell/modalReturnFocusRegistry";
import { useChatSlotDeleteConfirm } from "../chat-slots/useChatSlotDeleteConfirm";
import { useStartNewChat } from "../chat-slots/useStartNewChat";
import { chatNameElement, returnRingToChatName } from "./chatNameNav";
import { clearChatRowActions, registerChatRowActions, type ChatRowActions } from "./chatRowActions";
import { chatIconElement, noteDeleteBoxReturn, returnRingAfterDeleteBox } from "./chatRowIconNav";
import { getChatTitleState, setChatsMenuOpen, useChatTitleValue, type ChatTitleChatRow } from "./chatTitleStore";

/** One empty list for "no chat yet", so the store's reader gets the same value every time. */
const NO_CHATS: ChatTitleChatRow[] = [];

export type ChatRowActionsSource = {
  /** The saved chat on screen; null at the new-chat spot or with no chat. */
  activeSlotId: string | null;
  /** The Main tab's create call (`onChatSlotCreate`), the one the chats menu's New chat calls. */
  createSlot?: () => Promise<unknown>;
  deleteSlot?: (slotId: string) => Promise<boolean>;
  /** Leaves the new-chat spot once a chat is really being made. */
  setAtCreate: (atCreate: boolean) => void;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
};

/** Registers the + and delete icon's calls while the Main tab is drawn. */
export function useChatRowActions(src: ChatRowActionsSource): void {
  const latest = useRef(src);
  latest.current = src;
  const ownerRef = useRef<object>({});

  /* Delete pressed in the box: the chat the icon was for is going, so the ring goes to the name. */
  const deleteSlot = useCallback(async (slotId: string): Promise<boolean> => {
    noteDeleteBoxReturn("name");
    const name = chatNameElement();
    if (name) registerModalReturnFocusOwner("chat-slot-rename", name, returnRingToChatName);
    return (await latest.current.deleteSlot?.(slotId)) ?? false;
  }, []);
  const openDeleteConfirm = useChatSlotDeleteConfirm({
    onBeforeNestedDeckyModal: () => latest.current.onBeforeNestedDeckyModal?.(),
    onCompleteNestedDeckyModalClose: (close) => latest.current.onCompleteNestedDeckyModalClose?.(close),
    onDeleteSlot: deleteSlot,
  });
  const openDeleteRef = useRef(openDeleteConfirm);
  openDeleteRef.current = openDeleteConfirm;

  /* New chat: at once below ten chats; at ten the picker asks which chat to drop (F2's useStartNewChat). */
  const chats = useChatTitleValue((s) => s.chat?.chats ?? NO_CHATS);
  const startNewChat = useStartNewChat({
    chats,
    createSlot: async () => latest.current.createSlot?.(),
    deleteSlot: async (slotId) => (await latest.current.deleteSlot?.(slotId)) ?? false,
    setAtCreate: (atCreate) => latest.current.setAtCreate(atCreate),
    onBeforeNestedDeckyModal: () => latest.current.onBeforeNestedDeckyModal?.(),
    onCompleteNestedDeckyModalClose: (close) => latest.current.onCompleteNestedDeckyModalClose?.(close),
  });
  const startNewRef = useRef(startNewChat);
  startNewRef.current = startNewChat;

  useEffect(() => {
    const owner = ownerRef.current;
    const actions: ChatRowActions = {
      newChat: () => {
        setChatsMenuOpen(false);
        startNewRef.current(chatNameElement(), returnRingToChatName);
      },
      deleteChat: () => {
        const chat = getChatTitleState().chat;
        const slotId = latest.current.activeSlotId;
        /* Nothing to delete at the new-chat spot, as the menu's Delete chat is greyed there. */
        if (!chat || chat.place < 1 || !slotId) return;
        setChatsMenuOpen(false);
        noteDeleteBoxReturn("delete-icon");
        openDeleteRef.current(slotId, chat.name, chatIconElement("delete"), returnRingAfterDeleteBox);
      },
    };
    registerChatRowActions(owner, actions);
    return () => clearChatRowActions(owner);
  }, []);
}
