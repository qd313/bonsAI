/**
 * Title: Session context strip
 *
 * Purpose: The collapsed line above the chat transcript that reads "Session
 * context (N turns) ▸". Pressing it opens a list with one row per turn that
 * attached anything extra to what was actually sent to the AI — a
 * screenshot, a log excerpt, a memory note. Picking a row shows that turn's
 * chips: exactly what rode along with that question. It exists so a person
 * can check, after the fact, what the AI actually saw, rather than just
 * trusting it.
 *
 * Used for: Drawn by MainTabChatTranscript, above the transcript itself,
 * whenever at least one turn has something to show.
 *
 * Solves: One place to audit what context reached the model, for both the
 * turn still on screen and every earlier turn in the conversation, without
 * scrolling back up and rereading each answer.
 *
 * Does not: Build the "what was actually sent" snapshot, or fetch it from
 * the backend. It is handed already-built snapshots for the live turn and
 * every archived turn, and only draws them.
 *
 * Gotchas:
 * - The strip registers itself as a Steam nav node (registerNavFocus) rather
 *   than relying on plain DOM focus, so D-pad Down from the reply row above
 *   can hand the ring straight to it — a bare `.focus()` moves the browser's
 *   idea of focus but leaves Steam's own ring behind, and a later press keeps
 *   going to the row you meant to leave (measured on the Deck).
 * - The header only opens or closes on the A-button press (`onActivate`). It
 *   used to also react to the same press in `onButtonDown`, which fired the
 *   toggle twice and made the header look completely dead — it flipped open
 *   and shut in the same press. The row Focusables below use the same
 *   double-handler shape safely, because picking a row is idempotent; only a
 *   toggle breaks when it fires twice.
 * - Stepping Up off the row list's first chip has to be wired by hand
 *   through the chip ladder's own escape hatch, or the D-pad gets stuck once
 *   it reaches that chip.
 * - The header row's D-pad Right and Left move the ring between the toggle
 *   and the Clear button. Both stops are siblings inside the same header
 *   row Focusable, so a plain `.focus()` between them is the sanctioned
 *   move (AGENTS.md's focus-graph rule: `focus()` is only safe between
 *   siblings inside one container) — no registry hop needed the way
 *   crossing OUT of the strip entirely does.
 * - Clear opens the same kind of confirm box Settings -> Data's two
 *   buttons use. Opening any Decky modal remounts the whole plugin, which
 *   is why it goes through `onBeforeDeckyModal` / `onCompleteDeckyModalClose`
 *   the same way those two do — skipping them would let the remount undo
 *   whichever turn is currently expanded.
 */
import { useEffect, useRef, useState } from "react";
import { Focusable, showModal, ConfirmModal } from "@decky/ui";
import { toaster } from "@decky/api";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ChatSlotTurnTransparency, TransparencySnapshot } from "../utils/inputTransparency";
import { ContextChipLadder } from "./ContextChipLadder";
import { chipsFromSnapshot } from "../utils/contextChipsFromSnapshot";
import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../utils/navFocusRegistry";
import {
  isDeckDirectionUpEvent,
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isOkDeckButtonEvent,
} from "../utils/focusNavigation";
import { focusLastSessionContextRow } from "../utils/liveTurnFocusGraph";
import { callDeckyWithTimeout } from "../utils/deckyCall";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

type SessionContextTurn = {
  id: string;
  label: string;
  /** Full trimmed question text, used only to detect the live/archived duplicate below — not displayed. */
  question: string;
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | null;
};

export type SessionContextStripProps = {
  liveTurn?: SessionContextTurn | null;
  archivedTurns?: AskThreadCollapsedTurn[];
  highlightTurnId?: string | null;
  onHighlightClear?: () => void;
  /** D-pad Up from the strip header — e.g. back into the transcript's inline chip ladder. */
  onMoveUp?: () => boolean;
  /**
   * Wrap the Clear confirm box this strip opens, the same way Settings' own two confirm boxes
   * are wrapped — opening a Decky modal remounts the whole plugin, and skipping these would let
   * the remount undo whichever turn is expanded right now. Already part of MainTabProps and
   * reaches this component via MainTab's plain `{...props}` spread onto MainTabChatTranscript,
   * the same route `onAskOllama` documents there; MainTabChatTranscript only needs to type and
   * forward them, which is what makes them optional here too.
   */
  onBeforeDeckyModal?: () => void;
  onCompleteDeckyModalClose?: (close: () => void) => void;
};

/**
 * The whole strip: the collapsed header, the list of turn rows once it is
 * open, and the chip ladder for whichever row is currently picked.
 *
 * In: the current turn's context snapshot (if it has one and hasn't been
 * archived yet), the list of already-archived turns, an optional id that
 * forces one particular turn open from outside the strip, and a callback for
 * stepping Up out of the strip entirely.
 * Out: null when there is nothing worth showing; otherwise the header line,
 * and — once open — the row list plus the active row's chips.
 *
 * What can go wrong: the live turn and its own freshly-archived copy can
 * easily get counted as two rows for one real turn — see the note on
 * `liveIsNewestArchived` below for why that happens and how it is avoided.
 *
 * 1. On mount, registers itself with registerNavFocus() under the key
 *    "session-context-strip" so the row above can hand D-pad Down straight
 *    to this strip; unregisters with unregisterNavFocus() on unmount.
 * 2. Builds the row list: every archived turn with at least one chip from
 *    chipsFromSnapshot(), plus the still-live turn if it has chips of its
 *    own and is not the same turn as the newest archived row
 *    (`liveIsNewestArchived`).
 * 3. If there are no rows at all, renders nothing.
 * 4. Works out which row is active — an outside `highlightTurnId` if it
 *    points at a real row, otherwise whichever row was last tapped — and
 *    falls back to the newest row.
 * 5. Pressing A on the header opens or closes the strip. A separate effect
 *    scrolls the newly revealed rows into view once it opens, since the
 *    strip sits at the bottom of the panel and an opened list would
 *    otherwise land below what is visible.
 * 6. While open, picking a row makes it the active one and clears any
 *    outside highlight via onHighlightClear.
 * 7. The active row's chips are drawn by the chip ladder, wired so stepping
 *    Up off its first chip calls focusLastSessionContextRow() to land back
 *    on the row list, falling back to this strip's own onMoveUp only if that
 *    fails.
 */
export function SessionContextStrip({
  liveTurn = null,
  archivedTurns = [],
  highlightTurnId = null,
  onHighlightClear,
  onMoveUp,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
}: SessionContextStripProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("live");

  // The header row's two stops (the toggle, the Clear button) are siblings in one Focusable
  // container, so a plain `.focus()` between them is the sanctioned move — see the header
  // comment. Real DOM refs to each Focusable's own node, not React state, because it is Steam's
  // own focus ring being moved, not anything drawn on screen.
  const headerToggleElRef = useRef<HTMLElement | null>(null);
  const clearButtonElRef = useRef<HTMLElement | null>(null);

  const focusHeaderSibling = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    try {
      el.focus({ preventScroll: true });
    } catch {
      try {
        el.focus();
      } catch {
        return false;
      }
    }
    return true;
  };
  const rightIntoClear = (): boolean => focusHeaderSibling(clearButtonElRef.current);
  const leftIntoHeaderToggle = (): boolean => focusHeaderSibling(headerToggleElRef.current);

  /**
   * D105: forgets only what the plugin carries into the *next* Strategy/Expert question — the
   * last strategy subject, the running game's checklist position. Never the chat, never this
   * strip's own rows; those stay exactly as they are, because they are the honest record of what
   * each past turn actually attached. Same confirm-box shape Settings -> Data's two buttons use
   * (SettingsTab.tsx): remembered return-focus id, registered owner ref, and the before/after
   * modal hooks because opening any Decky modal remounts the plugin.
   */
  const openClearConfirm = () => {
    rememberModalReturnFocus("session-context-clear");
    onBeforeDeckyModal?.();
    const handle = showModal(
      <ConfirmModal
        strTitle="Start the next question fresh?"
        strDescription="The plugin forgets the subject of your last strategy question and the checklist position for the running game. Your chat and this bar stay as they are."
        strOKButtonText="Clear"
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

  /*
   * Steam populates this with the nav node for the strip. It is how D-pad Down out of the reply row
   * hands focus over: a plain `focus()` moves `activeElement` but leaves Steam's gamepad focus
   * behind, so presses keep going to the row you were trying to leave (measured 2026-08-04).
   */
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("session-context-strip", navRef);
    return () => unregisterNavFocus("session-context-strip", navRef);
  }, []);

  /*
   * The strip is the last block in the panel, so everything it reveals opens below the fold. The
   * toggle worked — the arrow flipped — but nothing the user could see changed, which reads as a
   * dead button. Scroll the revealed rows into view on open.
   */
  const expandedRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      expandedRef.current?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    });
  }, [open]);

  const archivedRows: SessionContextTurn[] = archivedTurns
    .filter((t) => t.transparency && chipsFromSnapshot(t.transparency).length > 0)
    .map((t) => ({
      id: t.id,
      label: t.question.trim().slice(0, 48) || t.id,
      question: t.question.trim(),
      snapshot: t.transparency ?? null,
    }));

  const newestArchivedRow = archivedRows[archivedRows.length - 1];
  /*
   * After a completed Ask, `liveTurn` stays populated — `transparencySnapshot` still holds that
   * turn's data — at the same moment the slot reload archives the identical turn into
   * `archivedTurns`. Nothing upstream de-dupes them, so the newest turn rendered twice and the
   * header read one turn too many (roadmap: "Session context counts the newest turn twice").
   * There is no shared id between a live turn ("live") and its archived record (minted fresh at
   * archive time), so question text is the only identity signal both sides carry.
   */
  const liveIsNewestArchived =
    Boolean(liveTurn) &&
    Boolean(newestArchivedRow) &&
    (liveTurn!.id === newestArchivedRow!.id || liveTurn!.question === newestArchivedRow!.question);

  const rows: SessionContextTurn[] = [
    ...archivedRows,
    ...(liveTurn && !liveIsNewestArchived && chipsFromSnapshot(liveTurn.snapshot).length > 0
      ? [liveTurn]
      : []),
  ];

  if (!rows.length) return null;

  const effectiveActive = highlightTurnId && rows.some((r) => r.id === highlightTurnId)
    ? highlightTurnId
    : activeId;
  const activeRow = rows.find((r) => r.id === effectiveActive) ?? rows[rows.length - 1];

  return (
    <Focusable
      /* `navRef` is a real Steam Focusable prop that Decky's types omit — the same gap as
         `onMoveDown`, so it goes through the cast the repo already uses for those. */
      {...({ navRef } as Record<string, unknown>)}
      className="bonsai-session-context-strip"
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid rgba(100, 140, 180, 0.35)",
        background: "rgba(12, 18, 28, 0.65)",
        width: "100%",
        boxSizing: "border-box",
      }}
      onButtonDown={(e) => {
        if (e.detail.button === 2 || e.detail.button === 3) {
          setOpen((o) => !o);
          return true;
        }
        return false;
      }}
    >
      {/* Decky's gamepad navigation only visits `Focusable`s — a bare <button> is touch-only, which
          is what made this header unreachable from a D-pad (reported 2026-08-04). Same wrapper the
          turn rows below already use; the native button stays for click and keeps the styling. */}
      {/*
        A is handled by `onActivate` ALONE, matching buildTurnHeaderElement.

        This used to also toggle from `onButtonDown` on the OK button. Both fire for one A press,
        so `setOpen` ran twice — `!o` then `!!o` — and the panel landed exactly where it started.
        The header focused fine and looked completely dead (reported on device 2026-08-17). The row
        Focusables below carry the same double-handler shape and are NOT affected, because
        `setActiveId(row.id)` is idempotent; only a toggle is destroyed by firing twice.

        The `onButtonDown` was originally added to stop a D-pad press aimed at moving past this
        header from toggling it. Dropping it entirely is safe: `onActivate` never fires on a
        direction press, which is the property the turn headers already rely on.
      */}
      <Focusable
        className="bonsai-session-context-header-row"
        flow-children="horizontal"
        style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, width: "100%" }}
      >
        <Focusable
          className="bonsai-session-context-toggle"
          ref={(el: HTMLElement | null) => {
            headerToggleElRef.current = el;
          }}
          onActivate={() => setOpen((o) => !o)}
          style={{ flex: 1, minWidth: 0 }}
          {...({
            onMoveRight: rightIntoClear,
            ...(onMoveUp ? { onMoveUp } : {}),
            onButtonDown: (evt: unknown) => {
              if (isDeckDirectionRightEvent(evt)) return rightIntoClear();
              if (onMoveUp && isDeckDirectionUpEvent(evt)) return onMoveUp();
              return false;
            },
          } as Record<string, unknown>)}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              color: "#b8cce0",
              fontSize: 12,
              fontWeight: 700,
              padding: 0,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Session context ({rows.length} turn{rows.length === 1 ? "" : "s"}) {open ? "▾" : "▸"}
          </button>
        </Focusable>
        {/*
          D105: the strip's own Clear. A opens the confirm box (openClearConfirm above); Left
          steps back onto the toggle. A proper stop of its own rather than folded into the
          header's onClick, so it can carry its own return-focus id and its own Left/Right wiring
          without the toggle's press also reaching it.
        */}
        <Focusable
          className="bonsai-session-context-clear-button"
          ref={(el: HTMLElement | null) => {
            clearButtonElRef.current = el;
            registerModalReturnFocusOwner("session-context-clear", el);
          }}
          onActivate={openClearConfirm}
          {...({
            onMoveLeft: leftIntoHeaderToggle,
            onButtonDown: (evt: unknown) =>
              isDeckDirectionLeftEvent(evt) ? leftIntoHeaderToggle() : false,
          } as Record<string, unknown>)}
        >
          <button
            type="button"
            onClick={openClearConfirm}
            style={{
              background: "none",
              border: "none",
              color: "#8fa8c4",
              fontSize: 11,
              fontWeight: 700,
              padding: "0 2px",
              cursor: "pointer",
              font: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Clear
          </button>
        </Focusable>
      </Focusable>
      {open ? (
        <div
          ref={expandedRef}
          style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}
        >
          {rows.map((row) => (
            <Focusable
              key={row.id}
              className="bonsai-session-context-row"
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
          {/*
            Up out of this ladder has to be wired explicitly. The ladder owns `onMoveUp` for chip
            stepping and, at its first chip, hands the press to `onMoveUpFromLadder` — absent, that
            returned false and the ring stayed put. The transcript's copy of the ladder has always
            passed both escapes ([MainTabChatTranscript.tsx] onMoveUpFromLadder/onMoveDownFromLadder);
            this one was rendered bare, which is half of the 2026-08-23 focus trap. Target is the row
            list directly above, not the header, so a different turn can still be picked on the way.
          */}
          {activeRow?.snapshot ? (
            <ContextChipLadder
              snapshot={activeRow.snapshot}
              collapsedHint={false}
              onMoveUpFromLadder={() => focusLastSessionContextRow() || (onMoveUp?.() ?? false)}
            />
          ) : null}
        </div>
      ) : null}
    </Focusable>
  );
}
