/**
 * Title: Changing the words of a note before keeping it
 *
 * Purpose: The small popup Edit opens on the note card: a text box with the note's words already in it,
 * plus Save and Cancel, shaped like the popup that renames a chat (ChatSlotRenameModal.tsx) and built with
 * the same popup shell. Save is greyed while the box is empty.
 *
 * Used for: Opened from the note card's Edit button (openNoteEditModal in NoteOfferCard.tsx).
 *
 * Solves: A way to fix the offered words, such as "I'm doing a Steel Soul run", without a second screen.
 *
 * Does not: Keep anything. It hands the typed words to whoever opened it; the card puts them in the store
 * and Keep is what saves the note. It does not cut a long text: a text over 200 characters is refused by
 * the back end when Keep is pressed, with the back end's own words on the card.
 */
import React, { useState } from "react";
import { ConfirmModal, TextField } from "@decky/ui";

import { BonsaiModalScope } from "../../shared/BonsaiModalScope";

export type NoteEditModalProps = {
  initialText: string;
  onCancel: () => void;
  onConfirm: (text: string) => void;
};

export function NoteEditModal({ initialText, onCancel, onConfirm }: NoteEditModalProps): React.ReactElement {
  const [text, setText] = useState(initialText);
  return (
    <ConfirmModal
      strTitle="Edit note"
      strDescription={
        <BonsaiModalScope>
          <div className="bonsai-chat-slot-modal-label">NOTE</div>
          <div className="bonsai-chat-slot-modal-field">
            <TextField
              value={text}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
              focusOnMount
            />
          </div>
        </BonsaiModalScope>
      }
      bOKDisabled={!text.trim()}
      strOKButtonText="Save"
      strCancelButtonText="Cancel"
      onOK={() => onConfirm(text.trim())}
      onCancel={onCancel}
    />
  );
}
