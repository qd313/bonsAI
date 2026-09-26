/**
 * Title: The Session tab, inside a turn's own Show details panel
 *
 * Purpose: What the AI carries from this chat, in one tab: at the top, *Sum up this chat* and the
 * summary the AI remembers in place of the chat's older turns (plan 68); below it, the list of
 * every turn that attached anything extra to what was actually sent to the AI — a screenshot, a log
 * excerpt, a memory note — with the active row's own chips. The tab lives in the newest answer's
 * Show details panel as "Session · N" (plan 62 3c); older answers keep the plain single-tab panel,
 * so it never repeats down the chat.
 *
 * Used for: MainTabChatTranscript's `buildDetailsPanelElement`, mounted only while the "Session"
 * tab is the one showing, on the newest turn only.
 *
 * Solves: One place to see and manage what the AI knows about this conversation, and to audit what
 * context reached it, without scrolling back up and rereading each answer.
 *
 * Does not: Build the "what was actually sent" snapshot, write a summary, or fetch either from the
 * back end. It is handed built snapshots and the open chat's summary state, and only draws them.
 * Does not decide when it is showing at all — that is `detailsTab === "session"`, owned by the
 * caller.
 *
 * Gotchas:
 * - No header, no open/closed state of its own: Show details itself is what opens and closes this
 *   content, so this body is either fully mounted or not there at all.
 * - Stepping Up off the row list's first row is wired by hand to the summary card or the button
 *   above it, and Up off the chip ladder to this body's own last row — see `focusLastSessionTabRow`
 *   for why an unscoped query is safe here (at most one of these bodies is ever mounted at a time).
 * - B closes the WHOLE Show details panel via `onRequestClose`, not just this body — see its own
 *   `onCancelButton` comment for why that has to be `onCancelButton`, not `onButtonDown`.
 * - Nothing here opens a Decky modal any more (Clear's confirm box went with Clear), so this body
 *   no longer needs the before/after-modal hooks that keep the expanded turn across a remount.
 *
 * How it works:
 * 1. `computeSessionContextRows()` builds the row list once: every archived turn with at least one
 *    chip, plus the still-live turn when it has chips of its own and is not the same turn as the
 *    newest archived row (`liveIsNewestArchived` inside it) — de-duped because after a completed
 *    Ask the live turn and its own freshly-archived copy would otherwise count as two rows for one
 *    real turn.
 * 2. Always draws the Sum up section first, even with no rows: the tab shows whenever the chat has
 *    a question in it (plan 68 § 2 item 6).
 * 3. Works out which row is active — an outside `highlightTurnId` if it points at a real row,
 *    otherwise whichever row was last tapped — and falls back to the newest row.
 * 4. Draws every row, wires the first row's own Up to the section above, then the active row's
 *    chips via the shared ladder, whose Down stays put because it is the last thing in the tab.
 */
import { useState } from "react";
import { Focusable } from "@decky/ui";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ChatSlotTurnTransparency, TransparencySnapshot } from "../utils/inputTransparency";
import { ContextChipLadder } from "./ContextChipLadder";
import { chipsFromSnapshot } from "../utils/contextChipsFromSnapshot";
import { isOkDeckButtonEvent, isDeckDirectionUpEvent } from "../utils/focusNavigation";
import { focusDeckOwner } from "../utils/liveTurnFocusGraph";
import { getUiDocument } from "../utils/uiDocument";
import { SessionSumUpSection, focusLastSumUpStop } from "../features/chat-sum-up/SessionSumUpSection";
import type { ChatSumUpState } from "../features/chat-sum-up/chatSumUpModel";

export type SessionContextTurn = {
  id: string;
  label: string;
  /** Full trimmed question text, used only to detect the live/archived duplicate below — not displayed. */
  question: string;
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | null;
};

/**
 * The row list a Session tab (or the standalone strip) actually shows: every archived turn with at
 * least one chip, plus the still-live turn when it has chips of its own and is not the same turn as
 * the newest archived row.
 *
 * Pulled out of the component body so `SessionContextTabBody` (the Session tab's own content, folded
 * into Show details) and `SessionContextStrip` (kept standalone below the transcript for now) share
 * one de-dup rule instead of two copies quietly drifting apart. See `liveIsNewestArchived` below for
 * why the de-dup is needed at all: after a completed Ask, `liveTurn` stays populated at the same
 * moment the slot reload archives the identical turn, and there is no shared id between the two, so
 * question text is the only identity signal both sides carry.
 */
export function computeSessionContextRows(
  liveTurn: SessionContextTurn | null | undefined,
  archivedTurns: AskThreadCollapsedTurn[] | undefined
): SessionContextTurn[] {
  const archivedRows: SessionContextTurn[] = (archivedTurns ?? [])
    .filter((t) => t.transparency && chipsFromSnapshot(t.transparency).length > 0)
    .map((t) => ({
      id: t.id,
      label: t.question.trim().slice(0, 48) || t.id,
      question: t.question.trim(),
      snapshot: t.transparency ?? null,
    }));

  const newestArchivedRow = archivedRows[archivedRows.length - 1];
  const liveIsNewestArchived =
    Boolean(liveTurn) &&
    Boolean(newestArchivedRow) &&
    (liveTurn!.id === newestArchivedRow!.id || liveTurn!.question === newestArchivedRow!.question);

  return [
    ...archivedRows,
    ...(liveTurn && !liveIsNewestArchived && chipsFromSnapshot(liveTurn.snapshot).length > 0
      ? [liveTurn]
      : []),
  ];
}

export type SessionContextTabBodyProps = {
  liveTurn?: SessionContextTurn | null;
  archivedTurns?: AskThreadCollapsedTurn[];
  highlightTurnId?: string | null;
  onHighlightClear?: () => void;
  /** D-pad Up off the top of this body (the Sum up button) -> the "This answer / Session · N" tabs row above it. */
  onMoveUpFromTop?: () => boolean;
  /**
   * B anywhere inside this body. Plan 62 3c: "B anywhere inside closes the panel" — the whole Show
   * details panel, not the local re-collapse `ContextChipLadder` does on its own B press (see the
   * `onExpandChange` wiring below). The caller is expected to close the panel AND move Steam's ring
   * back onto the (still-mounted) Show details / Hide details line in one step, the same way
   * `focusKbNotesBlock`'s callers do when the block they focused is about to unmount.
   */
  onRequestClose?: () => void;
  /** Plan 68: the open chat's summary and the Sum up button's job, from the back end. */
  sumUp?: ChatSumUpState | null;
  /** Plan 68: an answer is being written, so the button is greyed out and says so. */
  answerInFlight?: boolean;
};

/**
 * The Session tab's own content, folded into a turn's Show details panel (plan 62 3c) rather than a
 * standalone box of its own. Top to bottom (plan 68, as drawn): *Sum up this chat* with its reason
 * line and the summary card (SessionSumUpSection.tsx), then the row list and the active row's chip
 * ladder, exactly as before. Clear and its confirm box are gone: summing up keeps a chat's memory
 * where Clear could only throw it away, and nothing is deleted, so there is nothing to confirm.
 *
 * In: the same live/archived turn data `SessionContextStrip` takes, the open chat's summary state,
 * whether an answer is being written, an escape for D-pad Up off the top, and a request-close
 * callback for B.
 * Out: always the button (plan 68 § 2 item 6: the tab shows whenever the chat has a question),
 * then the row list and the active row's chips when any turn attached something extra.
 *
 * What can go wrong: only one turn is ever "the newest answer" and therefore ever mounts this body
 * at a time (the caller gates on that), so — like `focusAnyContextChipLadder` in liveTurnFocusGraph.ts
 * — a plain, unscoped query for this body's own row class to find "the last row" is safe, and so is
 * one module-level slot for its first row. `bonsai-details-session-row` is a class of this
 * component's own so `focusLastSessionContextRow` (liveTurnFocusGraph.ts, the old standalone
 * strip's) can never match it.
 */
export function SessionContextTabBody({
  liveTurn = null,
  archivedTurns = [],
  highlightTurnId = null,
  onHighlightClear,
  onMoveUpFromTop,
  onRequestClose,
  sumUp = null,
  answerInFlight = false,
}: SessionContextTabBodyProps) {
  const [activeId, setActiveId] = useState<string>("live");

  const rows = computeSessionContextRows(liveTurn, archivedTurns);

  const effectiveActive =
    highlightTurnId && rows.some((r) => r.id === highlightTurnId) ? highlightTurnId : activeId;
  const activeRow = rows.find((r) => r.id === effectiveActive) ?? rows[rows.length - 1];

  /* Up off the first row goes to the summary card or the button above it, then the tabs row. */
  const upFromFirstRow = () => focusLastSumUpStop() || (onMoveUpFromTop?.() ?? false);

  return (
    <Focusable
      className="bonsai-details-session-body"
      style={{
        marginTop: 8,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
      /*
       * B closes the whole panel via `onRequestClose`, not a local collapse — `onCancelButton` +
       * `preventDefault`, not `onButtonDown` checking the button code: measured on device
       * 2026-08-28 (DrgGlossaryTermChip.tsx, buildReasoningFoldElement.tsx) that `onButtonDown`
       * does receive B, but returning `true` does NOT stop Steam also backing the ring out of the
       * panel — only `onCancelButton` genuinely consumes the press. Safe to attach
       * unconditionally: this body only exists while the Session tab is showing, so there is no
       * "nothing to close" state of this same node where B ought to fall through instead.
       */
      {...({
        onCancelButton: (e: unknown) => {
          onRequestClose?.();
          (e as { preventDefault?: () => void })?.preventDefault?.();
        },
      } as Record<string, unknown>)}
    >
      <SessionSumUpSection
        state={sumUp}
        answerInFlight={answerInFlight}
        onMoveUpFromButton={() => onMoveUpFromTop?.() ?? false}
        onMoveDownPastSection={() => focusDeckOwner(firstSessionRowEl)}
      />
      {rows.map((row, index) => (
        <Focusable
          key={row.id}
          className="bonsai-details-session-row"
          ref={
            index === 0
              ? (el: HTMLElement | null) => {
                  firstSessionRowEl = el;
                }
              : undefined
          }
          onActivate={() => {
            setActiveId(row.id);
            onHighlightClear?.();
          }}
          onButtonDown={(evt) => {
            if (!isOkDeckButtonEvent(evt)) return false;
            setActiveId(row.id);
            onHighlightClear?.();
            return true;
          }}
          {...(index === 0
            ? ({
                onMoveUp: upFromFirstRow,
                onButtonDown: (evt: unknown) => {
                  if (isOkDeckButtonEvent(evt)) {
                    setActiveId(row.id);
                    onHighlightClear?.();
                    return true;
                  }
                  if (isDeckDirectionUpEvent(evt)) return upFromFirstRow();
                  return false;
                },
              } as Record<string, unknown>)
            : {})}
          style={{
            padding: "6px 8px",
            borderRadius: 6,
            border:
              row.id === effectiveActive
                ? "1px solid rgba(125, 211, 252, 0.55)"
                : "1px solid rgba(255,255,255,0.08)",
            background: row.id === effectiveActive ? "rgba(56,189,248,0.12)" : "transparent",
            fontSize: 11,
            color: "#dce8f4",
          }}
        >
          {row.label}
        </Focusable>
      ))}
      {activeRow?.snapshot ? (
        <ContextChipLadder
          snapshot={activeRow.snapshot}
          collapsedHint={false}
          onMoveUpFromLadder={() => focusLastSessionTabRow() || upFromFirstRow()}
          /*
           * The ladder is the last thing in the tab now that Clear is gone. Down past it stays put:
           * left to Steam's own guess, Down from the end of this tab once threw the ring into the
           * dock (plan 68 § 6).
           */
          onMoveDownFromLadder={() => true}
          /*
           * B on the ladder itself swallows the press to re-collapse just the ladder locally
           * (ContextChipLadder's own onButtonDown) — without this, that local collapse would run
           * INSTEAD of closing the whole panel, leaving the row list open behind a "tap for
           * details" hint rather than actually leaving Show details the way B is supposed to here.
           */
          onExpandChange={(expanded) => {
            if (!expanded) onRequestClose?.();
          }}
        />
      ) : null}
    </Focusable>
  );
}

/** This body's first turn row, for Down off the Sum up section — a ref, never a page search. */
let firstSessionRowEl: HTMLElement | null = null;

/**
 * The last row inside THIS body specifically — see the component doc above for why an unscoped
 * query is safe here (at most one `SessionContextTabBody` is ever mounted at a time) and why it
 * cannot reuse `focusLastSessionContextRow` (liveTurnFocusGraph.ts), which looks for the
 * standalone strip's own, differently-named row class.
 */
function focusLastSessionTabRow(): boolean {
  const rows = getUiDocument().querySelectorAll<HTMLElement>(".bonsai-details-session-row");
  return focusDeckOwner(rows.length ? rows[rows.length - 1] : null);
}
