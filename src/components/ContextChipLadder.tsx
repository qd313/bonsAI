/**
 * Title: Context chip ladder
 *
 * Purpose: The row of small colored chips that appears once you open
 * "Session context" above the chat, or inside a turn's own "Show details"
 * panel — one chip per kind of extra material attached to a question (files
 * read, a screenshot, remembered notes, developer info…). Stepping between
 * chips with the D-pad opens a panel below showing exactly what that chip
 * contains. Collapsed, it is just a small "Context used · tap for details"
 * link.
 *
 * Used for: SessionContextStrip, and the live turn's own "Show details"
 * panel — anywhere a person can check what the AI actually saw for a
 * question.
 *
 * Solves: One shared chip strip and detail panel, colored by content type,
 * so a person can read exactly what the AI was given instead of guessing.
 *
 * Does not: Decide what belongs on the chips. The list of chips and their
 * contents comes from a snapshot built elsewhere (the inputTransparency
 * utils and orchestration hooks); this file only draws them.
 *
 * Gotchas: Each chip is its own Focusable, so Steam's ring sits on the one
 * chip, and the D-pad moves it chip to chip; the chip holding the ring is the
 * open one. Until plan 79 the whole ladder was one Focusable, and the Deck
 * drew the ring round the label, the row and the open chip's panel together:
 * a box 169 to 337 px tall that changed size on every press and reached down
 * behind the question box (plan79-P79-M3-DETAILS-RING.json). The ladder's
 * own root still takes focus from the callers that look it up by name or
 * class, and hands it straight on to the open chip. The open chip's fill is a
 * hand-drawn cue in a different colour from the ring, on purpose: an earlier
 * version glowed it in the ring's colour, which was unreadable next to it.
 * Every chip is always drawn, at one size, none faded, and a step scrolls
 * nothing: the row stays where it is while the panel under it changes height
 * (useChipLadderReveal.ts; the whole answer jumped on every press before
 * 2026-10-08). Down off the last chip first scrolls the end of a tall panel
 * into view, then leaves.
 */
import { useCallback, useRef, useState } from "react";
import type { FocusEvent } from "react";
import { Focusable } from "@decky/ui";
import type {
  AskDiagnosticsSnapshot,
  ChatSlotTurnTransparency,
  ContextChip,
  TransparencySnapshot,
} from "../utils/inputTransparency";
import {
  ATTRIBUTION_ACCENT,
  ATTRIBUTION_ACCENT_SOFT,
  chipAttribution,
  chipBodyBullets,
  chipBodyPaths,
  chipBodyTitle,
  chipDevJson,
  chipsFromSnapshot,
  CREDITS_SHOWN,
  creditCardLabel,
  type CreditsView,
  SPOILER_HIDDEN_CREDITS_TEXT,
} from "../utils/contextChipsFromSnapshot";
import { isOkDeckButtonEvent } from "../utils/focusNavigation";
import { useChipLadderReveal } from "../hooks/useChipLadderReveal";
import { scrollRestOfBodyIntoView } from "../utils/chatPanelScroll";
import { elementHasFocus } from "../utils/uiDocument";
import { focusRowElement } from "../utils/focusPerTurnRow";
import { DECK_HIGHLIGHT_CYAN } from "../features/unified-input/constants";

const deckNav = (handlers: Record<string, () => boolean | void>) =>
  handlers as unknown as Record<string, unknown>;

// The open chip's fill: a manual "which one is showing below" cue (roadmap: "The active chip in
// Show details is hard to spot"), drawn whether or not the ring is on the ladder, so it
// deliberately does not reuse the reserved-for-real-focus white ring from design-tokens.md; it
// uses DECK_HIGHLIGHT_CYAN, the token already meant for "active controls".
//
// One colour on the row, chosen by the maintainer 2026-09-05 after seeing it on device: the first
// version of this cue added a cyan glow *on top of* borders that were already green, orange, red or
// tan (model licence tier, and whether the chip carries a credit), so six colours could share one
// row and the white D-pad ring had to compete with all of them -- "went from ambiguous focus to too
// much noise". Now every chip carries the same flat border and only the active one is filled. The
// glow is gone with the rest: a 2px cyan ring around a chip read as a focus ring, which is exactly
// the confusion the change is meant to remove. Tier and credit are still shown, in words, in the
// panel that opens below the row (see ChipExpandedBody) -- they were never row-only information.
const ACTIVE_CHIP_FILL = "rgba(156, 231, 255, 0.22)";
const ACTIVE_CHIP_BORDER = DECK_HIGHLIGHT_CYAN;
const CHIP_BORDER = "rgba(96, 118, 144, 0.55)";

export type ContextChipLadderProps = {
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | null | undefined;
  /** When true, show compact hint only until expanded. */
  collapsedHint?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  /** D-pad Down from collapsed hint → session context strip (skips Save chat). */
  onMoveDownFromHint?: () => boolean;
  /** D-pad Up from ladder (first chip) → Retry / Show details utility row. */
  onMoveUpFromLadder?: () => boolean;
  /** D-pad Down from ladder (last chip) → session context strip. */
  onMoveDownFromLadder?: () => boolean;
  /**
   * Full `ask_diagnostics` payload, shown inside the "Developer details" chip's body when that
   * chip is active. Folded in here 2026-08-22/28 (roadmap: "Fold Show diagnostics into Show
   * details") so Show details is the single disclosure entry point instead of two adjacent
   * buttons. The caller is responsible for the gate — pass `null`/`undefined` unless desktop
   * verbose logging is on, matching the standalone "Show diagnostics" button's old gating exactly.
   */
  devDiagnostics?: AskDiagnosticsSnapshot | null;
  /**
   * The ladder's own root element, handed back to the caller so it can be registered and focused
   * by name. Measured on the Deck 2026-09-21: Down from the details panel's tabs row called
   * `focusContextChipLadder`, which finds this element by class and then `focusDeckOwner`s it --
   * and that returns false here, because the root is a genuine `.Panel.Focusable` carrying no
   * `tabindex` on device and holding no natively focusable descendant to fall back to. That is the
   * exact trade-off `focusDeckOwner`'s own comment says is UNKNOWN for this target; it is now
   * measured, and it is real. With the move reported as unhandled, Steam's default navigation ran
   * and threw the ring out of the panel onto a preset chip in the dock.
   */
  rootRef?: (el: HTMLElement | null) => void;
  /**
   * How the credit block treats a spoiler-protected note: the whole line swapped for one plain
   * sentence, or a protected name swapped for its neutral title (CreditsView,
   * contextChipsFromSnapshot.ts). Absent: credits show as they always did. Text only: adds no
   * D-pad stop.
   */
  creditsView?: CreditsView;
};

/**
 * The ladder itself: the collapsed hint link, or — once expanded — the row
 * of chips plus the detail panel for whichever one is active.
 *
 * In: the transparency snapshot to build chips from, whether to start
 * collapsed, callbacks for expand/collapse and for handing the D-pad off
 * the top or bottom edge, and — only for the "Developer details" chip — the
 * raw diagnostics payload to show inside it.
 * Out: "No context chips" text, the collapsed hint link, or the full
 * ladder.
 *
 * What can go wrong: nothing here fetches data. chipsFromSnapshot() turns
 * the snapshot into chips once, synchronously, and everything below just
 * walks that fixed list.
 *
 * 1. Build the chip list with chipsFromSnapshot(); if it is empty, say so
 *    and stop.
 * 2. While collapsed, render just the "Context used · tap for details"
 *    link; tapping it or pressing A expands the ladder.
 * 3. Once expanded, every chip is drawn, at full strength and one size,
 *    however many there are: a row that adds, drops or resizes a chip as you
 *    step re-wraps and shifts the whole answer above it (2026-10-08).
 * 4. Left/Right and Up/Down all move the same active chip. Moving right or
 *    down off the last chip (after scrolling the rest of a tall panel into
 *    view, if some of it is behind the dock), or left/up off the first,
 *    falls through to onMoveDownFromLadder/onMoveUpFromLadder so the D-pad
 *    can leave the ladder entirely.
 * 5. Draw the chip row, the open chip marked by its fill and border only,
 *    then hand the active chip to ChipExpandedBody() to draw its details below.
 */
export function ContextChipLadder({
  snapshot,
  collapsedHint = false,
  onExpandChange,
  onMoveDownFromHint,
  onMoveUpFromLadder,
  onMoveDownFromLadder,
  devDiagnostics = null,
  rootRef,
  creditsView = CREDITS_SHOWN,
}: ContextChipLadderProps) {
  const chips = chipsFromSnapshot(snapshot);
  const [expanded, setExpanded] = useState(!collapsedHint);
  const [activeIndex, setActiveIndex] = useState(0);
  const ladderElRef = useRef<HTMLElement | null>(null);
  const rowElRef = useRef<HTMLElement | null>(null);
  const bodyElRef = useRef<HTMLElement | null>(null);
  const { duringStep, keepInView, holdPosition, holdRef, onFocusInside } = useChipLadderReveal(
    ladderElRef,
    rowElRef,
    bodyElRef,
  );
  /* Each drawn chip's own element, by its index in `chips`; the open chip's index as last drawn. */
  const chipEls = useRef(new Map<number, HTMLElement>());
  const openIndexRef = useRef(0);

  const ringOnChip = (idx: number): boolean => {
    const el = chipEls.current.get(idx);
    return el ? focusRowElement(el) : false;
  };

  const setExpandedBoth = useCallback(
    (v: boolean) => {
      setExpanded(v);
      onExpandChange?.(v);
    },
    [onExpandChange],
  );

  if (!chips.length) {
    return (
      <div style={{ fontSize: 11, color: "#8fa6bd", marginTop: 8, fontStyle: "italic" }}>
        No context chips for this Ask.
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, chips.length - 1);
  openIndexRef.current = safeIndex;
  const active = chips[safeIndex];

  if (!expanded) {
    return (
      <Focusable
        className="bonsai-context-hint"
        onActivate={() => setExpandedBoth(true)}
        onButtonDown={(evt) => {
          if (!isOkDeckButtonEvent(evt)) return false;
          setExpandedBoth(true);
          return true;
        }}
        {...deckNav({
          ...(onMoveDownFromHint ? { onMoveDown: () => onMoveDownFromHint() ?? false } : {}),
        })}
        style={{ marginTop: 8, width: "100%", maxWidth: "100%" }}
      >
        <button
          type="button"
          onClick={() => setExpandedBoth(true)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "#7dd3fc",
            fontSize: 11,
            textDecoration: "underline",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          Context used · tap for details
        </button>
      </Focusable>
    );
  }

  /*
   * Every chip carries its own moves, because Steam calls them on the element holding the ring.
   * A step is a plain focus() onto the next chip: the chips are siblings inside this one
   * container, the case AGENTS.md ("The Steam Deck focus graph") says a plain focus() carries the
   * ring. Off either end the press goes to the caller, as it always did.
   */
  const last = chips.length - 1;
  const stepTo = (idx: number): boolean => {
    /*
     * A step changes the panel drawn under the row and nothing else: the row stays exactly where it
     * is on screen (maintainer's recording, 2026-10-08: the whole answer jumped on every press when
     * a step also scrolled to clear the new panel from the dock). Only the ring's arrival scrolls;
     * see useChipLadderReveal.
     */
    duringStep(() => {
      setActiveIndex(idx);
      ringOnChip(idx);
    });
    keepInView(chipEls.current.get(idx));
    holdPosition();
    return true;
  };
  /*
   * Down (or Right) off the last chip. A panel taller than the room under the row has its end behind
   * the dock while the row stays put (the maintainer, 2026-10-08: "it gets to the end and then the
   * focus moves to the text box ... but the answer also scrolls still"). So the first press scrolls
   * the rest of the panel into view and keeps the ring on the chip; the next press leaves. Not a new
   * stop: the ring does not move. When the panel already fits, or the pane has no scroll left, the
   * press leaves at once.
   */
  const leaveDown = () => {
    const body = bodyElRef.current;
    if (body && scrollRestOfBodyIntoView(body)) return true;
    return Boolean(onMoveDownFromLadder?.());
  };
  const chipMoves = (idx: number) => ({
    onMoveLeft: () => (idx > 0 ? stepTo(idx - 1) : false),
    onMoveRight: () => (idx < last ? stepTo(idx + 1) : leaveDown()),
    onMoveUp: () => (idx > 0 ? stepTo(idx - 1) : Boolean(onMoveUpFromLadder?.())),
    onMoveDown: () => (idx < last ? stepTo(idx + 1) : leaveDown()),
  });

  /*
   * The root itself is focused by name or class from outside (the tabs row, Up from the chips
   * below, the reply's own Down chain). Hand that on to the open chip once the focus event has
   * finished, so Steam has seen the root's focus before the chip's and the chip's is the last
   * word. A chip's own focus bubbles here too; it counts as an arrival only if it came from outside.
   */
  const onLadderFocus = (e: FocusEvent<HTMLElement>) => {
    const root = e.currentTarget;
    if (e.target === root) {
      queueMicrotask(() => {
        const onAChip = [...chipEls.current.values()].some((el) => elementHasFocus(el));
        if (elementHasFocus(root) && !onAChip) ringOnChip(openIndexRef.current);
      });
    }
    onFocusInside(e);
  };

  /*
   * B collapses the ladder back to its own hint link. `onCancelButton` + `preventDefault`, not
   * `onButtonDown` checking the button code: measured on device 2026-08-28
   * (DrgGlossaryTermChip.tsx, buildReasoningFoldElement.tsx) that `onButtonDown` does receive B,
   * but returning `true` from it does NOT stop Steam also backing the ring out of the panel —
   * only `onCancelButton` genuinely consumes the press. It sits on each chip, the element holding
   * the ring. Safe unconditionally: the chips only exist while the ladder is expanded.
   */
  const onCancelButton = (e: unknown) => {
    setExpandedBoth(false);
    (e as { preventDefault?: () => void })?.preventDefault?.();
  };

  return (
    <Focusable
      className="bonsai-chip-ladder"
      ref={(el: HTMLElement | null) => {
        ladderElRef.current = el;
        rootRef?.(el);
      }}
      onFocus={onLadderFocus}
      style={{ marginTop: 8, width: "100%", maxWidth: "100%", minWidth: 0 }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          // Grey, not cyan: the counter is a caption, and the only thing on this row allowed to be
          // coloured is the chip you are on.
          color: "rgba(159, 183, 213, 0.9)",
          letterSpacing: "0.03em",
          marginBottom: 6,
        }}
      >
        Chip {safeIndex + 1} of {chips.length}
      </div>
      <div
        ref={(el) => {
          rowElRef.current = el;
        }}
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
          width: "100%",
          alignItems: "flex-start",
        }}
      >
        {chips.map((chip, idx) => {
          const isActive = idx === safeIndex;
          return (
            <Focusable
              key={chip.id}
              ref={(el: HTMLElement | null) => {
                if (el) chipEls.current.set(idx, el);
              }}
              onFocus={() => setActiveIndex(idx)}
              {...deckNav(chipMoves(idx))}
              {...({ onCancelButton } as Record<string, unknown>)}
              className={
                isActive
                  ? "bonsai-chip-ladder-chip bonsai-chip-ladder-chip--active"
                  : "bonsai-chip-ladder-chip"
              }
              style={{
                display: "inline-block",
                boxSizing: "border-box",
                width: "fit-content",
                maxWidth: "100%",
                flex: "0 0 auto",
                /* The same size and weight on every chip: a bigger open chip changed widths and re-wrapped the rows. */
                fontSize: 10,
                fontWeight: 400,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${isActive ? ACTIVE_CHIP_BORDER : CHIP_BORDER}`,
                background: isActive ? ACTIVE_CHIP_FILL : "rgba(26, 34, 44, 0.88)",
                color: "#e2e8f0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {chip.label}
            </Focusable>
          );
        })}
      </div>
      <ChipExpandedBody
        chip={active}
        devDiagnostics={active.id === "developer" ? devDiagnostics : null}
        creditsView={creditsView}
        bodyRef={(el) => {
          bodyElRef.current = el;
        }}
      />
      {/* Empty, 0 high until a step to a shorter panel would shorten the pane under its scroll (useChipLadderReveal). */}
      <div aria-hidden="true" className="bonsai-chip-ladder-hold" ref={holdRef} style={{ height: 0 }} />
    </Focusable>
  );
}

/**
 * The panel below the chip row: title, credit/attribution block, file
 * paths, bullet points, and — for the Developer details chip only — raw
 * JSON dumps.
 *
 * In: the active chip, plus — only for the "developer" chip — the raw
 * ask_diagnostics payload to show underneath everything else.
 * Out: one detail panel. Every section is optional and only renders when
 * that chip actually has something of that kind to show.
 *
 * What can go wrong: none of the helper calls here can fail — chipBodyBullets(),
 * chipBodyPaths(), chipAttribution(), and chipDevJson() all just read
 * fields already computed onto the chip and default to empty.
 *
 * 1. Pull the possible sections off the chip: bullets, paths, attribution
 *    entries, and any raw JSON blob.
 * 2. Always show the title from chipBodyTitle().
 * 3. If there is attribution, show it first, as a highlighted block with
 *    source, license, and capture date.
 * 4. Then any file paths, one per line.
 * 5. Then bullet points, if there are any.
 * 6. Then the chip's own JSON dump, if it carries one.
 * 7. Finally, only on the developer chip, the separate ask_diagnostics
 *    dump — folded in here so "Show details" is the one place raw
 *    diagnostics live, instead of a second button next to it.
 */
function ChipExpandedBody({
  chip,
  devDiagnostics,
  creditsView = CREDITS_SHOWN,
  bodyRef,
}: {
  chip: ContextChip;
  devDiagnostics?: AskDiagnosticsSnapshot | null;
  creditsView?: CreditsView;
  /** Hands the panel's own element back, so the ladder can scroll the end of a tall one into view. */
  bodyRef?: (el: HTMLDivElement | null) => void;
}) {
  const creditsHidden = creditsView.hidden;
  const bullets = chipBodyBullets(chip);
  const paths = chipBodyPaths(chip);
  const attribution = chipAttribution(chip);
  const devJson = chipDevJson(chip);
  return (
    <div
      ref={bodyRef}
      className="bonsai-chip-body"
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid rgba(100, 140, 180, 0.28)",
        background: "rgba(14, 22, 32, 0.55)",
        fontSize: 11,
        color: "#dce8f4",
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{chipBodyTitle(chip)}</div>
      {attribution.length > 0 ? (
        <div
          style={{
            marginBottom: 8,
            padding: "6px 8px",
            borderRadius: 6,
            borderLeft: `3px solid ${ATTRIBUTION_ACCENT}`,
            background: ATTRIBUTION_ACCENT_SOFT,
          }}
        >
          {creditsHidden ? (
            <div style={{ fontStyle: "italic", color: "#c9b892" }}>{SPOILER_HIDDEN_CREDITS_TEXT}</div>
          ) : null}
          {creditsHidden ? null : attribution.map((entry) => (
            <div key={`${entry.source}|${entry.license}`} style={{ marginBottom: 2 }}>
              <span style={{ fontWeight: 700, color: ATTRIBUTION_ACCENT }}>{entry.source}</span>
              {entry.license ? (
                <span style={{ fontSize: 10, color: "#c9b892" }}> · {entry.license}</span>
              ) : null}
              {entry.captured ? (
                <span style={{ fontSize: 10, color: "#c9b892" }}> · as of {entry.captured}</span>
              ) : null}
              {entry.cards.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                  {entry.cards.map((rawCard, cardIndex) => {
                    const card = creditCardLabel(rawCard, creditsView);
                    return (
                    <span
                      key={`${cardIndex}|${card}`}
                      title={card}
                      style={{
                        display: "inline-block",
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 9,
                        padding: "1px 6px",
                        borderRadius: 999,
                        border: "1px solid rgba(214, 174, 116, 0.4)",
                        color: "#9fb7d5",
                      }}
                    >
                      {card}
                    </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {paths.map((p) => (
        <div key={p} style={{ fontSize: 10, color: "#9fb7d5", wordBreak: "break-all", marginBottom: 4 }}>
          {p}
        </div>
      ))}
      {bullets.length > 0 ? (
        <ul style={{ margin: "4px 0 0", paddingLeft: "1.1em" }}>
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      {devJson != null ? (
        <pre
          style={{
            marginTop: 8,
            fontSize: 9,
            maxHeight: 200,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(0,0,0,0.25)",
            padding: 6,
            borderRadius: 4,
          }}
        >
          {JSON.stringify(devJson, null, 2)}
        </pre>
      ) : null}
      {devDiagnostics != null ? (
        <>
          {/* Formerly a separate "Show diagnostics" button next to Show details (roadmap: "Fold
              Show diagnostics into Show details") — same raw ask_diagnostics dump, same gate on
              desktop verbose logging, now reached by opening this chip instead of a second button. */}
          <div style={{ fontWeight: 700, marginTop: 10, marginBottom: 6 }}>Ask diagnostics</div>
          <pre
            style={{
              fontSize: 9,
              maxHeight: 200,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "rgba(0,0,0,0.25)",
              padding: 6,
              borderRadius: 4,
            }}
          >
            {JSON.stringify(devDiagnostics, null, 2)}
          </pre>
        </>
      ) : null}
    </div>
  );
}
