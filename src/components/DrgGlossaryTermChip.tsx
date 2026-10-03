/**
 * Title: DRG glossary term chip
 *
 * Purpose: One underlined word inside an AI reply, for a Deep Rock Galactic
 * Survivor term the game does not explain well on its own (like "kiting").
 * Tapping or pressing A on it opens a small floating definition — a short
 * one-line peek first, then the full explanation — with a button to ask the
 * AI to explain further. It closes itself again after a few seconds, or
 * when dismissed.
 *
 * Used for: Drawn by MainTabBonsaiAiMarkdownChunk wherever it finds one of
 * these known terms inside a reply.
 *
 * Solves: The game's own glossary leaves some terms undefined; this lets a
 * player look one up without derailing the conversation to ask about it.
 *
 * Does not: Decide which words count as glossary terms, or find them inside
 * the reply text — that is data/drgGlossaryTerms.ts and
 * drgGlossaryTermMatch.ts. This file only draws one term that has already
 * been matched.
 *
 * Gotchas:
 * - Touch and the D-pad behave differently on purpose. A tap shows the
 *   short peek first and dismisses itself on a timer; pressing A instead
 *   goes straight to the full definition, and a second A asks the AI to
 *   explain further. See the note on the touch path below for why they are
 *   split this way.
 * - Closing the popup with B has to use `onCancelButton`, not the ordinary
 *   button handler — a plain handler let the press close the popup and
 *   still back the D-pad out of the whole reply at the same time.
 *   `onCancelButton` is the one that actually stops there (measured on the
 *   Deck).
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Focusable } from "@decky/ui";

import { getUiDocument } from "../utils/uiDocument";

import type { DrgGlossaryTerm } from "../data/drgGlossaryTerms";
import {
  isCancelDeckButtonEvent,
  isDeckDirectionDownEvent,
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDeckDirectionUpEvent,
  isOkDeckButtonEvent,
} from "../utils/focusNavigation";
import { registerDrgGlossaryTermChip } from "../utils/drgGlossaryTermRegistry";
import { findTabContentsScroll, readableBottomOf } from "../utils/chatPanelScroll";
import {
  placeGlossaryTooltip,
  type GlossaryTooltipPlacement,
} from "../utils/drgGlossaryTooltipPlacement";

/** Per-mount counter for chip ids; only needs to be unique among mounted chips. */
let termChipSeq = 0;

export type DrgGlossaryTermChipProps = {
  term: DrgGlossaryTerm;
  /** The exact substring matched in the reply (may differ in case/tense from `term.term`). */
  matchedText: string;
  onExplainFurther?: (term: DrgGlossaryTerm) => void;
};

type ChipState = "idle" | "peek" | "full";

/** Re-checks after an open, for moves that raise no scroll event we hear. */
const TOOLTIP_SETTLE_PASS_DELAYS_MS = [100, 300, 900];

/*
 * A tap-opened popup dismisses itself; a gamepad-opened one does not. Touch has no B button and no
 * blur to lean on (tapping empty QAM space moves no focus), so without a timer a tapped popup
 * could sit over the reply forever. The peek is one short sentence — 4s covers reading it twice;
 * the full definition gets long enough to read it and still reach the Explain further button.
 */
export const TAP_PEEK_DISMISS_MS = 4000;
export const TAP_FULL_DISMISS_MS = 10000;

function isAnyDirectionEvent(evt: unknown): boolean {
  return (
    isDeckDirectionUpEvent(evt) ||
    isDeckDirectionDownEvent(evt) ||
    isDeckDirectionLeftEvent(evt) ||
    isDeckDirectionRightEvent(evt)
  );
}

/**
 * The chip itself: the underlined word, plus its popup while open.
 *
 * In: the glossary term to show, the exact text matched in the reply
 * (which may differ in case or tense from the term's own name), and a
 * callback for when someone asks to explain it further.
 * Out: the underlined span, plus — while open — a small floating popup
 * portalled to the very top of the page, so it can escape the reply
 * bubble's own clipping and blur effects.
 *
 * What can go wrong: the word moves after the popup opens (Steam scrolls it
 * into view), so the popup re-places itself on every scroll — see reposition. Nothing here calls the
 * backend; the only side effect is onExplainFurther, which starts a new Ask
 * elsewhere.
 *
 * 1. Track state as one of idle / peek / full.
 * 2. Register this chip's DOM node under a per-mount id, so other code
 *    (the reply stack) can find and clear it without a page-wide search.
 * 3. On the D-pad: A calls activate(), which opens straight to full and,
 *    from full, calls onExplainFurther and closes. B or any direction
 *    press closes the popup.
 * 4. On touch: a tap calls onTermTap(), which steps
 *    idle → peek → full → idle one stage at a time, with peek and full
 *    each dismissing themselves on a timer.
 * 5. When open, the popup is drawn through a portal to the page body
 *    rather than inside the chip, placed from the word's current box,
 *    above the dock, and placed again after every scroll.
 */
export function DrgGlossaryTermChip(props: DrgGlossaryTermChipProps) {
  const { term, matchedText, onExplainFurther } = props;
  const [state, setState] = useState<ChipState>("idle");

  // Stable per-mount id so this chip can be registered and de-registered without a DOM lookup.
  const idRef = useRef<string>("");
  if (!idRef.current) {
    termChipSeq += 1;
    idRef.current = `drg-glossary-${termChipSeq}`;
  }
  useEffect(() => () => registerDrgGlossaryTermChip(idRef.current, null), []);

  /** The chip's own DOM node, for anchoring the portal tooltip to its on-screen position. */
  const chipElRef = useRef<HTMLElement | null>(null);

  /** The tooltip's own node and where it was last placed (null until the first measurement). */
  const tooltipElRef = useRef<HTMLSpanElement | null>(null);
  const [box, setBox] = useState<GlossaryTooltipPlacement | null>(null);

  /*
   * Place the tooltip from the word's box RIGHT NOW. It used to be placed once, from where the
   * word stood at the press; Steam then scrolled the word into view and the tooltip stayed
   * behind, so a word that had been under the dock ended up under its own definition (3 of 14
   * stops on the Deck, 2026-10-03). So this runs after the render AND after every scroll. The
   * bottom edge is the dock's top as the page reports it (readableBottomOf), never a number.
   */
  const reposition = () => {
    const wordEl = chipElRef.current;
    const tipEl = tooltipElRef.current;
    const scope = wordEl?.closest(".bonsai-scope")?.getBoundingClientRect();
    if (!wordEl || !tipEl || !scope) return;
    const pane = findTabContentsScroll(wordEl);
    const viewH = getUiDocument().documentElement?.clientHeight || 0;
    let bottomLimit = pane ? readableBottomOf(pane) : viewH || Number.POSITIVE_INFINITY;
    if (viewH > 0) bottomLimit = Math.min(bottomLimit, viewH);
    const next = placeGlossaryTooltip({
      word: wordEl.getBoundingClientRect(),
      scope,
      topLimit: Math.max(0, pane?.getBoundingClientRect().top ?? 0),
      bottomLimit,
      // scrollHeight is the text's own height even while capped; +2 is the border.
      height: tipEl.scrollHeight + 2,
    });
    setBox((prev) =>
      prev &&
      prev.left === next.left &&
      prev.top === next.top &&
      prev.width === next.width &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next,
    );
  };
  const repositionRef = useRef(reposition);
  repositionRef.current = reposition;

  useLayoutEffect(() => {
    if (state === "idle") {
      setBox(null);
      return undefined;
    }
    repositionRef.current();
    const doc = getUiDocument();
    const again = () => repositionRef.current();
    // Capture: scroll events do not bubble.
    doc.addEventListener("scroll", again, true);
    window.addEventListener("resize", again);
    const timers = TOOLTIP_SETTLE_PASS_DELAYS_MS.map((ms) => window.setTimeout(again, ms));
    return () => {
      doc.removeEventListener("scroll", again, true);
      window.removeEventListener("resize", again);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [state]);

  const dismissTimerRef = useRef<number | null>(null);
  const clearDismissTimer = () => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  };
  useEffect(() => clearDismissTimer, []);

  /** Every state change funnels through here so no path can leave a stale auto-dismiss pending. */
  const setChipState = (next: ChipState, autoDismissMs?: number) => {
    clearDismissTimer();
    setState(next);
    if (autoDismissMs && next !== "idle") {
      dismissTimerRef.current = window.setTimeout(() => {
        dismissTimerRef.current = null;
        setState("idle");
      }, autoDismissMs);
    }
  };

  /*
   * A opens the full definition; a second A (from full) triggers explain-further and closes.
   * Mirrors BonsaiSpoilerFence's single-Focusable A/direction split: a real button is click-only,
   * the Focusable owns A and D-pad (`AGENTS.md (Decky focus graph)`).
   */
  const activate = () => {
    if (state === "full") {
      onExplainFurther?.(term);
      setChipState("idle");
    } else {
      setChipState("full");
    }
  };

  const explainFurther = () => {
    onExplainFurther?.(term);
    setChipState("idle");
  };

  /*
   * The touch path, distinct from `activate` on purpose. A tap wants the short plain-language
   * peek first (maintainer request 2026-08-28), self-dismissing; a second tap while it shows
   * escalates to the full definition. A third tap dismisses rather than firing explain-further —
   * on a touchscreen an accidental triple-tap must not cost an Ask, so only the explicit
   * Explain further button sends one from this path.
   *
   * `tapStateRef` snapshots the state at pointerdown because on the Deck the tap itself moves
   * gamepad focus, so onFocus fires (idle → peek) *before* onClick — deciding from the live state
   * would make every first tap read "peek" and jump straight to full.
   */
  const tapStateRef = useRef<ChipState | null>(null);
  const onTermTap = () => {
    const from = tapStateRef.current ?? state;
    tapStateRef.current = null;
    if (from === "idle") setChipState("peek", TAP_PEEK_DISMISS_MS);
    else if (from === "peek") setChipState("full", TAP_FULL_DISMISS_MS);
    else setChipState("idle");
  };

  return (
    <Focusable
      className={`bonsai-drg-glossary-term${state !== "idle" ? " bonsai-drg-glossary-term--open" : ""}`}
      ref={(el: HTMLElement | null) => {
        chipElRef.current = el;
        registerDrgGlossaryTermChip(idRef.current, el);
      }}
      onFocus={() => {
        // Gamepad arrival takes over any tap-opened popup: kill its timer, keep what is showing.
        clearDismissTimer();
        setState((s) => (s === "idle" ? "peek" : s));
      }}
      onBlur={() => setChipState("idle")}
      onActivate={activate}
      {...(state !== "idle"
        ? ({
            /*
             * B closes the popup without leaving the reply — and only `onCancelButton` can deliver
             * that. Instrumented on device 2026-08-28: `onButtonDown` receives the B press (button
             * 2) and returning true does NOT stop Steam from also backing the ring out of the
             * pane, while `onCancelButton` + preventDefault genuinely consumes it. The handler is
             * attached only while the popup is open, and that too is measured, not styling: its
             * mere presence suppresses Steam's back-out even when the handler does nothing, so an
             * always-on handler would leave B dead on an idle chip. Wired conditionally, the flow
             * is: first B closes the popup (ring stays on the term), second B — handler gone —
             * backs out of the pane as Steam intends. `onCancel` never fired on device; this is
             * the one that does.
             */
            onCancelButton: (e: unknown) => {
              setChipState("idle");
              (e as { preventDefault?: () => void })?.preventDefault?.();
            },
          } as Record<string, unknown>)
        : {})}
      onButtonDown={(evt: unknown) => {
        if (isOkDeckButtonEvent(evt)) {
          activate();
          return true;
        }
        /*
         * Dismiss via B or any D-pad direction (roadmap requirement). B is fully consumed — the
         * ring stays on the term, idle. A direction only closes the popup and then falls through
         * (`return false`) so the press still does its normal job of moving focus on, the same
         * "let non-A propagate" shape the spoiler fence uses for the same reason.
         */
        if (isCancelDeckButtonEvent(evt)) {
          setChipState("idle");
          return true;
        }
        if (isAnyDirectionEvent(evt)) {
          setChipState("idle");
          return false;
        }
        return false;
      }}
      style={{ position: "relative", display: "inline-block" }}
    >
      <span
        className="bonsai-drg-glossary-term-text"
        onPointerDown={() => {
          tapStateRef.current = state;
        }}
        onClick={onTermTap}
        style={{
          textDecoration: "underline dotted rgba(156, 231, 255, 0.75)",
          textUnderlineOffset: 2,
          /*
           * Chrome's default skip-ink breaks the underline around descenders, and in "kiting" the
           * g's descender eats the whole last letter — on device the underline visibly stopped at
           * the n (maintainer screenshot 2026-08-28). Underline every letter instead.
           */
          textDecorationSkipInk: "none",
          cursor: "pointer",
        }}
      >
        {matchedText}
      </span>
      {state !== "idle" && (
        /*
         * Portal to the document body, positioned fixed — both halves load-bearing, measured on
         * device 2026-08-28. Rendered inside the chip, the popup inherited the chip's ~33px width
         * (an absolutely-positioned box resolves width against its containing block) and every
         * ancestor from the response stack up clips overflow, so all that survived on screen was
         * a one-word-per-line sliver over the reply text. `position: fixed` alone cannot escape
         * either: the bubble's backdrop-filter makes it a containing block for fixed descendants.
         * Only leaving the subtree entirely does — hence the portal. Placed beside the chip
         * (above, else below, never on it), clamped to the plugin column; see reposition.
         */
        createPortal(
          <span
            className="bonsai-drg-glossary-tooltip"
            role="tooltip"
            ref={tooltipElRef}
            style={{
              position: "fixed",
              left: box?.left ?? 0,
              top: box?.top ?? 0,
              width: box?.width ?? 240,
              // Set only when neither side fits the whole text: it scrolls instead of reaching the word.
              ...(box?.maxHeight !== undefined ? { maxHeight: box.maxHeight, overflowY: "auto" as const } : {}),
              zIndex: 9000,
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(150, 187, 223, 0.45)",
              background: "rgba(24, 40, 58, 0.95)",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.45)",
              fontSize: 11,
              lineHeight: 1.4,
              color: "rgba(220, 232, 245, 0.92)",
              whiteSpace: "normal",
            }}
          >
          {state === "peek" ? (
            term.peek
          ) : (
            <>
              <div>{term.full}</div>
              <button
                type="button"
                className="bonsai-drg-glossary-explain-further"
                onClick={(e) => {
                  e.stopPropagation();
                  explainFurther();
                }}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "1px solid rgba(150, 187, 223, 0.45)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  color: "rgba(156, 231, 255, 0.95)",
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                Explain further
              </button>
            </>
          )}
          </span>,
          getUiDocument().body,
        )
      )}
    </Focusable>
  );
}
