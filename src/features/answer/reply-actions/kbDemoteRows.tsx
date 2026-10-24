/**
 * Title: Telling bonsAI a note it used was wrong (the rows under "What went wrong?")
 *
 * Purpose: When an answer used a note from the knowledge base and a person presses Not really, three more
 * reasons appear after the usual five: Wrong tip, Outdated, Wrong edition (plan 98, the maintainer's pick
 * "option C"). Picking one marks the note so it ranks lower for questions like this one, and the reasons
 * are replaced by one line: "Marked not helpful" with an Undo beside it, and under it, in gold,
 * Noted — "<note>" will rank lower for questions like this.
 *
 * Used for: buildReplyActionsElement.tsx draws these rows; useReplyFeedbackChips.ts holds what was picked
 * and makes the call through the function it is handed.
 *
 * Solves: A note that was wrong for the question came back on the next one all the same. The back end keeps
 * a count per note and ranks a marked note lower; this is the screen half.
 *
 * Does not: Call the plugin itself (the hook is handed the call), decide how far a note drops (the back end
 * does), or draw the five older reasons (buildReplyActionsElement.tsx).
 *
 * Focus graph (AGENTS.md, "Adding a new control"). Every stop here is its own Steam Focusable with its own
 * nav node and all four moves, A on `onOKButton` (a tap on `onClick`), so a move between two of them is
 * never left to Steam's own step inside one container, and each hears A because it sits inside the
 * plugin's own reply row:
 *
 *   [Spoiled it] [Too long] [Too short]              the five reasons' second row
 *      | Down (same column)          ^ Up (same column)
 *   [Wrong tip] --Right--> [Outdated] --Right--> [Wrong edition]     Left at the first and Right at the last hold
 *      | Down                          ^ Up (from Show details or the note card: the first chip)
 *   the note card's Keep, else Show details
 *
 *   after A on a reason:
 *   Not really (greyed)
 *      | Down                          ^ Up
 *   Marked not helpful          [Undo]     A undoes; Left and Right hold
 *      | Down                          ^ Up
 *   the note card's Keep, else Show details
 *
 * The ring is handed on after a press removes the stop that held it (handRingOnWhenGone.ts): onto Undo
 * after a reason, back onto the reason after Undo.
 */
import React from "react";
import { Focusable } from "@decky/ui";

import type { KbAttachedNote } from "../../../types/inputTransparency";
import {
  isDeckDirectionDownEvent,
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDeckDirectionUpEvent,
} from "../../../shared/dpad/focusNavigation";
import { elementHasFocus, elementHasGamepadFocus } from "../../../shared/dpad/uiDocument";
import { pressThenHandRingOn } from "../../../shared/dpad/handRingOnWhenGone";
import { registerReplyStop, replyStopNavRef } from "../../../shared/dpad/replyStopRegistry";
import { formatDeckyRpcError } from "../../../shared/deckyCall";
import { kbNoteDisplayName } from "../../knowledge-library/buildKbNotesBlockElement";

/** The three reasons, in the order drawn. The ids are the back end's (the feedback log and the demote store). */
export type DemoteReasonId = "wrong_tip" | "outdated" | "wrong_edition";
const DEMOTE_REASONS: ReadonlyArray<{ id: DemoteReasonId; label: string }> = [
  { id: "wrong_tip", label: "Wrong tip" },
  { id: "outdated", label: "Outdated" },
  { id: "wrong_edition", label: "Wrong edition" },
];

/**
 * An attached note with the two fields the back end adds for this (plan 98 lane C): the library's own id of
 * the note or tip (0 when unknown) and whether it is already marked. Read here until the shared type has them.
 */
export type DemotableNote = KbAttachedNote & { section_id?: number; demoted?: boolean };

/** What the back end answers: whether it was kept, the note's count now, and whether it is now left out. */
export type DemoteNoteResult = { ok?: boolean; downs?: number; excluded?: boolean };
/** The plugin call, handed in so the screen can be tested (and built) before the back end has it. */
export type DemoteNoteFn = (
  sectionId: number,
  kind: "tip" | "note",
  reason: DemoteReasonId,
  undo: boolean,
) => Promise<DemoteNoteResult>;

/** Where the rows are: the reasons (with the one last picked, for the ring's way back), or marked. */
export type ReplyDemoteState =
  | { phase: "reasons"; reason: DemoteReasonId | null; error?: string }
  | { phase: "done"; reason: DemoteReasonId; picked: DemotableNote[]; error?: string };

export const DEMOTE_START: ReplyDemoteState = { phase: "reasons", reason: null };

/** What a press here asks the hook to do. */
export type ReplyDemoteActions = {
  /** A reason was picked on an answer that used these notes. */
  choose: (reason: DemoteReasonId, notes: readonly DemotableNote[]) => void;
  undo: () => void;
};

/** Everything the reply row needs to draw these rows for one answer. */
export type ReplyDemoteView = ReplyDemoteActions & { state: ReplyDemoteState; notes: readonly DemotableNote[] };

/** The notes that can be marked: only those the back end gave an id (an older saved chat has none). */
export function demotableNotes(notes: readonly DemotableNote[] | null | undefined): DemotableNote[] {
  return (notes ?? []).filter((n) => typeof n.section_id === "number" && n.section_id > 0);
}

/** Tip ids and note ids overlap, so the call says which. */
function demoteKind(note: DemotableNote): "tip" | "note" {
  return note.kind === "tip" ? "tip" : "note";
}

/** The gold line after a reason. A protected boss note keeps its neutral title here too. */
function demoteConfirmation(picked: readonly DemotableNote[]): string {
  const what = picked.length === 1 ? `"${kbNoteDisplayName(picked[0]!)}"` : "these notes";
  return `Noted — ${what} will rank lower for questions like this.`;
}

/**
 * Make (or undo) the mark on every picked note. Returns null when all were kept, else the first problem in
 * plain words. Never throws.
 */
export async function sendDemotes(
  demoteNote: DemoteNoteFn | undefined,
  picked: readonly DemotableNote[],
  reason: DemoteReasonId,
  undo: boolean,
): Promise<string | null> {
  if (!demoteNote) return "this build cannot mark notes yet";
  const problems = await Promise.all(
    picked.map(async (note) => {
      try {
        const result = await demoteNote(note.section_id ?? 0, demoteKind(note), reason, undo);
        return result?.ok ? null : "the library did not keep it";
      } catch (e: unknown) {
        return formatDeckyRpcError(e);
      }
    }),
  );
  return problems.find((p): p is string => Boolean(p)) ?? null;
}

type NavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null | undefined };
type Moves = { up: () => boolean; down: () => boolean; left: () => boolean; right: () => boolean };

/**
 * Each reply's stops, by reply key, so a press handler from an earlier render reaches the element drawn on
 * the latest one (the same reason buildReplyActionsElement keeps its thumbs row's node by key). Undo uses
 * the "reason-chips" stop's own node: while it shows, it is that stop.
 */
type DemoteParts = { reasons: (HTMLElement | null)[]; reasonNavs: NavHolder[]; undo: HTMLElement | null };
const partsByKey = new Map<string, DemoteParts>();

function partsFor(replyKey: string): DemoteParts {
  let parts = partsByKey.get(replyKey);
  if (!parts) {
    parts = { reasons: [], reasonNavs: DEMOTE_REASONS.map(() => ({ current: null })), undo: null };
    partsByKey.set(replyKey, parts);
  }
  return parts;
}

/** Steam's transfer onto the stop's own node, then a plain focus, then the check that decides. */
function landOn(nav: NavHolder | undefined, el: HTMLElement | null | undefined): boolean {
  if (!el?.isConnected) return false;
  try {
    nav?.current?.TakeFocus?.(true);
  } catch {
    /* the focus and the check below decide */
  }
  try {
    el.focus({ preventScroll: true });
  } catch {
    return false;
  }
  return elementHasFocus(el);
}

function focusReason(replyKey: string, index: number): boolean {
  const parts = partsFor(replyKey);
  const i = Math.min(Math.max(index, 0), DEMOTE_REASONS.length - 1);
  return landOn(parts.reasonNavs[i], parts.reasons[i]);
}

function focusUndo(replyKey: string): boolean {
  return landOn(replyStopNavRef("reason-chips"), partsFor(replyKey).undo);
}

/**
 * The ring arriving from above (the reasons' second row, `column` its chip; or the thumbs while the reasons
 * are hidden): Undo when it shows, else the reason in that column.
 */
export function focusDemoteFromAbove(replyKey: string, column = 0): boolean {
  return focusUndo(replyKey) || focusReason(replyKey, column);
}

/** The ring arriving from below (the note card or Show details): Undo when it shows, else the first reason. */
export function focusDemoteFromBelow(replyKey: string): boolean {
  return focusUndo(replyKey) || focusReason(replyKey, 0);
}

/** A press that arrives as both A and a click within this long counts once. */
const SAME_PRESS_MS = 400;
let lastOkAt = 0;

function press(action: () => void, fromOk: boolean): void {
  const now = Date.now();
  if (!fromOk && now - lastOkAt < SAME_PRESS_MS) return;
  if (fromOk) lastOkAt = now;
  action();
}

/**
 * One stop: a Steam Focusable that is a stop (`focusable`, since it holds only words), with its own node,
 * all four moves and A. `onButtonDown` answers the directions only, so A and B fall through to Steam.
 */
function demoteStop(o: {
  key: string;
  className: string;
  label: string;
  nav: NavHolder;
  moves: Moves;
  onPress: () => void;
  elRef: (el: HTMLElement | null) => void;
  disabled?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  let self: HTMLElement | null = null;
  const act = o.disabled ? () => undefined : o.onPress;
  return (
    <Focusable
      key={o.key}
      className={`${o.className}${o.disabled ? " bonsai-kb-demote-chip--disabled" : ""}`}
      aria-label={o.label}
      aria-disabled={o.disabled || undefined}
      ref={(el: HTMLElement | null) => {
        self = el;
        o.elRef(el);
      }}
      onClick={() => press(act, false)}
      {...({
        focusable: true,
        noFocusRing: true,
        navRef: o.nav,
        onOKButton: () => press(act, true),
        onMoveUp: () => o.moves.up(),
        onMoveDown: () => o.moves.down(),
        onMoveLeft: () => o.moves.left(),
        onMoveRight: () => o.moves.right(),
        onButtonDown: (evt: unknown) => {
          if (self && !elementHasGamepadFocus(self)) return false;
          if (isDeckDirectionUpEvent(evt)) return o.moves.up();
          if (isDeckDirectionDownEvent(evt)) return o.moves.down();
          if (isDeckDirectionLeftEvent(evt)) return o.moves.left();
          if (isDeckDirectionRightEvent(evt)) return o.moves.right();
          return false;
        },
      } as Record<string, unknown>)}
    >
      {o.children}
    </Focusable>
  );
}

export type DemoteRowsArgs = {
  replyKey: string;
  view: ReplyDemoteView;
  /** The notes that can be marked (demotableNotes), at least one. */
  notes: DemotableNote[];
  /** An ask is running: the stops still take the ring, A does nothing. */
  disabled: boolean;
  /** Up from the reason in this column: the five reasons' second row. */
  upFromReason: (column: number) => boolean;
  /** Up from Undo: the thumbs, or whatever sits above the reply row. */
  upOut: () => boolean;
  /** Down out of these rows: the note card, else Show details and what follows. */
  downOut: () => boolean;
  /** The reasons' row element, for the reply row's "scroll the reasons out from behind the dock". */
  reasonsRowRef?: (el: HTMLElement | null) => void;
};

/**
 * In: the reply, what the hook holds for it, the notes, and where the ring goes when it leaves these rows.
 * Out: the three reasons as a row, or the "Marked not helpful / Undo" line and the gold line under it.
 * Can go wrong: nothing throws; a call that fails shows its words under the rows (the hook sets them).
 */
export function renderDemoteRows(a: DemoteRowsArgs): React.ReactElement {
  const { replyKey, view, notes, disabled } = a;
  const parts = partsFor(replyKey);
  const hold = () => true;
  const state = view.state;
  const error = state.error ? (
    <div className="bonsai-chat-reply-chip-error bonsai-kb-demote-error" role="alert">
      {state.error}
    </div>
  ) : null;

  if (state.phase === "done") {
    const undo = () => {
      const back = DEMOTE_REASONS.findIndex((r) => r.id === state.reason);
      pressThenHandRingOn(parts.undo, view.undo, () => void focusReason(replyKey, back));
    };
    return (
      <>
        <div className="bonsai-kb-demote-done">
          <span className="bonsai-chat-feedback-row__label bonsai-chat-feedback-row--rated">Marked not helpful</span>
          {demoteStop({
            key: "undo",
            className: "bonsai-kb-demote-undo",
            label: "Undo, the note ranks as before",
            nav: replyStopNavRef("reason-chips"),
            moves: { up: a.upOut, down: a.downOut, left: hold, right: hold },
            onPress: undo,
            disabled,
            elRef: (el) => {
              parts.undo = el;
              /* While it shows, Undo is the stop a Down from the answer's end lands on (the reasons are gone). */
              registerReplyStop("reason-chips", el);
            },
            children: "Undo",
          })}
        </div>
        <div className="bonsai-kb-demote-noted" role="status">
          {demoteConfirmation(state.picked)}
        </div>
        {error}
      </>
    );
  }

  const choose = (reason: DemoteReasonId, index: number) =>
    pressThenHandRingOn(parts.reasons[index], () => view.choose(reason, notes), () => void focusUndo(replyKey));
  return (
    <>
      <div
        className="bonsai-chat-reply-actions-row bonsai-chat-reply-actions-row--chips bonsai-kb-demote-row"
        ref={a.reasonsRowRef}
      >
        {DEMOTE_REASONS.map((reason, i) =>
          demoteStop({
            key: reason.id,
            className: "bonsai-kb-demote-chip",
            label: reason.label,
            nav: parts.reasonNavs[i]!,
            moves: {
              up: () => a.upFromReason(i),
              down: a.downOut,
              left: i > 0 ? () => focusReason(replyKey, i - 1) : hold,
              right: i < DEMOTE_REASONS.length - 1 ? () => focusReason(replyKey, i + 1) : hold,
            },
            onPress: () => choose(reason.id, i),
            disabled,
            elRef: (el) => {
              parts.reasons[i] = el;
            },
            children: reason.label,
          }),
        )}
      </div>
      {error}
    </>
  );
}
