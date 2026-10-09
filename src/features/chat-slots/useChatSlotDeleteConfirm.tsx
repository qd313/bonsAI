/**
 * Title: The "Delete chat slot?" box, opened
 *
 * Purpose: Opens the delete box (ChatSlotDeleteModal.tsx: Cancel first, so an A pressed by habit keeps
 * the chat, and B keeps it too) for one chat, deletes the chat only on Delete, and closes the box through
 * the plugin's own close path so the tab comes back and the ring returns to whatever control registered
 * itself to receive it.
 *
 * Used for: the chats menu's Delete chat (ChatsMenu.tsx).
 *
 * Solves: The open-and-close wiring the old saved-chats row had, taken out of it unchanged when its jobs
 * moved to the chats menu (plan 84 step 5).
 *
 * Does not: Delete anything until Delete is pressed. Does not move the ring itself; the box-return
 * registry (modalReturnFocusRegistry.ts) does, under the "chat-slot-rename" id the row always used.
 */
import { useCallback } from "react";
import { showModal } from "@decky/ui";

import { ChatSlotDeleteModal } from "./ChatSlotDeleteModal";
import {
  rememberModalReturnFocus,
  registerModalReturnFocusOwner,
  type ModalReturnTransfer,
} from "../plugin-shell/modalReturnFocusRegistry";

export type UseChatSlotDeleteConfirmArgs = {
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  onDeleteSlot: (slotId: string) => Promise<boolean>;
};

/**
 * In: the two box callbacks and the delete call. Out: `openDeleteConfirm(slotId, label, returnFocusEl,
 * returnTransfer)`, which opens the box for that chat; `returnFocusEl` is where the ring goes when the box
 * closes, and `returnTransfer` is Steam's transfer onto it when it sits outside the plugin's own box.
 */
export function useChatSlotDeleteConfirm({
  onBeforeNestedDeckyModal,
  onCompleteNestedDeckyModalClose,
  onDeleteSlot,
}: UseChatSlotDeleteConfirmArgs) {
  return useCallback(
    (slotId: string, label: string, returnFocusEl: HTMLElement | null, returnTransfer?: ModalReturnTransfer) => {
      onBeforeNestedDeckyModal?.();
      rememberModalReturnFocus("chat-slot-rename");
      if (returnFocusEl) registerModalReturnFocusOwner("chat-slot-rename", returnFocusEl, returnTransfer);
      /*
        Two buttons, Cancel first: Steam puts the ring on the first button of a box, so an A pressed
        by habit keeps the chat, and B keeps it too (maintainer's call, 2026-10-06; it was three
        buttons since plan 79). See ChatSlotDeleteModal.
      */
      const handle = showModal(
        <ChatSlotDeleteModal
          label={label}
          onKeep={() => {
            onCompleteNestedDeckyModalClose?.(() => handle.Close());
          }}
          onDelete={() => {
            void onDeleteSlot(slotId);
            onCompleteNestedDeckyModalClose?.(() => handle.Close());
          }}
        />,
      );
    },
    [onBeforeNestedDeckyModal, onCompleteNestedDeckyModalClose, onDeleteSlot],
  );
}
