/**
 * Title: Turn header element builder
 * Purpose: Build the question bubble for a turn — its text, and the Retry icon in its corner.
 * Used for: MainTabChatTranscript history and live turn slot rendering.
 * Solves: Consistent header focus behavior and expand/collapse activation on Deck.
 * Does not: Render answer body — see buildAnswerBubbleElement. Does not decide what Retry re-asks
 *   — the caller supplies the handler.
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
};

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
  } = args;

  const headerClass = [
    "bonsai-chat-turn-row-header",
    variant === "live" ? "bonsai-chat-turn-row-header--live" : "bonsai-chat-turn-row-header--history",
    expanded ? "bonsai-chat-turn-row-header--expanded" : "bonsai-chat-turn-row-header--collapsed",
    isStreaming ? "bonsai-chat-turn-row-header--streaming" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
  const headerNavHandlers: Record<string, unknown> = {
    onMoveDown: () => focusAnswer(),
    onButtonDown: (button: unknown) => {
      if (isDownDeckButtonEvent(button)) return focusAnswer();
      if (onMoveUp && isUpDeckButtonEvent(button)) return onMoveUp();
      return false;
    },
  };
  /*
   * Only handed to the first archived header (MainTabChatTranscript.tsx) — every other header
   * gets none here and keeps Steam's own default Up, onto the sibling header above it.
   */
  if (onMoveUp) headerNavHandlers.onMoveUp = () => onMoveUp();

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
        ref={headerRef}
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
      ref={headerRef}
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
          bodyEl.current = el;
        }}
        onActivate={onActivate}
        onOKButton={onActivate}
        aria-expanded={expanded}
        data-bonsai-turn-id={turnId}
        {...({
          onMoveLeft: () => leftIntoRetry(),
          onButtonDown: (button: unknown) =>
            isDeckDirectionLeftEvent(button) ? leftIntoRetry() : false,
        } as Record<string, unknown>)}
      >
        {titleSpan}
      </Focusable>
    </Focusable>
  );
}
