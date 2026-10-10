/**
 * Title: Start a new chat, asking which chat to drop at the limit
 *
 * Purpose: The one rule for "start a new chat". Below ten chats it makes one at once. At ten it opens
 * the "You have 10 chats" picker (ChatSlotPickerModal.tsx); picking a chat opens the usual Delete chat?
 * box for it (Cancel first); Delete removes that chat and then makes the new chat, which becomes the
 * open one; Cancel and B, in the picker or the box, change nothing. Nothing is ever deleted without the
 * box.
 *
 * Used for: the chats menu's New chat (ChatsMenu.tsx). The + beside the chat's name (plan 87 F5) calls
 * the same function, so it follows the same rule and no copy of it can drift.
 *
 * Solves: The back end refuses to make an eleventh chat (chat_slot_service.py, `ChatLimitReached`), where
 * it used to delete the oldest one silently. This is the screen's half: it asks the person first.
 *
 * Does not: Count on the number it checks. The list it is given may be a moment stale, so the back end
 * is the real guard: a create it refuses makes nothing and the picker is not skipped for it.
 *
 * Gotchas: Closing a Decky box rebuilds the tab behind it, so nothing here remembers where the ring goes
 * in component state: the caller names the element and Steam's transfer, and the box-return registry
 * (modalReturnFocusRegistry.ts, under the id the chat boxes always used) keeps them outside React.
 */
import { useCallback } from "react";
import { showModal } from "@decky/ui";

import { ChatSlotPickerModal, type ChatPickRow } from "./ChatSlotPickerModal";
import { MAX_CHAT_SLOTS } from "./chatSlotLimit";
import { useChatSlotDeleteConfirm } from "./useChatSlotDeleteConfirm";
import {
  rememberModalReturnFocus,
  registerModalReturnFocusOwner,
  type ModalReturnTransfer,
} from "../plugin-shell/modalReturnFocusRegistry";

export type UseStartNewChatArgs = {
  /** Every saved chat, newest first (the Main tab's list; the chat title store's `chats`). */
  chats: ReadonlyArray<ChatPickRow>;
  /** Makes the chat and opens it (useChatSlots' `createSlot`). */
  createSlot: () => Promise<unknown>;
  deleteSlot: (slotId: string) => Promise<boolean>;
  /** Leaves the new-chat spot, if the caller has one, once a chat is really being made. */
  setAtCreate?: (atCreate: boolean) => void;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
};

/**
 * In: the chat list and the create and delete calls. Out: `startNewChat(returnFocusEl, returnTransfer)`;
 * `returnFocusEl` is where the ring goes when the picker or the box closes and `returnTransfer` is
 * Steam's transfer onto it when it sits outside the plugin's own box (the chat's name).
 *
 * 1. Fewer than ten chats: make the chat now; "made" is what comes back.
 * 2. Ten: open the picker and hand back "asking". The rest happens in the boxes.
 */
export function useStartNewChat({
  chats,
  createSlot,
  deleteSlot,
  setAtCreate,
  onBeforeNestedDeckyModal,
  onCompleteNestedDeckyModalClose,
}: UseStartNewChatArgs) {
  const openDeleteConfirm = useChatSlotDeleteConfirm({
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    onDeleteSlot: deleteSlot,
  });

  return useCallback(
    (returnFocusEl: HTMLElement | null, returnTransfer?: ModalReturnTransfer): "made" | "asking" => {
      const make = async () => {
        setAtCreate?.(false);
        await createSlot();
      };
      if (chats.length < MAX_CHAT_SLOTS) {
        void make();
        return "made";
      }
      onBeforeNestedDeckyModal?.();
      rememberModalReturnFocus("chat-slot-rename");
      if (returnFocusEl) registerModalReturnFocusOwner("chat-slot-rename", returnFocusEl, returnTransfer);
      const closePicker = () => onCompleteNestedDeckyModalClose?.(() => picker.Close());
      const picker = showModal(
        <ChatSlotPickerModal
          chats={chats}
          onCancel={closePicker}
          onPick={(slotId, label) =>
            openDeleteConfirm(slotId, label, returnFocusEl, returnTransfer, {
              replaceWith: make,
              alsoClose: () => picker.Close(),
            })
          }
        />,
      );
      return "asking";
    },
    [chats, createSlot, onBeforeNestedDeckyModal, onCompleteNestedDeckyModalClose, openDeleteConfirm, setAtCreate],
  );
}
