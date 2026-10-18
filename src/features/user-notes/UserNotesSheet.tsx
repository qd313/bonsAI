/**
 * Title: Your notes, over the panel
 *
 * Purpose: What A on the "Read N of your notes" line opens (plan 90 § 2a, drawn on the mock-up board's
 * tab 7, round 2): every note the person kept, newest first, one row each with its words, the game it is
 * for (or "Every game"), a switch, and a Remove button beside it, under the line "Ask reads the ones that
 * are on, every time you ask about that game." A on a row's words flips its switch; A on the bin removes
 * the note; B, or the Close button, closes the sheet and the ring goes back to the line that opened it.
 *
 * Used for: NotesReadLine.tsx, through `openUserNotesSheet()`.
 *
 * Solves: The way to switch a note off, or remove it, from where the person noticed it was read. The
 * Search tab lists the same notes (and flips the same switches) through the same back-end calls.
 *
 * Does not: Decide which notes an answer read, or remember where the ring goes back to: the line does that
 * through userNotesStore.ts. It is a Steam popup (like the chat rename), so closing it rebuilds the tab
 * behind it, and it keeps nothing of its own past that.
 *
 * Focus (a popup of its own, so Steam walks the rows; no move handlers): the rows are siblings in one box
 * and a plain focus is the right move between them. After Remove the ring goes to the row now in its
 * place (or the one before, or Close), because the bin it was on is gone.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Focusable, ModalRoot, showModal } from "@decky/ui";

import { BonsaiModalScope } from "../../shared/BonsaiModalScope";
import { TrashBinIcon } from "../../shared/icons/icons";
import { FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import type { UserNote } from "../search-tab/searchTypes";
import { NotePinIcon } from "./NotePinIcon";
import { listUserNotes, removeNote, switchNote } from "./useUserNotes";
import { endSheetOpen, getUserNotesState } from "./userNotesStore";

export const SHEET_SAY = "Ask reads the ones that are on, every time you ask about that game.";
export const SHEET_EMPTY = "You have no notes.";
export const SHEET_REMOVED = "Removed. Ask won't read it again.";

const SWITCH_W = 34;
const SWITCH_H = 18;

function Switch({ on }: { on: boolean }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: SWITCH_W,
        height: SWITCH_H,
        borderRadius: SWITCH_H / 2,
        background: on ? "#1a9fff" : "#3b4552",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? SWITCH_W - SWITCH_H + 2 : 2,
          width: SWITCH_H - 4,
          height: SWITCH_H - 4,
          borderRadius: "50%",
          background: on ? "#ffffff" : "#c9d1da",
        }}
      />
    </span>
  );
}

export type UserNotesSheetProps = {
  onClose: () => void;
  /** The list call; a test hands in its own. */
  load?: () => Promise<UserNote[]>;
};

/**
 * In: a close function (called once, from B or Close) and, for a test, its own list call.
 * Out: the popup's content: the heading, the say-line, one row per note and Close.
 * Can go wrong: a call the back end refuses shows its words under the list and changes nothing on screen.
 */
export function UserNotesSheet({ onClose, load = listUserNotes }: UserNotesSheetProps): React.ReactElement {
  const [notes, setNotes] = useState<UserNote[] | null>(null);
  const [message, setMessage] = useState("");
  const toggleEls = useRef(new Map<string, HTMLElement>());
  const binEls = useRef(new Map<string, HTMLElement>());
  const closeEl = useRef<HTMLElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    void load().then((list) => {
      if (alive) setNotes(list);
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const closeOnce = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onClose();
  }, [onClose]);

  const flip = async (note: UserNote) => {
    const res = await switchNote(note.id, !note.on);
    if (res.ok && res.note) {
      const saved = res.note;
      setNotes((prev) => (prev ?? []).map((n) => (n.id === saved.id ? saved : n)));
      setMessage("");
    } else if (!res.ok) {
      setMessage(res.error);
    }
  };

  const remove = async (note: UserNote) => {
    const list = notes ?? [];
    const at = list.findIndex((n) => n.id === note.id);
    const res = await removeNote(note.id);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    const rest = list.filter((n) => n.id !== note.id);
    setNotes(rest);
    setMessage(SHEET_REMOVED);
    /* The bin that held the ring is gone: land on the row now in its place, else the one before, else Close. */
    const next = rest[Math.min(at, rest.length - 1)];
    window.setTimeout(() => (next ? toggleEls.current.get(next.id) : closeEl.current)?.focus(), 0);
  };

  const rowButton: React.CSSProperties = { ...SETTINGS_GLASS_BTN, width: "100%" };
  /*
   * Every stop claims all four directions itself, so Steam's own guess (which put Up from Close on a bin and
   * left Left from the bin dead, plan92-P90-NOTES-SHEET.json) is never asked. A note's switch and its bin are
   * one row (Left and Right); Up and Down go note to note in the same column, the bins keeping to the bins,
   * and Close is under the switches. All are siblings in this one popup, so a plain focus is the right move.
   */
  const ids = (notes ?? []).map((n) => n.id);
  /* Looked up when the press happens, not when the sheet is drawn: the buttons register themselves after. */
  const to = (find: () => HTMLElement | null | undefined) => () => {
    find()?.focus();
    return true;
  };
  const column = (els: Map<string, HTMLElement>, id: string, step: -1 | 1) => {
    const at = ids.indexOf(id) + step;
    if (at < 0) return to(() => els.get(id));
    return at >= ids.length ? to(() => closeEl.current) : to(() => els.get(ids[at]!));
  };
  const hold = () => true;
  const moves = (up: () => boolean, down: () => boolean, left: () => boolean, right: () => boolean) => ({
    onMoveUp: up,
    onMoveDown: down,
    onMoveLeft: left,
    onMoveRight: right,
  });
  return (
    <ModalRoot onCancel={closeOnce}>
      <BonsaiModalScope>
        <div className="bonsai-prose" style={{ fontSize: textPx(12), lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: textPx(16), fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>
            <NotePinIcon size={14} className="" />
            Your notes
          </div>
          <div style={{ fontSize: textPx(11), color: "#8fa8c4", marginBottom: 8 }}>{SHEET_SAY}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "46vh", overflowY: "auto" }}>
            {notes === null ? <div style={{ color: "#8fa8c4" }}>Loading your notes…</div> : null}
            {notes !== null && notes.length === 0 ? <div style={{ color: "#8fa8c4" }}>{SHEET_EMPTY}</div> : null}
            {(notes ?? []).map((note) => (
              <div key={note.id} data-bonsai-user-note={note.id} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                <Focusable
                  className="bonsai-settings-focus-btn-host"
                  style={{ flex: "1 1 auto", minWidth: 0 }}
                  {...moves(column(toggleEls.current, note.id, -1), column(toggleEls.current, note.id, 1), hold, to(() => binEls.current.get(note.id)))}
                >
                  <Button
                    className={FOCUS_RING_BTN_CLASS}
                    ref={(el: HTMLElement | null) => {
                      if (el) toggleEls.current.set(note.id, el);
                      else toggleEls.current.delete(note.id);
                    }}
                    aria-label={`${note.text}. ${note.game_title || "Every game"}. ${note.on ? "On" : "Off"}. Press to switch.`}
                    aria-pressed={note.on}
                    onClick={() => void flip(note)}
                    style={{ ...rowButton, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", opacity: note.on ? 1 : 0.7 }}
                  >
                    <span style={{ minWidth: 0, textAlign: "left" }}>
                      <span style={{ display: "block", overflowWrap: "anywhere" }}>{note.text}</span>
                      <span style={{ display: "block", fontSize: textPx(10), color: "#8fa8c4" }}>{note.game_title || "Every game"}</span>
                    </span>
                    <Switch on={note.on} />
                  </Button>
                </Focusable>
                <Focusable
                  className="bonsai-settings-focus-btn-host"
                  style={{ flex: "0 0 auto" }}
                  {...moves(column(binEls.current, note.id, -1), column(binEls.current, note.id, 1), to(() => toggleEls.current.get(note.id)), hold)}
                >
                  <Button
                    className={FOCUS_RING_BTN_CLASS}
                    ref={(el: HTMLElement | null) => {
                      if (el) binEls.current.set(note.id, el);
                      else binEls.current.delete(note.id);
                    }}
                    aria-label={`Remove note: ${note.text}`}
                    onClick={() => void remove(note)}
                    style={{ ...SETTINGS_GLASS_BTN, width: 34, minWidth: 34, padding: 0, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <TrashBinIcon size={14} />
                  </Button>
                </Focusable>
              </div>
            ))}
          </div>
          <div aria-live="polite" style={{ minHeight: 16, margin: "6px 0", fontSize: textPx(11), color: "#8fa8c4" }}>
            {message}
          </div>
          <Focusable
            className="bonsai-settings-focus-btn-host"
            style={{ width: "100%" }}
            {...moves(to(() => toggleEls.current.get(ids[ids.length - 1]!)), hold, hold, hold)}
          >
            <Button
              className={FOCUS_RING_BTN_CLASS}
              ref={(el: HTMLElement | null) => {
                closeEl.current = el;
              }}
              onClick={closeOnce}
              style={rowButton}
            >
              Close
            </Button>
          </Focusable>
        </div>
      </BonsaiModalScope>
    </ModalRoot>
  );
}

/**
 * Opens the sheet as a Steam popup. The shell captures the session first and rebuilds the tab when the
 * popup closes, so the line that opened it (remembered in the store by the caller) takes the ring back.
 */
export function openUserNotesSheet(): void {
  const hooks = getUserNotesState().modalHooks;
  hooks.before?.();
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    const close = () => {
      handle.Close();
      endSheetOpen();
    };
    if (hooks.complete) hooks.complete(close);
    else close();
  };
  const handle = showModal(<UserNotesSheet onClose={finish} />);
}
