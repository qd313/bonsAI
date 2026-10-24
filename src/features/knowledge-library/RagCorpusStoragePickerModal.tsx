/**
 * Title: The knowledge base's "Choose download location" box
 *
 * Purpose: The small box that asks where to put the knowledge base before the first download: "Not now",
 * "Internal storage (~N GB free)" and, when a card is in, "SD card (~N GB free)". Moved out of
 * KnowledgeBaseSection.tsx unchanged, so that file stays under its size limit (plan 89).
 *
 * Used for: KnowledgeBaseSection.tsx, which opens it with showModal() before a first download.
 *
 * Solves: A download needs a place to go, and the Deck has two. The box lists them with their free
 * space and starts the download only on a deliberate choice (see the Focus note below).
 *
 * Does not: Start the download itself (the caller's onPick does) or know what is being downloaded.
 */
import React from "react";
import { Button, Focusable, ModalRoot } from "@decky/ui";

import { SETTINGS_GLASS_BTN } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";

export type RagStorageOption = {
  id?: string;
  label?: string;
  install_path?: string;
  mount?: string;
  free_bytes?: number;
};

const formatFreeGb = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "unknown free space";
  return `~${Math.round(bytes / (1024 * 1024 * 1024))} GB free`;
};

type StoragePickerModalProps = {
  internal: RagStorageOption;
  sdCard: RagStorageOption | null | undefined;
  onPick: (installPath: string, storage: string) => void;
  onClose: () => void;
};

/** One full-width choice in the picker, wired for both A and a finger, the way the choices always were. */
const StoragePickerChoice: React.FC<{ onChoose: () => void; children: React.ReactNode }> = ({
  onChoose,
  children,
}) => (
  <div className="bonsai-settings-focus-btn-host" style={{ width: "100%" }}>
    <Focusable onOKButton={onChoose}>
      <Button className="bonsai-settings-focus-btn" onClick={onChoose} style={{ ...SETTINGS_GLASS_BTN, width: "100%" }}>
        {children}
      </Button>
    </Focusable>
  </div>
);

/**
 * Focus: Steam starts the ring on the first button in a box. As a ConfirmModal the storage buttons
 * sat in its text, ahead of its own Close, so the box opened with the ring on "Internal storage" and
 * one A started a download (Deck: plan64-TWO-TAPS-DOWNLOAD-try3.json, plan70-R5.json). A
 * ConfirmModal has no safe slot for a third choice -- its Cancel is also B -- so the picker is drawn
 * on ModalRoot, the base a ConfirmModal is built on, with "Not now" first and the two storage
 * choices after it: the download notice's own rule (downloadNotice.tsx), same actions as before.
 * B also closes it, downloading nothing.
 */
export const RagCorpusStoragePickerModal: React.FC<StoragePickerModalProps> = ({
  internal,
  sdCard,
  onPick,
  onClose,
}) => (
  <ModalRoot onCancel={onClose}>
    <div className="bonsai-prose" style={{ fontSize: textPx(12), lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
      <div style={{ fontSize: textPx(16), fontWeight: 700, color: "#ffffff", marginBottom: 10 }}>Choose download location</div>
      <div style={{ marginBottom: 10 }}>
        Wiki-derived strategy cards and compat notes (small — well under 5 MB). No Ask text is uploaded.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <StoragePickerChoice onChoose={onClose}>Not now</StoragePickerChoice>
        <StoragePickerChoice onChoose={() => onPick(internal.install_path ?? "~/.bonsai/rag", "internal")}>
          Internal storage ({formatFreeGb(internal.free_bytes)})
        </StoragePickerChoice>
        {sdCard?.install_path ? (
          <StoragePickerChoice onChoose={() => onPick(sdCard.install_path!, "sd_card")}>
            SD card ({formatFreeGb(sdCard.free_bytes)})
          </StoragePickerChoice>
        ) : (
          <div style={{ fontSize: textPx(11), color: "#9fb7d5", lineHeight: 1.35 }}>
            No SD card detected. Insert a microSD formatted for Steam Deck storage, then try again.
          </div>
        )}
      </div>
    </div>
  </ModalRoot>
);
