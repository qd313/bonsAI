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
 *   What the AI remembers card        <- stop only when a summary exists; A does nothing. Down and Up
 *      | Down                   ^ Up      scroll its text first; at the text's end (Down) or top (Up)
 *   [ Rename ] [ Keep ]               <- they leave. Rename/Keep: only while the summary holds a title
 *      | Down                   ^ Up      offer (plan 79); A runs it; Left/Right swap (SessionTitleOffer.tsx)
 *   the turn rows, then the active row's chips (unchanged)
 *
 * The card has a fixed height that fits between the pane's top and the dock on both screens (its
 * rules in section-6.ts give the arithmetic), and its text scrolls inside it, with a "More below"
 * line while more is below. It is a stop so that text can be read: with the ring on it, Down and Up
 * move the text a step and the ring stays. Before plan 104 it had no height limit: on a long chat it
 * was 669 points in a 610-point band, its last lines behind the dock, and the next Down left it for
 * Rename (workshop:test-evidence/plan104-P104-M-SESSION-CARD.json). Down from the last thing here
 * does whatever `onMoveDownPastSection` says: the first turn row when there is one, else (plan 72)
 * the way out of the whole panel that the chip ladder's last Down uses; the caller decides when to
 * consume it.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Focusable } from "@decky/ui";

import { ThinkingSpinnerIcon } from "../../../shared/icons/icons";
import { elementHasGamepadFocus, uiGamepadFocusElement } from "../../../shared/dpad/uiDocument";
import {
  findScrollablePanel,
  panelScrollMax,
  revealBelowKeepingAsItSettles,
  revealOnceWhenMounted,
  scrollElementTopToPaneTop,
} from "../../../shared/dpad/chatPanelScroll";
import { isDownDeckButtonEvent, isUpDeckButtonEvent } from "../../../shared/dpad/focusNavigation";
import { focusRowElement } from "../../../shared/dpad/focusPerTurnRow";
import { getReplyStop } from "../../../shared/dpad/replyStopRegistry";
import {
  registerNavFocus,
  takeNavFocus,
  unregisterNavFocus,
  type NavRefHolder,
} from "../../../shared/dpad/navFocusRegistry";
import {
  summaryCardFooter,
  summaryCardLines,
  summaryCardMeta,
  sumUpButtonView,
  titleOfferQuestion,
  type ChatSumUpState,
} from "./chatSumUpModel";
import { focusTitleOffer, SessionTitleOffer } from "./SessionTitleOffer";
import { directionHandlers } from "./sumUpDirectionHandlers";

/*
 * At most one Session tab body is ever mounted (only the newest answer carries it), so one slot
 * each is enough — the same reasoning SessionContextStrip.tsx gives for its own row lookup, done
 * here with refs instead of a page search.
 */
let sumUpButtonEl: HTMLElement | null = null;
let summaryCardEl: HTMLElement | null = null;
let sumUpReasonEl: HTMLElement | null = null;

/** Bring `el`'s top back 8 points under the pane's top when it sits above it. Scrolls only. */
function topBackUnderPane(el: HTMLElement): void {
  const pane = findScrollablePanel(el);
  if (pane && el.getBoundingClientRect().top < pane.getBoundingClientRect().top) scrollElementTopToPaneTop(el, 8);
}

/** `pass` a frame from now and at 150, 300 and 900 ms: the settle schedule chatPanelScroll.ts's reveals use. */
function onSettle(pass: () => void): void {
  requestAnimationFrame(pass);
  [150, 300, 900].forEach((delayMs) => window.setTimeout(pass, delayMs));
}

/**
 * The Sum up button of the Session tab on screen: where Down from the tabs row lands, and Up from the
 * card or the first turn row. It shows whole once the ring is on it. Up from the card shown at the
 * pane's top left it 15.5 points above the pane on the Deck's own screen, and only Steam's glide
 * brought it back (P104-M11). Landed by the plugin's own hop, its top comes back at once. With the
 * panel's page out of the browser's focus the hop is declined and Steam's own move carries the ring
 * here, with no focus event to hear, so the same check runs on the settle schedule while the ring
 * sits on the button. Scrolls only.
 */
export function focusSumUpButton(): boolean {
  const button = sumUpButtonEl;
  if (!button) return false;
  const landed = focusRowElement(button);
  if (landed) topBackUnderPane(button);
  onSettle(() => {
    if (button.isConnected && elementHasGamepadFocus(button)) topBackUnderPane(button);
  });
  return landed;
}

/** The summary card, when one is showing. */
function focusSummaryCard(): boolean {
  return summaryCardEl ? focusRowElement(summaryCardEl) : false;
}

/** The lowest stop of this section: the title offer when it shows, else the card, else the button. */
export function focusLastSumUpStop(): boolean {
  return focusTitleOffer() || focusSummaryCard() || focusSumUpButton();
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
    /* Landed: judged by Steam's ring itself. TakeFocus can answer before it has moved anything
       (plan72-F7-SUMUP.json: the second build trusted that answer, stopped, and the ring stayed). */
    if (summaryCardEl && elementHasGamepadFocus(summaryCardEl)) {
      done = true;
      return;
    }
    /* The player moved the ring somewhere else during the wait: leave it there. */
    if (!elementHasGamepadFocus(sumUpButtonEl)) {
      done = true;
      return;
    }
    /* The card may not be on the page yet; a later try finds it. */
    if (!summaryCardEl?.isConnected) return;
    takeNavFocus("session-summary-card");
  };
  attempt();
  const frame = requestAnimationFrame(attempt);
  const timers = [150, 300, 600, 900, 1500].map((delayMs) => window.setTimeout(attempt, delayMs));
  return () => {
    done = true;
    cancelAnimationFrame(frame);
    timers.forEach((t) => window.clearTimeout(t));
  };
}

/** One Down or Up on the card moves its text this far: half of the 190 points it shows, so no line is skipped. */
const CARD_TEXT_STEP_PX = 96;

/** The sign under the card's text while more of it is below: the words the shared two-button box uses. */
const MORE_BELOW = "▾ More below (press Down)";

/** The card's text fits (no scrolling, no sign), or scrolls with more below, or scrolls and shows its end. */
type CardTextView = "fits" | "below" | "end";

/**
 * In: nothing; the card's text box hands itself over through `setBox` (its ref).
 * Out: the text's `view`, read off the box when it mounts, when the card takes the ring (`read`), after
 * every step, on every scroll (a finger on the touch screen scrolls it too) and whenever the text's size
 * changes (a new Text size); and `step`: 1 (Down) or
 * -1 (Up) moves the text one step and returns true, or moves nothing at the end it points to and returns
 * false, so the press goes on out of the card. Scrolls the text only; never moves the ring.
 */
function useCardText() {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [view, setView] = useState<CardTextView>("fits");
  const read = useCallback(() => {
    if (!box) return;
    const room = panelScrollMax(box);
    setView(room <= 1 ? "fits" : box.scrollTop < room - 1 ? "below" : "end");
  }, [box]);
  useLayoutEffect(() => {
    if (!box) return undefined;
    read();
    box.addEventListener("scroll", read);
    /*
     * A new Text size makes the text taller or shorter and fires no scroll, so the line read last went
     * stale (P104-M12). The box itself stays 190 tall once the text passes that, so its contents are
     * watched too: their size is what changes.
     */
    const watch = typeof ResizeObserver === "function" ? new ResizeObserver(() => read()) : null;
    for (const el of [box, ...Array.from(box.children)]) watch?.observe(el);
    return () => {
      box.removeEventListener("scroll", read);
      watch?.disconnect();
    };
  }, [box, read]);
  const step = (dir: 1 | -1): boolean => {
    if (!box) return false;
    const from = box.scrollTop;
    box.scrollTop = Math.max(0, Math.min(panelScrollMax(box), from + dir * CARD_TEXT_STEP_PX));
    read();
    return Math.abs(box.scrollTop - from) >= 1;
  };
  return { setBox, view, read, step };
}

/**
 * The card holding the ring shows whole. It always fits between the pane's top and the dock now, so a
 * top above the pane's (Up from Rename can leave it there: D0 read the old card 66 points above) is
 * brought back under it at once, and the reveal brings the bottom clear of the dock. Scrolls only.
 */
function showWholeCard(card: HTMLElement): void {
  topBackUnderPane(card);
  revealBelowKeepingAsItSettles(card, () => card);
}

/**
 * The line that opened the details panel this section sits in ("Show details", reading "Hide details"),
 * found as the panel's own reveal finds it (plan 104 F1, buildDetailsPanelElement.tsx): the one reply
 * stop of that name, still on the page, and before `el` (the panel is drawn under its line).
 */
function openerLine(el: HTMLElement): HTMLElement | null {
  const line = getReplyStop("show-details");
  if (!line?.isConnected) return null;
  return line.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING ? line : null;
}

/**
 * What a scroll on appearing must keep on screen: the ring's control when it reads as one in the chat
 * above the dock; otherwise (it reads as nothing, as the page, as the pane, or as the dock, which never
 * scrolls) the line that opened the panel, so B then A with the Session tab showing cannot carry
 * "Hide details" off the top (-22 and -39 against a pane top of 52, plan103-P103-DETAILS-STRIP-01.json
 * and -try2.json); the ring as read when no line is found. The ring comes first here, unlike the
 * panel's reveal: this scroll also runs while the ring is truly elsewhere (on Sum up when a summary
 * arrives, on the note under an answer), and holding back by the line there would scroll less than
 * that control needs, or let the note holding the ring leave the top.
 */
function keepOnScreen(el: HTMLElement): HTMLElement | null {
  const ring = uiGamepadFocusElement();
  const pane = findScrollablePanel(el);
  if (ring && pane && ring !== pane && pane.contains(ring) && !ring.closest(".bonsai-main-tab-dock")) return ring;
  return openerLine(el) ?? ring;
}

/** For a ref: bring `el` out from behind the dock once, keeping keepOnScreen's control on screen. */
function revealOnAppear(el: HTMLElement | null): void {
  if (el) revealOnceWhenMounted(el, () => keepOnScreen(el));
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
  const offerQuestion = summary && !view.busy ? titleOfferQuestion(summary) : null;
  const downFromCardOrToOffer = () => (offerQuestion ? focusTitleOffer() : false) || downFromCard();

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
  /* When the job ended, if it has not handed over yet: the job's end and its summary can reach
     this section in two separate updates (plan72-F7-SUMUP.json), so the hand-off waits for the
     card rather than deciding at the job's end. Kept for a few seconds only, so a summary that
     turns up later for another reason never pulls the ring. */
  const jobEndedAt = useRef<number | null>(null);
  useEffect(() => {
    if (wasBusy.current && !view.busy) jobEndedAt.current = Date.now();
    if (view.busy) jobEndedAt.current = null;
    wasBusy.current = view.busy;
    const endedAt = jobEndedAt.current;
    if (endedAt !== null && hasSummary && !view.busy && Date.now() - endedAt < 5000) {
      jobEndedAt.current = null;
      return handRingToNewCard();
    }
    return undefined;
  }, [view.busy, hasSummary]);
  const downFromButton = () => (summary ? focusSummaryCard() : false) || downFromCard();
  /* On the card, Down and Up read its text first, and leave it only from the text's end or top. */
  const cardText = useCardText();
  const downOnCard = () => cardText.step(1) || downFromCardOrToOffer();
  const upOnCard = () => cardText.step(-1) || focusSumUpButton();
  /*
   * A step scrolls in place and the ring stays, so one press must act once. The move handlers carry it
   * (Steam calls them); the onButtonDown twin hears only the string-shaped presses tests and desktop
   * keyboards deliver, never a GamepadEvent, so a press Steam also hands to onButtonDown cannot step
   * twice: the pairing the answer's own sections use (buildAnswerBubbleElement.tsx, focusNavigation.ts).
   */
  const cardMoves = {
    onMoveDown: downOnCard,
    onMoveUp: upOnCard,
    onButtonDown: (evt: unknown) => {
      if (summaryCardEl && !elementHasGamepadFocus(summaryCardEl)) return false;
      if (isDownDeckButtonEvent(evt)) return downOnCard();
      if (isUpDeckButtonEvent(evt)) return upOnCard();
      return false;
    },
  };

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
            revealOnAppear(el);
          }}
        >
          {view.reason}
        </div>
      ) : null}
      {summary && !view.busy ? (
        <Focusable
          className={`bonsai-sumup-card${offerQuestion ? " bonsai-sumup-card--offered" : ""}`}
          ref={(el: HTMLElement | null) => {
            summaryCardEl = el;
            /* Appears behind the dock otherwise, after Sum up or from the note (plan 72). */
            revealOnAppear(el);
          }}
          aria-label="What the AI remembers"
          {...({ navRef: cardNavRef } as Record<string, unknown>)}
          /*
           * Holding the ring, show whole above the dock. The reveal on mount was held back by the ring
           * above it, and Down from Sum up again put the ring on the card a third behind the question
           * box (plan 72, plan72-Z-FREEPLAY.json finding 2). Scrolls only.
           */
          onFocus={() => {
            cardText.read();
            if (summaryCardEl) showWholeCard(summaryCardEl);
          }}
          {...(cardMoves as Record<string, unknown>)}
        >
          <div className="bonsai-sumup-card-head">
            <span>What the AI remembers</span>
            <span>{summaryCardMeta(summary)}</span>
          </div>
          {/* A new summary is a new box, read from its top. */}
          <div className="bonsai-sumup-card-text" key={summary.written_at} ref={cardText.setBox}>
            <ul className="bonsai-sumup-card-lines">
              {summaryCardLines(summary.text).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <div className="bonsai-sumup-card-foot">
              {summaryCardFooter(summary, state?.questionsAfterSummary ?? 0)}
            </div>
          </div>
          {cardText.view === "fits" ? null : (
            <div className="bonsai-sumup-card-more">{cardText.view === "below" ? MORE_BELOW : null}</div>
          )}
        </Focusable>
      ) : null}
      {offerQuestion ? (
        <SessionTitleOffer
          question={offerQuestion}
          onRename={() => summary?.suggested_title && state?.renameToSuggestedTitle?.(summary.suggested_title)}
          onKeep={() => state?.keepTitle?.()}
          onMoveUpToCard={focusSummaryCard}
          onMoveDownPastOffer={downFromCard}
        />
      ) : null}
    </>
  );
}
