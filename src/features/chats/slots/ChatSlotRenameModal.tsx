/**
 * Title: Renaming a saved chat
 *
 * Purpose: The small popup that appears when a person renames one of their
 * saved chats. It is a text box with the current name already filled in,
 * plus Save and Cancel buttons, built with the same popup shell every
 * other bonsAI popup uses.
 *
 * Used for: Opened from the chats menu's Rename chat (useChatSlotRenameModal.tsx).
 *
 * Solves: A consistent-looking way to type a new name, without every place
 * that renames something building its own text-entry popup from scratch.
 *
 * Does not: Actually save the new name. This file only collects the typed
 * text and hands it to whoever opened the popup; saving it is that
 * caller's job. Nor does it open Steam's keyboard itself: A on the field does.
 *
 * Gotchas:
 * - `focusOnMount` moves only the page's focus. When the box opens, the
 *   field's own Steam nav node is also asked to take the ring with the
 *   gamepad flag (`TakeFocus(true)`, the registry's shape), so A on the field
 *   is A on Steam's own focused text field, which brings up its keyboard
 *   (plan 97 L10-fix, for outside controllers). Refused or missing: nothing
 *   else moves. `navRef` is a real Steam prop Decky's types omit, hence the cast.
 */
import React, { useEffect, useRef, useState } from "react";
import { ConfirmModal, TextField } from "@decky/ui";
import { BonsaiModalScope } from "../../../shared/BonsaiModalScope";
import type { NavRefHolder } from "../../../shared/dpad/navFocusRegistry";

/** Steam's own transfer onto the field's node. Out: true when Steam took it; false when unfilled, refused or threw. */
function takeFieldRing(holder: NavRefHolder): boolean {
  const node = holder.current;
  if (!node || typeof node.TakeFocus !== "function") return false;
  try {
    return node.TakeFocus(true) !== false;
  } catch {
    return false;
  }
}

export type ChatSlotRenameModalProps = {
  initialLabel: string;
  onCancel: () => void;
  onConfirm: (label: string) => void | Promise<void>;
};

export function ChatSlotRenameModal({ initialLabel, onCancel, onConfirm }: ChatSlotRenameModalProps) {
  const [label, setLabel] = useState(initialLabel);
  const fieldNavRef = useRef<NavRefHolder["current"]>(null);

  /* Once, after the field mounts; one more try a frame later only if Steam had not filled the node yet. */
  useEffect(() => {
    if (fieldNavRef.current) {
      takeFieldRing(fieldNavRef);
      return;
    }
    const frame = requestAnimationFrame(() => takeFieldRing(fieldNavRef));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <ConfirmModal
      strTitle="Rename chat slot"
      strDescription={
        <BonsaiModalScope>
          <div className="bonsai-chat-slot-modal-label">SLOT NAME</div>
          <div className="bonsai-chat-slot-modal-field">
            <TextField
              value={label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
              focusOnMount
              {...({ navRef: fieldNavRef } as Record<string, unknown>)}
            />
          </div>
        </BonsaiModalScope>
      }
      bOKDisabled={!label.trim()}
      strOKButtonText="Save"
      strCancelButtonText="Cancel"
      onOK={() => {
        void onConfirm(label.trim());
      }}
      onCancel={onCancel}
    />
  );
}
