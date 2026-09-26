/**
 * Title: The note under an answer that came right after summing up, and the warning when it failed
 *
 * Purpose: Plan 68's two lines in the chat itself. Under the answer that came right after the chat
 * summed itself up: "The chat summed itself up before this answer. Press to read what it kept." —
 * on the newest answer a D-pad stop that opens Show details on the Session tab; on an older answer
 * the plain "The chat summed itself up here.". And, when summing up failed or ran out of time,
 * one warning line between the question and the answer saying so.
 *
 * Used for: MainTabChatTranscript.tsx, on an open archived turn; both read the saved answer's own
 * `chatSummary`, so they stay with that answer after a reload or a restart.
 *
 * Solves: Summing up happens without asking first (D118), so the chat has to say afterwards that
 * it happened and where to read what it kept — and, when it could not, that this answer only knew
 * the newest turns.
 *
 * Does not: Open the panel itself (the transcript owns Show details' state and hands `onOpen` in),
 * or draw the waiting line while the summary is written — that line comes from the back end.
 *
 * Focus graph (plan 68 § 6), on the newest answer only:
 *
 *   the answer's last paragraph  [ Copy ]
 *      | Down (from either)              ^ Up
 *   The chat summed itself up ...         <- stop, registered as the "summary-note" reply stop
 *      | Down                            ^ Up (from the branch picker, the checklist, Helpful)
 *   the branch picker / checklist when they show, else Helpful -> Read aloud -> Show details
 *
 * A opens Show details on the Session tab and moves the ring to *Sum up this chat*. `onOKButton` and
 * `onClick`, never `onActivate` too: Steam fires `onActivate` for A as well, so wiring both would
 * run the opener twice (docs/focus-graph.md).
 */
import React from "react";
import { Focusable } from "@decky/ui";

import { focusLastAnswerChunk } from "../../utils/answerBubbleNavigation";
import { focusStrategyChromeFromAbove, queryTurnSlot } from "../../utils/liveTurnFocusGraph";
import { focusRegisteredReplyStop, registerReplyStop } from "../../utils/replyStopRegistry";
import { isDeckDirectionDownEvent, isDeckDirectionUpEvent } from "../../utils/focusNavigation";
import { elementHasGamepadFocus } from "../../utils/uiDocument";
import { focusSumUpButton } from "./SessionSumUpSection";

const NOTE_NEWEST = "The chat summed itself up before this answer. Press to read what it kept.";
const NOTE_OLDER = "The chat summed itself up here.";
const WARNING_FAILED =
  "Couldn't sum up the chat this time, so this answer only knows the newest turns. It will try again on your next question.";

/** The 13-pixel squeeze icon the drawing uses: four corners pressed inward. */
function SqueezeIcon(): React.ReactElement {
  return (
    <svg className="bonsai-chat-summary-note-icon" width={13} height={13} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The warning line, drawn only for an answer whose summary failed or ran out of time. */
export function buildChatSummaryWarningElement(chatSummary: string | null | undefined): React.ReactElement | null {
  if (chatSummary !== "failed") return null;
  return (
    <div className="bonsai-chat-status-line bonsai-chat-summary-warn" role="status">
      {WARNING_FAILED}
    </div>
  );
}

/**
 * Down off the note: the branch picker or checklist when this answer has one (the same hand-off the
 * answer bubble's own Down uses), otherwise the reply row's live stops in reading order.
 */
function downFromNote(turnKey: string): boolean {
  return (
    focusStrategyChromeFromAbove(queryTurnSlot(turnKey)) ||
    focusRegisteredReplyStop("helpful") ||
    focusRegisteredReplyStop("read-aloud") ||
    focusRegisteredReplyStop("show-details")
  );
}

export function buildChatSummaryNoteElement(args: {
  turnKey: string;
  chatSummary: string | null | undefined;
  /** Only the newest answer's note is a stop that opens anything. */
  isNewest: boolean;
  /** Opens Show details on the Session tab for this turn. */
  onOpen: () => void;
}): React.ReactElement | null {
  const { turnKey, chatSummary, isNewest, onOpen } = args;
  if (chatSummary !== "written") return null;
  if (!isNewest) {
    return (
      <div className="bonsai-chat-summary-note bonsai-chat-summary-note--older">
        <SqueezeIcon />
        <span>{NOTE_OLDER}</span>
      </div>
    );
  }
  let selfEl: HTMLElement | null = null;
  const up = () => focusLastAnswerChunk(turnKey);
  const down = () => downFromNote(turnKey);
  return (
    <Focusable
      key={`chat-summary-note-${turnKey}`}
      className="bonsai-chat-summary-note"
      ref={(el: HTMLElement | null) => {
        selfEl = el;
        registerReplyStop("summary-note", el);
      }}
      aria-label={NOTE_NEWEST}
      onOKButton={onOpen}
      onClick={onOpen}
      {...({
        onMoveUp: up,
        onMoveDown: down,
        onButtonDown: (evt: unknown) => {
          if (selfEl && !elementHasGamepadFocus(selfEl)) return false;
          if (isDeckDirectionUpEvent(evt)) return up();
          if (isDeckDirectionDownEvent(evt)) return down();
          return false;
        },
      } as Record<string, unknown>)}
    >
      <SqueezeIcon />
      <span>{NOTE_NEWEST}</span>
    </Focusable>
  );
}

/** How long to keep trying to land on the button while the panel mounts, and how often. */
const OPEN_FOCUS_TRIES = 12;
const OPEN_FOCUS_EVERY_MS = 50;

/**
 * After the note's A has asked for Show details on the Session tab: the panel mounts on the next
 * render, so the ring is moved once the button exists, trying for a short while and then giving up
 * quietly (the ring then stays on the note, which is still a sensible place).
 */
export function focusSumUpButtonWhenMounted(): void {
  let tries = 0;
  const attempt = () => {
    if (focusSumUpButton()) return;
    tries += 1;
    if (tries < OPEN_FOCUS_TRIES) window.setTimeout(attempt, OPEN_FOCUS_EVERY_MS);
  };
  window.setTimeout(attempt, 0);
}
