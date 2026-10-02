/**
 * Title: Turn header element builder
 * Purpose: Build the question bubble for a turn — its text, and the Retry icon in its corner.
 * Used for: MainTabChatTranscript history and live turn slot rendering.
 * Solves: Consistent header focus behavior and expand/collapse activation on Deck.
 * Does not: Render answer body — see buildAnswerBubbleElement. Does not decide what Retry re-asks
 *   — the caller supplies the handler.
 * Retry is a Left-only stop (plan 79): Up and Down never land on it. Left from the question text is
 *   the one way onto it, and Right is the way back. Something above that wants to enter this row
 *   goes to the question text through `takeOpenQuestionText`, never by letting Steam pick the row's
 *   first control. Up from the text is claimed too (`onMoveUpOut`): left to Steam it picks Retry, the
 *   nearest stop in the row (plan79-P79-M8-EARLIER-RETRY-AFTER.json).
 */
import React from "react";
import { Focusable } from "@decky/ui";
import { BonsaiChatSecondaryButton } from "../components/BonsaiChatSecondaryButton";
import { RefreshArrowIcon } from "../components/icons";
import { focusFirstAnswerChunk } from "./answerBubbleNavigation";
import {
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDownDeckButtonEvent,
  isUpDeckButtonEvent,
} from "./focusNavigation";
import { focusRegisteredReplyStop } from "./replyStopRegistry";
import { focusReplyShowReasoning } from "./liveTurnFocusGraph";
import { fitOpenQuestionBubble } from "./questionBubbleFit";
import { elementHasFocus } from "./uiDocument";

export type BuildTurnHeaderElementArgs = {
  turnId: string;
  title: string;
  expanded: boolean;
  variant?: "history" | "live";
  isStreaming?: boolean;
  onActivate: () => void;
  /**
   * When set, the bubble gains a faded circular-arrow Retry icon on its left (D77).
   *
   * Only the newest turn supplies it — Retry re-asks the question, and an older turn's is not what
   * would be sent. A turn without it renders exactly as before: one Focusable, one stop.
   */
  onRetry?: () => void;
  /** Greys the Retry icon out and disconnects it while an answer is on its way. */
  retryDisabled?: boolean;
  /**
   * Attached to the question title span so the caller can measure whether the wrapped text
   * really overflows the five-line cap (roadmap: "A short question fades out at its right edge
   * as if there were more to read"). Only meaningful while `expanded` — the caller only passes
   * one while the turn is open, since the collapsed single-line ellipsis never fades.
   */
  titleRef?: (el: HTMLSpanElement | null) => void;
  /**
   * True once the caller has measured that the title's content is taller than the box it is
   * capped to. Adds the modifier class the stylesheet keys the bottom fade off of — without it
   * the fade drew on every open question, short ones included, because CSS alone cannot tell
   * whether text was cut.
   */
  titleOverflowing?: boolean;
  /**
   * Attached to the OUTER header element — the one that keeps the same key (`turn-header-
   * ${turnId}`) and stays mounted whether or not Retry is offered. Roadmap: "Pressing A on an
   * open question closes it and drops the highlight" — while expanded and Retry showing,
   * activation sits on the INNER `.bonsai-chat-turn-row-body` stop; collapsing removes Retry,
   * which changes the header from two child stops to one and unmounts whichever one held the
   * ring. The outer element never goes away, so the caller can refocus it once that happens.
   */
  headerRef?: (el: HTMLElement | null) => void;
  /**
   * Roadmap: "Up skips the answer sections and the chat slot row" — the archived-header half.
   * With the archive expanded, Up from the FIRST archived header ran all the way to the tab bar
   * and Decky's back button without the chat slot row ever taking the ring, though two Downs
   * reach it normally (measured 2026-09-04, 18 presses). Only the caller knows which header is
   * first, so this is opt-in: most headers get none and keep Steam's own default of moving to
   * the sibling above. When set, it is tried on a real Up move; a header lower in the list never
   * receives one, so it keeps landing on the header above it exactly as before.
   */
  onMoveUp?: () => boolean;
  /**
   * Steam's nav node for the OUTER header, and the question-text stop inside it. Only the finish
   * restore uses them (useLiveTurnHeaderRingRestore): when the live turn is archived, the ring that
   * sat on its Retry or text is handed to the same stop of the archived header, through this nav
   * node first, since the old header and everything in it are gone.
   */
  headerNavRef?: { current: unknown };
  bodyRef?: (el: HTMLElement | null) => void;
  /**
   * What Down does on a CLOSED question, before Steam's own move (plan 79). A closed question has no
   * answer under it, so Down used to be Steam's: it walked into the next turn's row and, when that
   * row carried Retry, stopped on Retry before the question. The caller hands this only for a turn
   * whose next turn may carry Retry; it returns whether the ring was placed (see
   * `takeOpenQuestionText`). Ignored on an open question, where Down goes into the answer.
   */
  onMoveDownPast?: () => boolean;
  /**
   * Where Up goes from the open question's text (plan 79): whatever is above the question's row --
   * the previous turn's header, the "N earlier" pill or the chat slot row -- never Retry. Left
   * unclaimed, Steam's own Up picks Retry, the nearest stop in the row (measured on the Deck,
   * plan79-P79-M8-EARLIER-RETRY-AFTER.json, twice). The caller owns the target, since it is a
   * different container and only the transcript knows what sits above; it returns whether the ring
   * was placed. Only used on a question with Retry.
   */
  onMoveUpOut?: () => boolean;
};

/**
 * The open question's own text stop, by turn, for the Show reasoning line's Up (plan 72 A-4).
 *
 * Only a question with Retry has a separate text stop, and only the newest open turn has Retry, so
 * at most one entry is ever live. Removal checks identity, the same rule navFocusRegistry keeps, so
 * an old header's late unmount cannot wipe the new one's entry.
 */
const questionTextByTurn = new Map<string, HTMLElement>();
type SteamNavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null | undefined };
/** The question text's own Steam nav node, by turn: the target of a transfer from outside the row. */
const questionTextNavByTurn = new Map<string, SteamNavHolder>();

function questionTextNav(turnId: string): SteamNavHolder {
  let holder = questionTextNavByTurn.get(turnId);
  if (!holder) {
    holder = { current: null };
    questionTextNavByTurn.set(turnId, holder);
  }
  return holder;
}

/**
 * Put the ring on this turn's question text. Plain `focus()`: the Show reasoning line and the
 * question are both in the turn's own column, the same hop the line already makes onto Retry,
 * which the Deck measured landing (docs/test-evidence/plan72-A4-UP-FAMILY-a.json).
 */
export function focusOpenQuestionText(turnId: string): boolean {
  const el = questionTextByTurn.get(turnId);
  if (!el?.isConnected) return false;
  try {
    el.focus({ preventScroll: true });
  } catch {
    return false;
  }
  return elementHasFocus(el);
}

/**
 * Hand the ring to this open question's text from outside its row (plan 79).
 *
 * Steam enters a row on its first control, and in a question with Retry that is Retry: Down from the
 * "N earlier" pill, or from the closed question above, landed on Retry before the question itself
 * (docs/test-evidence/plan79-P79-M8-EARLIER-RETRY.json). So whoever sits above takes Steam's own
 * transfer onto the text's nav node instead, the one move that carries the ring across containers
 * (AGENTS.md, "The Steam Deck focus graph"). A turn without Retry registers no text stop, so this
 * reports false there and the caller's press stays Steam's.
 */
export function takeOpenQuestionText(turnId: string): boolean {
  const el = questionTextByTurn.get(turnId);
  if (!el?.isConnected) return false;
  try {
    questionTextNavByTurn.get(turnId)?.current?.TakeFocus?.(true);
  } catch {
    /* the focus and the check below decide */
  }
  return focusOpenQuestionText(turnId);
}

/** Plain function — header Focusable is a child of the turn-slot Focusable group. */
export function buildTurnHeaderElement(args: BuildTurnHeaderElementArgs): React.ReactElement {
  const {
    turnId,
    title,
    expanded,
    variant = "history",
    isStreaming = false,
    onActivate,
    onRetry,
    retryDisabled = false,
    titleRef,
    titleOverflowing = false,
    headerRef,
    onMoveUp,
    headerNavRef,
    bodyRef,
    onMoveDownPast,
    onMoveUpOut,
  } = args;

  const headerClass = [
    "bonsai-chat-turn-row-header",
    variant === "live" ? "bonsai-chat-turn-row-header--live" : "bonsai-chat-turn-row-header--history",
    expanded ? "bonsai-chat-turn-row-header--expanded" : "bonsai-chat-turn-row-header--collapsed",
    isStreaming ? "bonsai-chat-turn-row-header--streaming" : "",
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * Option D (plan 72): the open bubble shrinks to its longest line. Measured again only when the
   * text, Retry or the open state changes (the key), or the column's width does.
   */
  const fitKey = `${onRetry ? "retry" : "plain"}|${title}`;
  const outerRef = (el: HTMLElement | null) => {
    headerRef?.(el);
    fitOpenQuestionBubble(el, expanded, fitKey);
  };

  /* Same per-render holder pattern the reply row uses — this is a plain function, no hooks. */
  const bodyEl: { current: HTMLElement | null } = { current: null };

  /*
   * Down goes to the Show reasoning line first, and into the answer only when there is no line.
   *
   * On a turn where the model thought before it answered, that line sits between this question and
   * its answer, so it is the next thing down the screen. `focusRegisteredReplyStop` reports false
   * when no such line is mounted, which is every ordinary turn — so Down there is exactly what it
   * always was. The line's own Down then makes this same call into the answer. Written as a graph
   * in the transcript's own header (AGENTS.md, "The Steam Deck focus graph").
   */
  const focusAnswer = () => {
    if (!expanded) return false;
    if (focusReplyShowReasoning(null)) return true;
    return focusFirstAnswerChunk(turnId);
  };

  /*
   * `onMoveDown` is the handler Steam actually invokes for a D-pad press on device. Measured
   * 2026-08-27: with the ring on this header, a real DOWN press dispatched no DOM keyboard event
   * and never entered the bubble through the previous `onButtonDown`-only wiring — the ring
   * skipped straight past the answer to the utility row. `onMoveDown`'s return value is honored
   * (true suppresses Steam's own move; ContextChipLadder's on-device runs prove both halves).
   * The `onButtonDown` twin stays for the string-shaped presses tests and desktop keyboards
   * deliver, with the string-only predicate so one press can never fire both — the pairing rule
   * documented in focusNavigation.ts.
   */
  /* A closed question has no answer to enter: it may hand the ring past itself instead (plan 79). */
  const moveDown = () => focusAnswer() || (!expanded && onMoveDownPast ? onMoveDownPast() : false);
  const headerNavHandlers: Record<string, unknown> = {
    onMoveDown: () => moveDown(),
    onButtonDown: (button: unknown) => {
      if (isDownDeckButtonEvent(button)) return moveDown();
      if (onMoveUp && isUpDeckButtonEvent(button)) return onMoveUp();
      return false;
    },
  };
  /*
   * Only handed to the first archived header (MainTabChatTranscript.tsx) — every other header
   * gets none here and keeps Steam's own default Up, onto the sibling header above it.
   */
  if (onMoveUp) headerNavHandlers.onMoveUp = () => onMoveUp();
  /* `navRef` is a real Steam Focusable prop that Decky's types omit, so it rides the same cast. */
  if (headerNavRef) headerNavHandlers.navRef = headerNavRef;

  const titleClassName = [
    "bonsai-chat-turn-row-title",
    titleOverflowing ? "bonsai-chat-turn-row-title--overflowing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const titleSpan = (
    <span className={titleClassName} data-bonsai-turn-id={turnId} ref={titleRef}>
      {title || "…"}
    </span>
  );

  /*
   * No Retry to offer — every turn but the newest. Unchanged from before the icon existed: one
   * Focusable, one D-pad stop, activation on the bubble itself.
   */
  if (!onRetry) {
    return (
      <Focusable
        key={`turn-header-${turnId}`}
        className={headerClass}
        ref={outerRef}
        onActivate={onActivate}
        aria-expanded={expanded}
        data-bonsai-turn-id={turnId}
        {...headerNavHandlers}
      >
        {titleSpan}
      </Focusable>
    );
  }

  /*
   * With Retry, the bubble becomes a row of two stops: the icon, then the question text.
   *
   * The icon is positioned against the bubble's bottom-left corner rather than taking a column of
   * its own. As a flex child it reserved 26px down the whole height of the bubble, which on a
   * four-line question is a tall empty strip — reported from a screenshot 2026-09-06. Positioning
   * is against the bubble, not the column, so no measurement is involved.
   *
   * Activation moves onto the text child so a press on the icon cannot also open or close the
   * question. Down into the answer stays on the outer row: a Decky Button does not forward
   * onMove*, the measured reason recorded in buildReplyActionsElement.tsx.
   */
  const rightIntoQuestion = () => {
    const body = bodyEl.current;
    if (!body) return false;
    try {
      (body as HTMLElement).focus({ preventScroll: true });
    } catch {
      return false;
    }
    return true;
  };
  const leftIntoRetry = () => (retryDisabled ? false : focusRegisteredReplyStop("retry"));

  return (
    <Focusable
      key={`turn-header-${turnId}`}
      className={`${headerClass} bonsai-chat-turn-row-header--with-retry`}
      flow-children="horizontal"
      ref={outerRef}
      data-bonsai-turn-id={turnId}
      {...headerNavHandlers}
    >
      <Focusable
        className="bonsai-turn-retry-corner-slot"
        {...({
          onMoveRight: () => rightIntoQuestion(),
          onButtonDown: (button: unknown) =>
            isDeckDirectionRightEvent(button) ? rightIntoQuestion() : false,
        } as Record<string, unknown>)}
      >
        <BonsaiChatSecondaryButton
          className="bonsai-turn-retry-corner"
          disabled={retryDisabled}
          onClick={onRetry}
          aria-label="Retry same prompt"
          replyStop="retry"
        >
          <RefreshArrowIcon size={14} />
        </BonsaiChatSecondaryButton>
      </Focusable>
      <Focusable
        className="bonsai-chat-turn-row-body"
        ref={(el: HTMLElement | null) => {
          const prev = bodyEl.current;
          bodyEl.current = el;
          if (el) questionTextByTurn.set(turnId, el);
          else if (prev && questionTextByTurn.get(turnId) === prev) questionTextByTurn.delete(turnId);
          bodyRef?.(el);
        }}
        onActivate={onActivate}
        onOKButton={onActivate}
        aria-expanded={expanded}
        data-bonsai-turn-id={turnId}
        {...({
          navRef: questionTextNav(turnId),
          /*
           * Left is the one way onto Retry (plan 79). The text used to send Up there too (plan 72
           * A-4); the maintainer's rule is that Up and Down never land on it. Dropping that handler
           * was not enough: an unclaimed Up is Steam's, and Steam picked Retry, the nearest stop in
           * this row, both times it was tried. So the text claims Up and hands it to whatever sits
           * above the row. Retry and the text are siblings in this row, so Left's plain focus is
           * the right move; a greyed Retry declines.
           */
          onMoveUp: () => onMoveUpOut?.() ?? false,
          onMoveLeft: () => leftIntoRetry(),
          onButtonDown: (button: unknown) => {
            if (isDeckDirectionLeftEvent(button)) return leftIntoRetry();
            if (isUpDeckButtonEvent(button)) return onMoveUpOut?.() ?? false;
            return false;
          },
        } as Record<string, unknown>)}
      >
        {titleSpan}
      </Focusable>
    </Focusable>
  );
}
