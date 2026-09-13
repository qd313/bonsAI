/**
 * Title: Session context strip
 * Purpose: Summarize live and archived turn context chips above the chat transcript.
 * Used for: MainTabChatTranscript to surface input-transparency snapshots per conversation turn.
 * Solves: Collapsed hint + expandable ladder so users can audit what context reached the model.
 * Does not: Build snapshots or fetch RPC data — receives turns from orchestration hooks.
 */
import { useEffect, useRef, useState } from "react";
import { Focusable } from "@decky/ui";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ChatSlotTurnTransparency, TransparencySnapshot } from "../utils/inputTransparency";
import { ContextChipLadder } from "./ContextChipLadder";
import { chipsFromSnapshot } from "../utils/contextChipsFromSnapshot";
import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../utils/navFocusRegistry";
import { isDeckDirectionUpEvent, isOkDeckButtonEvent } from "../utils/focusNavigation";
import { focusLastSessionContextRow } from "../utils/liveTurnFocusGraph";

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
};

export function SessionContextStrip({
  liveTurn = null,
  archivedTurns = [],
  highlightTurnId = null,
  onHighlightClear,
  onMoveUp,
}: SessionContextStripProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("live");

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
        onActivate={() => setOpen((o) => !o)}
        {...(onMoveUp
          ? ({
              onMoveUp,
              onButtonDown: (evt: unknown) => (isDeckDirectionUpEvent(evt) ? onMoveUp() : false),
            } as Record<string, unknown>)
          : {})}
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
