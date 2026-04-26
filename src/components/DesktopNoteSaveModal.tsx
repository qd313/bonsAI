import React, { useState } from "react";
import { ConfirmModal, TextField } from "@decky/ui";

export type DesktopNoteSaveModalProps = {
  /** Shown above the name field (path + append behavior). */
  strDescriptionPrefix: string;
  defaultStem: string;
  onCancel: () => void;
  onConfirm: (stem: string) => void | Promise<void>;
};

/**
 * Permission + name entry for saving the last Q&A to ~/Desktop/BonsAI_notes/<stem>.md (append-only).
 */
export function DesktopNoteSaveModal(props: DesktopNoteSaveModalProps) {
  const { strDescriptionPrefix, defaultStem, onCancel, onConfirm } = props;
  const [stem, setStem] = useState(defaultStem);

  return (
    <ConfirmModal
      strTitle="Save to Desktop note"
      strDescription={
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
