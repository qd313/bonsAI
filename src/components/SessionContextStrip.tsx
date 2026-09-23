/**
 * Title: The Session tab, inside a turn's own Show details panel
 *
 * Purpose: The list of every turn in this chat that attached anything extra to what was actually
 * sent to the AI — a screenshot, a log excerpt, a memory note — plus the active row's own chips and
 * a Clear button at the end. Until plan 62 3c this was a whole separate, always-visible box of its
 * own above the transcript ("Session context (N turns) ▸"); it now folds into the newest answer's
 * own Show details panel as a second tab, "Session · N", so a settled answer costs one closed
 * control instead of two. Older, already-answered turns keep the plain single-tab Show details
 * panel exactly as before — only the newest carries this tab, so it never repeats down the chat.
 *
 * Used for: MainTabChatTranscript's `buildDetailsPanelElement`, mounted only while the "Session"
 * tab is the one showing, on the newest turn only.
 *
 * Solves: One place to audit what context reached the model, for both the turn still on screen and
 * every earlier turn in the conversation, without scrolling back up and rereading each answer.
 *
 * Does not: Build the "what was actually sent" snapshot, or fetch it from the backend. It is handed
 * already-built snapshots for the live turn and every archived turn, and only draws them. Does not
 * decide when it is showing at all — that is `detailsTab === "session"`, owned by the caller.
 *
 * Gotchas:
 * - No header, no open/closed state of its own: Show details itself is what opens and closes this
 *   content now, so this body is either fully mounted or not there at all.
 * - Stepping Up off the row list's first row is wired by hand through the chip ladder's own escape
 *   hatch and this body's own row class — see `focusLastSessionTabRow`'s own comment for why an
 *   unscoped query is safe here (at most one of these bodies is ever mounted at a time) and why it
 *   is not `focusLastSessionContextRow` (liveTurnFocusGraph.ts): that one is keyed to a different,
 *   older class name.
 * - B closes the WHOLE Show details panel via `onRequestClose`, not just this body — see its own
 *   `onCancelButton` comment for why that has to be `onCancelButton`, not `onButtonDown`.
 * - Clear opens the same kind of confirm box Settings -> Data's two buttons use. Opening any Decky
 *   modal remounts the whole plugin, which is why it goes through `onBeforeDeckyModal` /
 *   `onCompleteDeckyModalClose` the same way those two do — skipping them would let the remount
 *   undo whichever turn is currently expanded.
 *
 * How it works:
 * 1. `computeSessionContextRows()` builds the row list once: every archived turn with at least one
 *    chip, plus the still-live turn when it has chips of its own and is not the same turn as the
 *    newest archived row (`liveIsNewestArchived` inside it) — de-duped because after a completed
 *    Ask the live turn and its own freshly-archived copy would otherwise count as two rows for one
 *    real turn.
 * 2. If there are no rows at all, this body renders nothing (mirrors the old standalone strip).
 * 3. Works out which row is active — an outside `highlightTurnId` if it points at a real row,
 *    otherwise whichever row was last tapped — and falls back to the newest row.
 * 4. Draws every row, wires the first row's own Up to `onMoveUpFromFirstRow`, then the active row's
 *    chips via the shared ladder, then a full-width Clear at the very end.
 */
import { useState } from "react";
import { Focusable, showModal, ConfirmModal } from "@decky/ui";
import { toaster } from "@decky/api";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ChatSlotTurnTransparency, TransparencySnapshot } from "../utils/inputTransparency";
import { ContextChipLadder } from "./ContextChipLadder";
import { chipsFromSnapshot } from "../utils/contextChipsFromSnapshot";
import { isOkDeckButtonEvent, isDeckDirectionUpEvent } from "../utils/focusNavigation";
import { focusDeckOwner } from "../utils/liveTurnFocusGraph";
import { getUiDocument } from "../utils/uiDocument";
import { callDeckyWithTimeout } from "../utils/deckyCall";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
  type ModalReturnFocusId,
} from "../features/plugin-shell/modalReturnFocusRegistry";

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

/**
 * D105's Clear confirm box, as a factory rather than a hook: both `SessionContextStrip` (the
 * standalone strip, still rendered below the transcript for now) and `SessionContextTabBody` (the
 * Session tab's own Clear, at the end of its body) open the exact same box and must not fight over
 * one return-focus id — each caller supplies its own `returnFocusId` so restoring focus after the
 * box closes lands back on the button that actually opened it, not whichever of the two mounted
 * last. Forgets only what the plugin carries into the *next* Strategy/Expert question — the last
 * strategy subject, the running game's checklist position. Never the chat, never either control's
 * own rows; those stay exactly as they are, because they are the honest record of what each past
 * turn actually attached. Same confirm-box shape Settings -> Data's two buttons use
 * (SettingsTab.tsx): remembered return-focus id, registered owner ref, and the before/after modal
 * hooks because opening any Decky modal remounts the plugin.
 */
function buildOpenClearConfirm(
  returnFocusId: ModalReturnFocusId,
  onBeforeDeckyModal?: () => void,
  onCompleteDeckyModalClose?: (close: () => void) => void
): () => void {
  return () => {
    rememberModalReturnFocus(returnFocusId);
    onBeforeDeckyModal?.();
    const handle = showModal(
      <ConfirmModal
        strTitle="Start the next question fresh?"
        strDescription="The plugin forgets the subject of your last strategy question and the checklist position for the running game. Your chat and this bar stay as they are."
        strOKButtonText="Clear"
        /*
         * Plan 64 bug E, first half: this box used to open with the ring on the destructive
         * "Clear" button instead of the safe "Cancel" -- the same shape ChatSlotRow.tsx's own
         * "Delete chat slot?" confirm already avoids with this same prop. `bDestructiveWarning`
         * is Steam's own supported way to ask for that (it is also what styles the OK button as
         * a warning); this box asks for something forgotten, not deleted outright, but the same
         * "the safe choice is where the ring starts" rule the task named applies here too.
         */
        bDestructiveWarning
        onOK={() => {
          // Fire-and-forget, same shape as forget_background_game_ai in index.tsx's
          // resetPluginSession: the toast below is the actual promise made to the person, and
          // it is true from the screen's own side either way — nothing carried is re-sent to
          // the model without a fresh question triggering it.
          void callDeckyWithTimeout<[], { ok?: boolean; forgot?: string[] }>(
            "forget_game_ai_carried_context",
            []
          ).catch(() => {});
          toaster.toast({
            title: "Next question starts fresh",
            body: "Forgot the last strategy subject and the running game's checklist position.",
            duration: 3800,
          });
          onCompleteDeckyModalClose?.(() => handle.Close());
        }}
        onCancel={() => onCompleteDeckyModalClose?.(() => handle.Close())}
      />
    );
  };
}

export type SessionContextTabBodyProps = {
  liveTurn?: SessionContextTurn | null;
  archivedTurns?: AskThreadCollapsedTurn[];
  highlightTurnId?: string | null;
  onHighlightClear?: () => void;
  /** D-pad Up off the first row -> whatever sits above this body (the "This answer / Session · N" tabs row, in MainTabChatTranscript). */
  onMoveUpFromFirstRow?: () => boolean;
  /**
   * B anywhere inside this body. Plan 62 3c: "B anywhere inside closes the panel" — the whole Show
   * details panel, not the local re-collapse `ContextChipLadder` does on its own B press (see the
   * `onExpandChange` wiring below). The caller is expected to close the panel AND move Steam's ring
   * back onto the (still-mounted) Show details / Hide details line in one step, the same way
   * `focusKbNotesBlock`'s callers do when the block they focused is about to unmount.
   */
  onRequestClose?: () => void;
  onBeforeDeckyModal?: () => void;
  onCompleteDeckyModalClose?: (close: () => void) => void;
};

/**
 * The Session tab's own content, folded into a turn's Show details panel (plan 62 3c) rather than a
 * standalone box of its own: the same row list and per-row chip ladder `SessionContextStrip` draws
 * once open, plus a full-width "Clear" button at the end of the body instead of a header-corner one
 * — there is no header here at all, since Show details itself is what opens and closes this content
 * now.
 *
 * In: the same live/archived turn data `SessionContextStrip` takes, an escape for D-pad Up off the
 * first row, and a request-close callback for B.
 * Out: null when there is nothing to show (mirrors `SessionContextStrip`); otherwise the row list,
 * the active row's chips, and Clear.
 *
 * What can go wrong: only one turn is ever "the newest answer" and therefore ever mounts this body
 * at a time (the caller gates on that), so — like `focusAnyContextChipLadder` in liveTurnFocusGraph.ts
 * — a plain, unscoped query for this body's own row class to find "the last row" is safe. Reusing
 * `SessionContextStrip`'s own `.bonsai-session-context-row` class here instead of a class of its own
 * would NOT be safe during the period both this body and the standalone strip can be on screen at
 * once (before the strip is removed): `focusLastSessionContextRow` (liveTurnFocusGraph.ts, not owned
 * by this lane) queries that class globally, and would not know which of the two mounted instances a
 * caller meant. `bonsai-details-session-row` is a class of this component's own for exactly that
 * reason.
 */
export function SessionContextTabBody({
  liveTurn = null,
  archivedTurns = [],
  highlightTurnId = null,
  onHighlightClear,
  onMoveUpFromFirstRow,
  onRequestClose,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
}: SessionContextTabBodyProps) {
  const [activeId, setActiveId] = useState<string>("live");

  const rows = computeSessionContextRows(liveTurn, archivedTurns);
  if (!rows.length) return null;

  const effectiveActive =
    highlightTurnId && rows.some((r) => r.id === highlightTurnId) ? highlightTurnId : activeId;
  const activeRow = rows.find((r) => r.id === effectiveActive) ?? rows[rows.length - 1];

  const openClearConfirm = buildOpenClearConfirm(
    "session-tab-clear",
    onBeforeDeckyModal,
    onCompleteDeckyModalClose
  );

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
      {rows.map((row, index) => (
        <Focusable
          key={row.id}
          className="bonsai-details-session-row"
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
                onMoveUp: () => onMoveUpFromFirstRow?.() ?? false,
                onButtonDown: (evt: unknown) => {
                  if (isOkDeckButtonEvent(evt)) {
                    setActiveId(row.id);
                    onHighlightClear?.();
                    return true;
                  }
                  if (isDeckDirectionUpEvent(evt)) return onMoveUpFromFirstRow?.() ?? false;
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
          onMoveUpFromLadder={() => focusLastSessionTabRow() || (onMoveUpFromFirstRow?.() ?? false)}
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
      {/*
       * Plan 62 3c, decided 2026-09-20: Clear moves off the header (there is no header in this
       * body) to a full-width quiet button at the very end, same confirm box as before.
       */}
      <Focusable
        className="bonsai-details-session-clear"
        ref={(el: HTMLElement | null) => {
          registerModalReturnFocusOwner("session-tab-clear", el);
        }}
        onActivate={openClearConfirm}
        style={{
          width: "100%",
          boxSizing: "border-box",
          textAlign: "center",
          padding: "8px 0",
          marginTop: 2,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "transparent",
          color: "#8fa8c4",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <button
          type="button"
          onClick={openClearConfirm}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: "inherit",
            font: "inherit",
            padding: 0,
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </Focusable>
    </Focusable>
  );
}

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
