/**
 * Title: Save this exchange to a Desktop note
 *
 * Purpose: The popup that appears when someone chooses to save the current
 * question and answer to a file. It asks for a file name, shows where the
 * note will be saved and that new saves are added to the end of the file
 * rather than overwriting it, and hands the name back once the person
 * confirms.
 *
 * Used for: The chat transcript's reply actions, when someone exports one
 * question-and-answer pair to a note on the Desktop.
 *
 * Solves: A small, single-purpose popup for the one piece of information
 * this action actually needs — a file name — instead of folding it into a
 * bigger settings screen.
 *
 * Does not: Write the file itself, or check whether saving to the Desktop is
 * allowed. The caller does both: it owns the permission check and the
 * actual save, and only tells this popup what to show above the name field.
 */
import React, { useState } from "react";
import { ConfirmModal, TextField } from "@decky/ui";
import { BonsaiModalScope } from "./BonsaiModalScope";

export type DesktopNoteSaveModalProps = {
  /** Shown above the name field (path + append behavior). */
  strDescriptionPrefix: string;
  defaultStem: string;
  onCancel: () => void;
  onConfirm: (stem: string) => void | Promise<void>;
};

/**
 * Permission + name entry for saving the last Q&A to ~/Desktop/bonsAI_logs/<stem>.md (append-only).
 */
export function DesktopNoteSaveModal(props: DesktopNoteSaveModalProps) {
  const { strDescriptionPrefix, defaultStem, onCancel, onConfirm } = props;
  const [stem, setStem] = useState(defaultStem);

  return (
    <ConfirmModal
      strTitle="Save to Desktop note"
      strDescription={
        <BonsaiModalScope>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.35, color: "#c8d4e0" }}>
            {strDescriptionPrefix}
          </div>
          <TextField
            label="Note name (saved as name.md)"
            value={stem}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStem(e.target.value)}
          />
        </div>
        </BonsaiModalScope>
      }
      strOKButtonText="Save"
      strCancelButtonText="Cancel"
      onOK={() => {
        void onConfirm(stem.trim());
      }}
      onCancel={onCancel}
    />
  );
}
