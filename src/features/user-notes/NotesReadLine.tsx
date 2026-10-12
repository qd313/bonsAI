/**
 * Title: The line above an answer that says it read your notes
 *
 * Purpose: When an answer was written with some of the person's notes in hand, one small line sits between
 * the question and the answer: "Read 2 of your notes ▸" (or "Read 1 of your notes ▸"); when every note for
 * that game was switched off, "Your notes are all off ▸". A on it opens the notes sheet. It reads the
 * turn's own saved record (`user_notes_attached` and `user_notes_off_count`, plan 92 contract C4), the same
 * one Show details reads, so the line and the "Your notes" chip can never disagree. With nothing read and
 * nothing off, there is no line at all.
 *
 * Used for: MainTabChatTranscript.tsx, on the open archived turn, between the question and the answer.
 *
 * Solves: Tells the person, where they are reading, that their notes shaped this answer, and is the way in
 * to switch one off or remove it (there is no notes screen of its own on the Main tab).
 *
 * Does not: Draw the sheet (UserNotesSheet.tsx), call the back end, or decide which notes were read (the
 * back end did, before the answer). It holds no state: which line opened the sheet is kept in
 * userNotesStore.ts, because closing the sheet rebuilds the tab and this line with it.
 *
 * Focus graph (new controls, AGENTS.md "Adding a new control"; docs/focus-graph.md, "The notes line"). The
 * line is one stop, registered as the "notes-line" reply stop, with Steam's own nav node so a transfer can
 * land on it. Steam calls the move handlers, so it carries all four and claims each press:
 *
 *   the question (its text, or its row when it has no Retry)
 *      | Down                                 ^ Up
 *   Read 1 of your notes ▸                      A opens the sheet; Left and Right hold still
 *      | Down                                 ^ Up
 *   the Show reasoning line when this turn has one, else the answer's first section
 *
 * The sheet is a Steam popup. When it closes, the tab is rebuilt and this line is drawn again; the line
 * that opened it is remembered in the store and takes the ring back (a few tries, while the tab mounts).
 */
import React, { useEffect, useRef } from "react";
import { Focusable } from "@decky/ui";

import { NotePinIcon } from "./NotePinIcon";
import { beginSheet, getUserNotesState, sheetReturnDone, useUserNotesState } from "./userNotesStore";
import { focusFirstAnswerChunk } from "../../utils/answerBubbleNavigation";
import { focusDeckOwner, focusReplyShowReasoning, queryTurnSlot } from "../../utils/liveTurnFocusGraph";
import { focusOpenQuestionText } from "../../utils/buildTurnHeaderElement";
import {
  isDeckDirectionDownEvent,
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDeckDirectionUpEvent,
} from "../../utils/focusNavigation";
import { focusRegisteredReplyStop, registerReplyStop, replyStopNavRef } from "../../utils/replyStopRegistry";
import { elementHasGamepadFocus } from "../../utils/uiDocument";
import type { ChatSlotTurnTransparency, TransparencySnapshot } from "../../utils/inputTransparency";
import { openUserNotesSheet } from "./UserNotesSheet";

/** How often the ring is put back on the line while the rebuilt tab mounts (the window is in the store). */
const RETURN_EVERY_MS = 60;
/** How long the line must hold the ring, undisturbed, before the claim is over. */
const RETURN_SETTLED_MS = 1000;

export type NotesRead = { read: number; off: number };

/** What a turn's saved record says about notes; zeros on a turn saved before notes existed. */
export function notesReadFromSnapshot(
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | null | undefined,
): NotesRead {
  const read = Array.isArray(snapshot?.user_notes_attached) ? snapshot.user_notes_attached.length : 0;
  const off = typeof snapshot?.user_notes_off_count === "number" ? snapshot.user_notes_off_count : 0;
  return { read, off };
}

/** The line's words: "Read 1 of your notes", "Read 2 of your notes", "Your notes are all off", or null for no line. */
export function notesLineLabel({ read, off }: NotesRead): string | null {
  if (read > 0) return `Read ${read} of your notes`;
  if (off > 0) return "Your notes are all off";
  return null;
}

/** Up from the line: the question's own text, else its row. Both are in this turn's column, so a plain focus is right. */
function upToQuestion(turnKey: string): boolean {
  if (focusOpenQuestionText(turnKey)) return true;
  const header = queryTurnSlot(turnKey)?.querySelector<HTMLElement>(".bonsai-chat-turn-row-header");
  return focusDeckOwner(header);
}

/** Down from the line: the Show reasoning line when this turn has one, else the answer's first section. */
function downToAnswer(turnKey: string): boolean {
  return focusReplyShowReasoning(null) || focusFirstAnswerChunk(turnKey);
}

/**
 * In: the turn's key and how many notes its answer read and how many matching ones were off.
 * Out: the line (a Focusable stop), or null when both are zero.
 * Can go wrong: nothing; opening the sheet and taking the ring back are best effort and give up quietly.
 */
export function NotesReadLine({ turnKey, notes }: { turnKey: string; notes: NotesRead }): React.ReactElement | null {
  const s = useUserNotesState();
  const el = useRef<HTMLElement | null>(null);
  const label = notesLineLabel(notes);
  const returning =
    label !== null && s.sheetOpenedFrom === turnKey && !s.sheetOpen && Date.now() < s.sheetReturnUntil;

  /*
   * The sheet closed and this line was drawn again: take the ring back. Landing does not end the claim: the
   * tab is drawn more than once when a popup closes and the ring is lost with each old line, so every line
   * drawn inside the window tries until it holds the ring, and the window ends the claim.
   */
  useEffect(() => {
    if (!returning) return undefined;
    let timer: number | undefined;
    let heldSince = 0;
    const attempt = () => {
      if (Date.now() >= getUserNotesState().sheetReturnUntil) {
        sheetReturnDone();
        return;
      }
      if (elementHasGamepadFocus(el.current)) {
        /* Held for a whole second without being drawn again: the tab has settled, the claim is over. */
        heldSince ||= Date.now();
        if (Date.now() - heldSince >= RETURN_SETTLED_MS) {
          sheetReturnDone();
          return;
        }
      } else {
        heldSince = 0;
        focusRegisteredReplyStop("notes-line");
      }
      timer = window.setTimeout(attempt, RETURN_EVERY_MS);
    };
    attempt();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [returning]);

  if (label === null) return null;
  const open = () => {
    beginSheet(turnKey);
    openUserNotesSheet();
  };
  const up = () => upToQuestion(turnKey);
  const down = () => downToAnswer(turnKey);
  const hold = () => true;
  return (
    <Focusable
      key={`notes-line-${turnKey}`}
      className="bonsai-notes-line"
      ref={(node: HTMLElement | null) => {
        el.current = node;
        registerReplyStop("notes-line", node);
      }}
      aria-label={`${label}. Press to see them.`}
      onOKButton={open}
      onClick={open}
      {...({
        navRef: replyStopNavRef("notes-line"),
        onMoveUp: up,
        onMoveDown: down,
        onMoveLeft: hold,
        onMoveRight: hold,
        onButtonDown: (evt: unknown) => {
          if (el.current && !elementHasGamepadFocus(el.current)) return false;
          if (isDeckDirectionUpEvent(evt)) return up();
          if (isDeckDirectionDownEvent(evt)) return down();
          if (isDeckDirectionLeftEvent(evt) || isDeckDirectionRightEvent(evt)) return hold();
          return false;
        },
      } as Record<string, unknown>)}
    >
      <NotePinIcon size={10} />
      <span>{label}</span>
      <span className="bonsai-notes-line__chev">▸</span>
    </Focusable>
  );
}

/** What the transcript mounts above an answer: the line for this turn's saved record, or nothing. */
export function buildNotesReadLine(
  turnKey: string,
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | null | undefined,
): React.ReactElement | null {
  const notes = notesReadFromSnapshot(snapshot);
  return notesLineLabel(notes) === null ? null : <NotesReadLine turnKey={turnKey} notes={notes} />;
}
