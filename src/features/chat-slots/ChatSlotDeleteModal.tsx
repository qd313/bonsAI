/**
 * Title: The "Delete chat slot?" box
 *
 * Purpose: The box the chat row's bin opens. It has exactly two buttons, Cancel and Delete, and
 * Steam puts the ring on Cancel when it opens, so an A pressed by habit keeps the chat. B keeps
 * the chat too. Only A on Delete removes it.
 *
 * Used for: Opened by ChatSlotRow's openDeleteConfirm through showModal.
 *
 * Solves: Steam opens a ConfirmModal with the ring on its OK button and always draws a Cancel
 * button next to it, so the old box needed three buttons ("Keep chat", Delete, Cancel) to keep the
 * first A harmless (plan 79, 2026-10-02). On ModalRoot, the base a ConfirmModal is built on, the
 * buttons are our own: Steam starts the ring on the first one, so Cancel goes first. The same shape
 * as the knowledge-base "Choose download location" box, which was proven on the Deck.
 *
 * Does not: delete anything itself, or close itself. The caller passes onKeep (Cancel, B) and
 * onDelete (Delete) and closes the box from both.
 *
 * Gotchas:
 * - Cancel must stay first in the DOM order; that is what puts the ring on it.
 * - Each button is wired for A (onOKButton on its Focusable) and for a finger (onClick), the way
 *   the download-location box wires its choices, so a guard makes sure one press acts once.
 */
import React, { useRef } from "react";
import { Button, Focusable, ModalRoot } from "@decky/ui";

import { SETTINGS_GLASS_BTN, SETTINGS_GLASS_BTN_DANGER } from "../../styles/settingsGlassButton";

export type ChatSlotDeleteModalProps = {
  label: string;
  onKeep: () => void;
  onDelete: () => void;
};

const Choice: React.FC<{ onChoose: () => void; danger?: boolean; children: React.ReactNode }> = ({
  onChoose,
  danger = false,
  children,
}) => (
  <div className="bonsai-settings-focus-btn-host" style={{ width: "100%" }}>
    <Focusable onOKButton={onChoose}>
      <Button
        className="bonsai-settings-focus-btn"
        onClick={onChoose}
        style={{ ...(danger ? SETTINGS_GLASS_BTN_DANGER : SETTINGS_GLASS_BTN), width: "100%" }}
      >
        {children}
      </Button>
    </Focusable>
  </div>
);

export function ChatSlotDeleteModal({ label, onKeep, onDelete }: ChatSlotDeleteModalProps) {
  const done = useRef(false);
  const once = (act: () => void) => () => {
    if (done.current) return;
    done.current = true;
    act();
  };
  return (
    <ModalRoot onCancel={once(onKeep)}>
      <div className="bonsai-prose" style={{ fontSize: 12, lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 10 }}>Delete chat slot?</div>
        <div style={{ marginBottom: 10 }}>{`Delete "${label}" and its transcript? This cannot be undone.`}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Choice onChoose={once(onKeep)}>Cancel</Choice>
          <Choice danger onChoose={once(onDelete)}>
            Delete
          </Choice>
        </div>
      </div>
    </ModalRoot>
  );
}
