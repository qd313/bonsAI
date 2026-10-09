/**
 * Title: Rename-a-chat popup
 *
 * Purpose: Opens the small popup a person types a new name into, and
 * remembers where the ring goes once it closes.
 *
 * Used for: Rename chat in the chats menu (plan 84 step 5); the ring goes
 * back to the chat's name in Decky's bar.
 *
 * Solves: Nothing else here — this hook only opens the popup and wires up
 * its Cancel and Confirm buttons.
 *
 * Does not: Update the chat list on screen after a rename — the caller is
 * expected to refresh it once `onRename` finishes.
 */
import { useCallback } from "react";
import { showModal } from "@decky/ui";

import { ChatSlotRenameModal } from "./ChatSlotRenameModal";
import {
  rememberModalReturnFocus,
  registerModalReturnFocusOwner,
  type ModalReturnTransfer,
} from "../plugin-shell/modalReturnFocusRegistry";

export type UseChatSlotRenameModalArgs = {
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  onRename: (slotId: string, label: string) => Promise<boolean>;
};

/**
 * In: two optional callbacks for a popup opened from inside another popup,
 * and the function that actually saves the new name.
 * Out: one function, `openRenameModal()`, that a chat row calls with the
 * chat's id, its current name, the button to return focus to, and, when
 * that button sits outside the plugin's own box (the chat's name in
 * Decky's bar), Steam's transfer onto it.
 * Can go wrong: if the caller does not pass a return-focus element,
 * nothing focuses back anywhere when the popup closes.
 */
export function useChatSlotRenameModal({
  onBeforeNestedDeckyModal,
  onCompleteNestedDeckyModalClose,
  onRename,
}: UseChatSlotRenameModalArgs) {
  const openRenameModal = useCallback(
    (
      slotId: string,
      currentLabel: string,
      returnFocusEl: HTMLElement | null,
      returnTransfer?: ModalReturnTransfer,
    ) => {
      onBeforeNestedDeckyModal?.();
      rememberModalReturnFocus("chat-slot-rename");
      if (returnFocusEl) registerModalReturnFocusOwner("chat-slot-rename", returnFocusEl, returnTransfer);

      const handle = showModal(
        <ChatSlotRenameModal
          initialLabel={currentLabel}
          onCancel={() => {
            onCompleteNestedDeckyModalClose?.(() => handle.Close());
          }}
          onConfirm={async (label) => {
            if (label) await onRename(slotId, label);
            onCompleteNestedDeckyModalClose?.(() => handle.Close());
          }}
        />,
      );
    },
    [onBeforeNestedDeckyModal, onCompleteNestedDeckyModalClose, onRename],
  );

  return { openRenameModal };
}
