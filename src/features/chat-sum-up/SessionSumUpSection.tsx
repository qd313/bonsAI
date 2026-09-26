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
 * otherwise have nothing to scroll it into view at all. Down from the last thing here stays put:
 * when nothing follows, the press is consumed rather than left to Steam's own guess, which once
 * threw the ring into the dock from the end of this tab.
 */
import React from "react";
import { Focusable } from "@decky/ui";

import { ThinkingSpinnerIcon } from "../../components/icons";
import { isDeckDirectionDownEvent, isDeckDirectionUpEvent } from "../../utils/focusNavigation";
import { elementHasGamepadFocus } from "../../utils/uiDocument";
import { focusRowElement } from "../../utils/focusPerTurnRow";
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
  /** Down past this section: the first turn row, or false when there is none. */
  onMoveDownPastSection: () => boolean;
}): React.ReactElement {
  const { state, answerInFlight, onMoveUpFromButton, onMoveDownPastSection } = props;
  const view = sumUpButtonView({ state, answerInFlight });
  const summary = state?.summary ?? null;

  const press = () => {
    if (view.disabled || !state) return;
    state.startSumUp();
  };
  // Nothing below: consume Down so Steam's own guess cannot carry the ring into the dock.
  const downFromCard = () => onMoveDownPastSection() || true;
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
        {...(directionHandlers(() => sumUpButtonEl, onMoveUpFromButton, downFromButton) as Record<string, unknown>)}
      >
        {view.busy ? <ThinkingSpinnerIcon size={14} className="bonsai-thinking-spinner" /> : null}
        <span>{view.label}</span>
      </Focusable>
      {view.reason ? <div className="bonsai-sumup-reason">{view.reason}</div> : null}
      {summary && !view.busy ? (
        <Focusable
          className="bonsai-sumup-card"
          ref={(el: HTMLElement | null) => {
            summaryCardEl = el;
          }}
          aria-label="What the AI remembers"
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
