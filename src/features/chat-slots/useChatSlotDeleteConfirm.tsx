/**
 * Title: The "Delete chat slot?" box, opened
 *
 * Purpose: Opens the delete box (ChatSlotDeleteModal.tsx: Cancel first, so an A pressed by habit keeps
 * the chat, and B keeps it too) for one chat, deletes the chat only on Delete, and closes the box through
 * the plugin's own close path so the tab comes back and the ring returns to whatever control registered
 * itself to receive it.
 *
 * Used for: the chats menu's Delete chat (ChatsMenu.tsx), and the "Chats are full" picker's second step
 * (useStartNewChat.tsx), which asks for the new chat to be made right after the delete.
 *
 * Solves: The open-and-close wiring the old saved-chats row had, taken out of it unchanged when its jobs
 * moved to the chats menu (plan 84 step 5).
 *
 * Does not: Delete anything until Delete is pressed. Never makes a chat unless a caller asked for one
 * through `replaceWith`, and then only after the delete succeeded. Does not move the ring itself; the box-return
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

/** How long Delete waits, after the new chat is made, for the screen to draw it before the session is saved again. */
const SETTLE_MS = 80;

/** What the picker adds to the plain box. */
export type DeleteConfirmOptions = {
  /** Run once, only after the chat was deleted: makes the new chat. The box stays open until it is done. */
  replaceWith?: () => Promise<unknown>;
  /** Closed together with the box, whichever button closes it (the picker the box was opened over). */
  alsoClose?: () => void;
};

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
    (
      slotId: string,
      label: string,
      returnFocusEl: HTMLElement | null,
      returnTransfer?: ModalReturnTransfer,
      options?: DeleteConfirmOptions,
    ) => {
      onBeforeNestedDeckyModal?.();
      rememberModalReturnFocus("chat-slot-rename");
      if (returnFocusEl) registerModalReturnFocusOwner("chat-slot-rename", returnFocusEl, returnTransfer);
      /*
        Two buttons, Cancel first: Steam puts the ring on the first button of a box, so an A pressed
        by habit keeps the chat, and B keeps it too (maintainer's call, 2026-10-06; it was three
        buttons since plan 79). See ChatSlotDeleteModal.
      */
      const finish = () => {
        onCompleteNestedDeckyModalClose?.(() => {
          handle.Close();
          options?.alsoClose?.();
        });
      };
      const handle = showModal(
        <ChatSlotDeleteModal
          label={label}
          onKeep={finish}
          onDelete={() => {
            const replaceWith = options?.replaceWith;
            if (!replaceWith) {
              void onDeleteSlot(slotId);
              finish();
              return;
            }
            void (async () => {
              try {
                if (await onDeleteSlot(slotId)) {
                  await replaceWith();
                  /*
                    Closing a box rebuilds the plugin from the session saved when the box opened, and
                    that save still names the chat as it was before the new one was made. Saving again
                    once the screen has drawn the new chat makes the rebuild come back on it.
                  */
                  await new Promise((resolve) => window.setTimeout(resolve, SETTLE_MS));
                  onBeforeNestedDeckyModal?.();
                }
              } finally {
                finish();
              }
            })();
          }}
        />,
      );
    },
    [onBeforeNestedDeckyModal, onCompleteNestedDeckyModalClose, onDeleteSlot],
  );
}
