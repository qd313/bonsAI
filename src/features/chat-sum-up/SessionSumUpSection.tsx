/**
 * Title: Sum up this chat, and what the AI remembers
 *
 * Purpose: The top of the Session tab (plan 68, as drawn): the *Sum up this chat* button in Clear's
 * old look, the one line saying why it is greyed out when it is, and the card showing the summary
 * the AI now carries in place of the chat's older turns.
 *
 * Used for: SessionContextTabBody in components/SessionContextStrip.tsx, above the turn rows.
 *
 * Solves: Replaces Clear, which could only throw a chat's memory away, with the one control that
 * keeps it: the summary is written while you watch, and nothing in the chat is deleted.
 *
 * Does not: Keep a timer or a "working" flag of its own. The tab is rebuilt whenever Show details
 * or the Quick Access menu closes, so both come from the back end through `ChatSumUpState`
 * (useChatSumUpJob.ts). Does not decide whether there is anything to sum up — `canSumUp` does.
 *
 * Focus graph (plan 68 § 6; measured on the Deck 2026-09-25, plan68-3D-SESSION-LAYOUT):
 *
 *   This answer | Session · N        (the tabs row, unchanged)
 *      | Down                   ^ Up
 *   [ Sum up this chat ]              <- stop; A starts it, the ring stays; greyed = still a stop, A does nothing
 *      | Down                   ^ Up
 *   What the AI remembers card        <- stop only when a summary exists; A does nothing
 *      | Down                   ^ Up
 *   the turn rows, then the active row's chips (unchanged)
 *
 * The card is a stop because it is usually taller than the room left under the button (83 px on
 * the measured screen against a 200-280 px card), so its bottom sits behind the dock until the ring
 * lands on it and the dock lift scrolls it clear — and a chat with no rows under the card would
 * otherwise have nothing to scroll it into view at all. Down from the last thing here does whatever
 * `onMoveDownPastSection` says: the first turn row when there is one, else (plan 72) the way out of
 * the whole panel that the chip ladder's last Down uses; the caller decides when to consume it.
 */
import React, { useEffect, useRef } from "react";
import { Focusable } from "@decky/ui";

import { ThinkingSpinnerIcon } from "../../components/icons";
import { isDeckDirectionDownEvent, isDeckDirectionUpEvent } from "../../utils/focusNavigation";
import { elementHasGamepadFocus, uiGamepadFocusElement } from "../../utils/uiDocument";
import { revealBelowKeepingAsItSettles, revealOnceWhenMounted } from "../../utils/chatPanelScroll";
import { focusRowElement } from "../../utils/focusPerTurnRow";
import {
  registerNavFocus,
  takeNavFocus,
  unregisterNavFocus,
  type NavRefHolder,
} from "../../utils/navFocusRegistry";
import {
  summaryCardFooter,
  summaryCardLines,
  summaryCardMeta,
  sumUpButtonView,
  type ChatSumUpState,
} from "./chatSumUpModel";

/*
 * At most one Session tab body is ever mounted (only the newest answer carries it), so one slot
 * each is enough — the same reasoning SessionContextStrip.tsx gives for its own row lookup, done
 * here with refs instead of a page search.
 */
let sumUpButtonEl: HTMLElement | null = null;
let summaryCardEl: HTMLElement | null = null;
let sumUpReasonEl: HTMLElement | null = null;

/** The Sum up button of the Session tab on screen: where Down from the tabs row lands. */
export function focusSumUpButton(): boolean {
  return sumUpButtonEl ? focusRowElement(sumUpButtonEl) : false;
}

/** The summary card, when one is showing. */
function focusSummaryCard(): boolean {
  return summaryCardEl ? focusRowElement(summaryCardEl) : false;
}

/** The lowest stop of this section: the card when it shows, else the button. */
export function focusLastSumUpStop(): boolean {
  return focusSummaryCard() || focusSumUpButton();
}

/**
 * Job E's hand-off: Steam's ring from the Sum up button to the card that just appeared, through the
 * card's registered nav node. Tries now, then a frame later and on the 150/300/900 ms settle
 * schedule (the node is filled once Steam registers the new card), and gives up for good the
 * moment Steam's ring is no longer on the button -- the player moved it, or the move landed.
 * Returns a cancel, for the effect's cleanup.
 */
function handRingToNewCard(): () => void {
  let done = false;
  const attempt = () => {
    if (done) return;
    if (!summaryCardEl?.isConnected || !elementHasGamepadFocus(sumUpButtonEl)) {
      done = true;
      return;
    }
    if (takeNavFocus("session-summary-card")) done = true;
  };
  attempt();
  const frame = requestAnimationFrame(attempt);
  const timers = [150, 300, 900].map((delayMs) => window.setTimeout(attempt, delayMs));
  return () => {
    done = true;
    cancelAnimationFrame(frame);
    timers.forEach((t) => window.clearTimeout(t));
  };
}

function directionHandlers(
  el: () => HTMLElement | null,
  onUp: () => boolean,
  onDown: () => boolean,
): Record<string, unknown> {
  return {
    onMoveUp: () => onUp(),
    onMoveDown: () => onDown(),
    onButtonDown: (evt: unknown) => {
      const self = el();
      if (self && !elementHasGamepadFocus(self)) return false;
      if (isDeckDirectionUpEvent(evt)) return onUp();
      if (isDeckDirectionDownEvent(evt)) return onDown();
      return false;
    },
  };
}

/**
 * In: the open chat's summary state (or none yet), whether an answer is being written, and the two
 * ways out of this section -- Up to the tabs row, Down past it to the first turn row.
 * Out: the button, the one reason line when it is greyed out, and the summary card when there is a
 * summary and nothing is being written. Always draws the button.
 * Can go wrong: the card is a stop only while it is mounted; `focusLastSumUpStop` falls back to the
 * button, so Up from the first row never has nowhere to go.
 */
export function SessionSumUpSection(props: {
  state: ChatSumUpState | null | undefined;
  answerInFlight: boolean;
  /** Up off the button: the tabs row above. */
  onMoveUpFromButton: () => boolean;
  /** Down past this section: the first turn row, else the way out of the panel. Its result is
   *  returned as is, so false leaves the press to Steam's own navigation. */
  onMoveDownPastSection: () => boolean;
}): React.ReactElement {
  const { state, answerInFlight, onMoveUpFromButton, onMoveDownPastSection } = props;
  const view = sumUpButtonView({ state, answerInFlight });
  const summary = state?.summary ?? null;

  const press = () => {
    if (view.disabled || !state) return;
    state.startSumUp();
  };
  const downFromCard = () => onMoveDownPastSection();

  /*
   * Job E (plan 72, the maintainer's call): when Sum up finishes while Steam's ring still sits on
   * the button, the ring moves onto the new card, so the card's own reveal can bring it clear.
   * Measured before (plan72-F-SUMUP.json): with the ring kept on the button, a 475 px card had only
   * the 471 px between the button and the dock, and its last line hid behind the question box.
   * Only on that finish: a card already there when the tab opens (from the note under an answer)
   * is left alone, and so is a ring the player moved elsewhere during the wait.
   *
   * Through Steam's own transfer (the card's nav node), not a plain focus(): the first build did
   * focus() and on the Deck the ring stayed on the button twice, 46 s each (plan72-F6-SUMUP.json).
   * A focus() made outside a Steam move event moves only the browser's focus. Steam fills the new
   * card's node a moment after it mounts, so the transfer is retried on the settle schedule.
   */
  const cardNavRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("session-summary-card", cardNavRef);
    return () => unregisterNavFocus("session-summary-card", cardNavRef);
  }, []);
  /* Keyed on whether there is a summary, not on the object: a fresh copy of the same summary
     arriving from the back end must not cancel the retries. */
  const hasSummary = summary != null;
  const wasBusy = useRef(view.busy);
  useEffect(() => {
    const finished = wasBusy.current && !view.busy;
    wasBusy.current = view.busy;
    if (finished && hasSummary) return handRingToNewCard();
    return undefined;
  }, [view.busy, hasSummary]);
  const downFromButton = () => (summary ? focusSummaryCard() : false) || downFromCard();

  return (
    <>
      <Focusable
        className={`bonsai-sumup-btn${view.disabled && !view.busy ? " bonsai-sumup-btn--off" : ""}`}
        ref={(el: HTMLElement | null) => {
          sumUpButtonEl = el;
        }}
        aria-label={view.label}
        aria-disabled={view.disabled}
        onOKButton={press}
        onClick={press}
        /* The dock lift clears the button only; keep its reason line clear too (plan 72). */
        onFocus={() => sumUpReasonEl && revealBelowKeepingAsItSettles(sumUpReasonEl, () => sumUpButtonEl)}
        {...(directionHandlers(() => sumUpButtonEl, onMoveUpFromButton, downFromButton) as Record<string, unknown>)}
      >
        {view.busy ? <ThinkingSpinnerIcon size={14} className="bonsai-thinking-spinner" /> : null}
        <span>{view.label}</span>
      </Focusable>
      {view.reason ? (
        <div
          className="bonsai-sumup-reason"
          ref={(el) => {
            sumUpReasonEl = el;
            revealOnceWhenMounted(el, uiGamepadFocusElement);
          }}
        >
          {view.reason}
        </div>
      ) : null}
      {summary && !view.busy ? (
        <Focusable
          className="bonsai-sumup-card"
          ref={(el: HTMLElement | null) => {
            summaryCardEl = el;
            /* Appears behind the dock otherwise, after Sum up or from the note (plan 72). */
            revealOnceWhenMounted(el, uiGamepadFocusElement);
          }}
          aria-label="What the AI remembers"
          {...({ navRef: cardNavRef } as Record<string, unknown>)}
          /*
           * Holding the ring, come fully clear of the dock (or keep the top on screen when taller
           * than the room). The reveal on mount was held back by the ring above it, and Down from
           * Sum up again put the ring on the card a third behind the question box (plan 72,
           * plan72-Z-FREEPLAY.json finding 2). Scrolls only.
           */
          onFocus={() => summaryCardEl && revealBelowKeepingAsItSettles(summaryCardEl, () => summaryCardEl)}
          {...(directionHandlers(() => summaryCardEl, focusSumUpButton, downFromCard) as Record<string, unknown>)}
        >
          <div className="bonsai-sumup-card-head">
            <span>What the AI remembers</span>
            <span>{summaryCardMeta(summary)}</span>
          </div>
          <ul className="bonsai-sumup-card-lines">
            {summaryCardLines(summary.text).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <div className="bonsai-sumup-card-foot">
            {summaryCardFooter(summary, state?.questionsAfterSummary ?? 0)}
          </div>
        </Focusable>
      ) : null}
    </>
  );
}
