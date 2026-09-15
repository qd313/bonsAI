/**
 * Title: Renaming a saved chat
 *
 * Purpose: The small popup that appears when a person renames one of their
 * saved chats. It is a text box with the current name already filled in,
 * plus Save and Cancel buttons, built with the same popup shell every
 * other bonsAI popup uses.
 *
 * Used for: Opened from a chat's own row, when renaming it is requested.
 *
 * Solves: A consistent-looking way to type a new name, without every place
 * that renames something building its own text-entry popup from scratch.
 *
 * Does not: Actually save the new name. This file only collects the typed
 * text and hands it to whoever opened the popup; saving it is that
 * caller's job.
 */
import React, { useState } from "react";
import { ConfirmModal, TextField } from "@decky/ui";
import { BonsaiModalScope } from "../../components/BonsaiModalScope";

export type ChatSlotRenameModalProps = {
  initialLabel: string;
  onCancel: () => void;
  onConfirm: (label: string) => void | Promise<void>;
};

export function ChatSlotRenameModal({ initialLabel, onCancel, onConfirm }: ChatSlotRenameModalProps) {
  const [label, setLabel] = useState(initialLabel);

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
