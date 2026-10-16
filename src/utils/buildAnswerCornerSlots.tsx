/**
 * Title: The answer bubble's Copy corner icon
 *
 * Purpose: Builds the small Copy icon drawn into the bottom-right corner of a finished answer's
 * bubble. It is its own stop for the D-pad, and this file decides where Left, Up and Down go from it,
 * and where Right goes from the answer's last section.
 *
 *     ┌─ the bubble ─────────────────────────────────┐
 *     │  ...the answer...                            │
 *     │                                    [ copy ]  │
 *     └──────────────────────────────────────────────┘
 *       last section ─ Right ─▶ Copy
 *                    ◀─ Left ── Copy
 *       Down from Copy: the note, Helpful, the first choice, Show details
 *       Up from Copy: the answer's last section
 *
 * Used for: buildAnswerBubbleElement.tsx, once per finished answer.
 *
 * Solves: The corner logic is the size of a file of its own, and the bubble builder is about how an
 * answer is cut into stops, not about what sits under its corner.
 *
 * Does not: Draw the corner (the stylesheet pulls the slot up into the bubble, answerBubble.ts),
 * decide what pressing Copy does (ReplyCopyButton), or walk the answer's own sections.
 *
 * How it works:
 * 1. The icon sits in its own Focusable slot, a SIBLING of the bubble in the tree.
 * 2. The slot is a separate navigation container, so the move into it from the last section asks
 *    Steam's own transfer first (`TakeFocus`), then the registry focus reports whether the ring
 *    landed. A bare `focus()` across containers moves `activeElement` while Steam's ring stays
 *    behind.
 * 3. The icon is not drawn while the answer is still arriving: there is no settled bottom to pin it
 *    to, and the text to copy changes under the press.
 *
 * Gotchas:
 * - Down from the corner is named, not left to Steam's geometry: the icon draws inside the bubble
 *   (still a sibling in the DOM), overlapping the last section's box by a few pixels, and an overlap
 *   is what made Steam treat two boxes as each below the other in runs/reply-block-copy-trap.json.
 */
import React from "react";
import { Focusable } from "@decky/ui";
import { ReplyCopyButton } from "../components/ReplyCopyButton";
import { focusLastAnswerChunk } from "./answerBubbleNavigation";
import { focusRegisteredReplyStop } from "./replyStopRegistry";
import {
  isDeckDirectionLeftEvent,
  isDownDeckButtonEvent,
} from "./focusNavigation";

type NavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null };

export type AnswerCornerArgs = {
  answerKey: string;
  /** True while the answer is still arriving: the icon is not drawn. */
  streaming: boolean;
  /** When set, Copy shows (finished answers only). */
  getAnswerCopyText?: () => string;
};

export type AnswerCorners = {
  showCornerCopy: boolean;
  /** Right from the answer's last section: Copy when it shows. */
  rightIntoCorner: () => boolean;
  /** The slot elements, in tree order, to sit right after the bubble. */
  slots: React.ReactNode;
};

/** Steam's transfer into a slot first, then the registry focus, which reports whether it landed. */
function takeThenFocus(nav: NavHolder, stop: "copy"): boolean {
  try {
    nav.current?.TakeFocus?.(true);
  } catch {
    /* fall through -- the registry focus below reports whether it landed */
  }
  return focusRegisteredReplyStop(stop);
}

/**
 * Down out of the corner: the summed-up note when this answer has one (plan 68), then the thumbs
 * when they render, else the first "What went wrong?" choice when the reply has been rated down (the
 * thumbs are greyed then, and the choices sit right under them), else Show details.
 */
function downOutOfCorner(): boolean {
  return (
    focusRegisteredReplyStop("summary-note") ||
    focusRegisteredReplyStop("helpful") ||
    focusRegisteredReplyStop("reason-chips") ||
    focusRegisteredReplyStop("note-keep") ||
    focusRegisteredReplyStop("show-details")
  );
}

/*
 * In: the answer's key, whether it is still arriving, and the optional handler that switches the
 * icon on (`getAnswerCopyText` for Copy).
 * Out: whether Copy shows, the function for Right from the answer's last section, and the slot
 * element to put right after the bubble.
 * What can go wrong: a slot that is not mounted (the answer is still arriving, or the caller gave no
 * handler) is simply skipped, so a route into it answers false and the caller falls back.
 */
export function buildAnswerCorners(args: AnswerCornerArgs): AnswerCorners {
  const { answerKey, streaming, getAnswerCopyText } = args;
  const copyNavRef: NavHolder = { current: null };
  const showCornerCopy = Boolean(getAnswerCopyText) && !streaming;

  const rightIntoCorner = () => (showCornerCopy ? takeThenFocus(copyNavRef, "copy") : false);
  const upOutOfCorner = () => focusLastAnswerChunk(answerKey);

  const slots = (
    <>
      {showCornerCopy ? (
        <Focusable
          key={`answer-copy-${answerKey}`}
          className="bonsai-reply-copy-corner-slot"
          {...({
            navRef: copyNavRef,
            onMoveLeft: () => upOutOfCorner(),
            onMoveUp: () => upOutOfCorner(),
            onMoveDown: () => downOutOfCorner(),
            onButtonDown: (button: unknown) => {
              if (isDeckDirectionLeftEvent(button)) return upOutOfCorner();
              if (isDownDeckButtonEvent(button)) return downOutOfCorner();
              return false;
            },
          } as Record<string, unknown>)}
        >
          <ReplyCopyButton corner getCopyText={getAnswerCopyText!} />
        </Focusable>
      ) : null}
    </>
  );

  return { showCornerCopy, rightIntoCorner, slots };
}
