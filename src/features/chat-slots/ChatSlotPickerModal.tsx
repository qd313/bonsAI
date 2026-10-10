/**
 * Title: The "Chats are full" box: which chat to drop
 *
 * Purpose: At ten chats, New chat opens this list instead of making a chat. It lists the chats newest
 * first, with the same names the chats menu shows, and a Cancel button last. Pressing a chat does not
 * delete it: it opens the usual Delete chat? box for that chat (Cancel first), so two presses are
 * needed and the second one is a Delete. B and Cancel leave everything as it was.
 *
 * Used for: Opened by useStartNewChat.tsx through showModal.
 *
 * Solves: Starting an eleventh chat used to delete the oldest one without a word. Now nothing is
 * deleted unless the person picked that chat and pressed Delete.
 *
 * Does not: delete or make anything, or close itself. The caller passes onPick and onCancel and closes
 * the box from both.
 *
 * Gotchas:
 * - Steam walks the rows itself: they are siblings in one box, as the Delete box's two buttons are, so
 *   there are no move handlers here. The list scrolls on its own when it is taller than the box, the
 *   way Steam scrolls a focused row into view.
 * - Each row is wired for A (onOKButton on its Focusable) and for a finger (onClick), and one press
 *   acts once.
 */
import React, { useRef } from "react";
import { Button, Focusable, ModalRoot } from "@decky/ui";

import { SETTINGS_GLASS_BTN } from "../../styles/settingsGlassButton";
import { chatWhenLabel } from "../chat-title/chatsMenuModel";
import { MAX_CHAT_SLOTS } from "./chatSlotLimit";

export type ChatPickRow = { id: string; label: string; updatedAt: number };

export type ChatSlotPickerModalProps = {
  /** Every saved chat, newest first. */
  chats: ReadonlyArray<ChatPickRow>;
  onPick: (slotId: string, label: string) => void;
  onCancel: () => void;
};

const Row: React.FC<{ onChoose: () => void; children: React.ReactNode }> = ({ onChoose, children }) => (
  <div className="bonsai-settings-focus-btn-host" style={{ width: "100%" }}>
    <Focusable onOKButton={onChoose}>
      <Button
        className="bonsai-settings-focus-btn"
        onClick={onChoose}
        style={{ ...SETTINGS_GLASS_BTN, width: "100%", display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        {children}
      </Button>
    </Focusable>
  </div>
);

export function ChatSlotPickerModal({ chats, onPick, onCancel }: ChatSlotPickerModalProps) {
  const done = useRef(false);
  const once = (act: () => void) => () => {
    if (done.current) return;
    done.current = true;
    act();
  };
  return (
    <ModalRoot onCancel={once(onCancel)}>
      <div className="bonsai-prose" style={{ fontSize: 12, lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 10 }}>
          {`You have ${MAX_CHAT_SLOTS} chats`}
        </div>
        <div style={{ marginBottom: 10 }}>
          Pick a chat to delete to make room for the new one. You will be asked to confirm. B keeps all of them.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "46vh", overflowY: "auto" }}>
          {chats.map((c) => (
            <Row key={c.id} onChoose={once(() => onPick(c.id, c.label))}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
              <span style={{ opacity: 0.7, flexShrink: 0 }}>{chatWhenLabel(c.updatedAt)}</span>
            </Row>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <Row onChoose={once(onCancel)}>Cancel</Row>
        </div>
      </div>
    </ModalRoot>
  );
}
