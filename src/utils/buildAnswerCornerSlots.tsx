/**
 * Title: The answer bubble's two corner icons
 *
 * Purpose: Builds the two small icons drawn into the bottom corners of a finished answer's bubble:
 * Read aloud in the lower-left, Copy in the lower-right. Each is its own stop for the D-pad, and this
 * file decides where Left, Right, Up and Down go from each, and where Right goes from the answer's
 * last section.
 *
 *     ┌─ the bubble ─────────────────────────────────┐
 *     │  ...the answer...                            │
 *     │  [ read aloud ]                    [ copy ]  │
 *     └──────────────────────────────────────────────┘
 *       last section ─ Right ─▶ Read aloud ─ Right ─▶ Copy
 *                              ◀─ Left ─────────────── Copy
 *       Down from either: the note, Helpful, the first choice, Show details
 *       Up from either: the answer's last section
 *
 * Used for: buildAnswerBubbleElement.tsx, once per finished answer.
 *
 * Solves: The corner logic had grown to the size of a file of its own (plan 84 step 3 added Read
 * aloud beside Copy), and the bubble builder is about how an answer is cut into stops, not about
 * what sits under its corners. One place for both icons also keeps their routes from drifting
 * apart: Read aloud is Copy mirrored, and each route is the other's reverse.
 *
 * Does not: Draw the corners (the stylesheet pulls both slots up into the bubble, answerBubble.ts),
 * decide what pressing either does (the caller's `onReadAloudToggle`, ReplyCopyButton), or walk the
 * answer's own sections.
 *
 * How it works:
 * 1. Each icon sits in its own Focusable slot, a SIBLING of the bubble in the tree, in the order
 *    Read aloud then Copy, so the tree order is the left-to-right order of the stops.
 * 2. Both slots are separate navigation containers, so every move between them (and from the last
 *    section into the first of them) asks Steam's own transfer first (`TakeFocus`), then the
 *    registry focus reports whether the ring landed. A bare `focus()` across containers moves
 *    `activeElement` while Steam's ring stays behind.
 * 3. Neither icon is drawn while the answer is still arriving: there is no settled bottom to pin
 *    them to, and the text to copy changes under the press.
 *
 * Gotchas:
 * - Read aloud's registry name is `read-aloud-corner`. The old `read-aloud` meant the speaker in the
 *   row under the answer and is no longer registered by anything.
 * - Down from the corners is named, not left to Steam's geometry: the icons draw inside the bubble
 *   (still siblings in the DOM), overlapping the last section's box by a few pixels, and an overlap
 *   is what made Steam treat two boxes as each below the other in runs/reply-block-copy-trap.json.
 */
import React from "react";
import { Focusable } from "@decky/ui";
import { BonsaiChatSecondaryButton } from "../components/BonsaiChatSecondaryButton";
import { ReplyCopyButton } from "../components/ReplyCopyButton";
import { AskStopIcon, ReadAloudSpeakerIcon } from "../components/icons";
import { focusLastAnswerChunk } from "./answerBubbleNavigation";
import { focusRegisteredReplyStop } from "./replyStopRegistry";
import {
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDownDeckButtonEvent,
} from "./focusNavigation";

type NavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null };

export type AnswerCornerArgs = {
  answerKey: string;
  /** True while the answer is still arriving: neither icon is drawn. */
  streaming: boolean;
  /** When set, Copy shows (finished answers only). */
  getAnswerCopyText?: () => string;
  /** When set, Read aloud shows (finished answers only). */
  onReadAloudToggle?: () => void;
  /** "Read aloud" or "Stop": the aria-label, and which glyph is drawn. */
  readAloudLabel?: string;
};

export type AnswerCorners = {
  showCornerCopy: boolean;
  showCornerReadAloud: boolean;
  /** Right from the answer's last section: Read aloud when it shows, else Copy. */
  rightIntoCorner: () => boolean;
  /** The slot elements, in tree order, to sit right after the bubble. */
  slots: React.ReactNode;
};

/** Steam's transfer into a slot first, then the registry focus, which reports whether it landed. */
function takeThenFocus(nav: NavHolder, stop: "copy" | "read-aloud-corner"): boolean {
  try {
    nav.current?.TakeFocus?.(true);
  } catch {
    /* fall through -- the registry focus below reports whether it landed */
  }
  return focusRegisteredReplyStop(stop);
}

/**
 * Down out of either corner: the summed-up note when this answer has one (plan 68), then the thumbs
 * when they render, else the first "What went wrong?" choice when the reply has been rated down (the
 * thumbs are greyed then, and the choices sit right under them), else Show details. A Read aloud line
 * used to be tried between the thumbs and Show details; since plan 84 step 3 the speaker is up here
 * in the corner, so it is not a stop on the way down any more.
 */
function downOutOfCorner(): boolean {
  return (
    focusRegisteredReplyStop("summary-note") ||
    focusRegisteredReplyStop("helpful") ||
    focusRegisteredReplyStop("reason-chips") ||
    focusRegisteredReplyStop("show-details")
  );
}

/*
 * In: the answer's key, whether it is still arriving, and the two optional handlers that switch the
 * icons on (`getAnswerCopyText` for Copy, `onReadAloudToggle` for Read aloud).
 * Out: which icons show, the function for Right from the answer's last section, and the slot
 * elements to put right after the bubble.
 * What can go wrong: a slot that is not mounted (the answer is still arriving, or the caller gave no
 * handler) is simply skipped, so a route into it answers false and the caller falls back; the one
 * route that never gives up is Left from Read aloud, which holds still rather than let Steam's Left
 * find the Quick Access rail.
 */
export function buildAnswerCorners(args: AnswerCornerArgs): AnswerCorners {
  const { answerKey, streaming, getAnswerCopyText, onReadAloudToggle, readAloudLabel = "Read aloud" } = args;
  const copyNavRef: NavHolder = { current: null };
  const readNavRef: NavHolder = { current: null };
  const showCornerCopy = Boolean(getAnswerCopyText) && !streaming;
  const showCornerReadAloud = Boolean(onReadAloudToggle) && !streaming;
  const isReadAloudSpeaking = readAloudLabel === "Stop";

  const rightIntoCopy = () => (showCornerCopy ? takeThenFocus(copyNavRef, "copy") : false);
  const rightIntoCorner = () =>
    showCornerReadAloud ? takeThenFocus(readNavRef, "read-aloud-corner") : rightIntoCopy();
  const upOutOfCorner = () => focusLastAnswerChunk(answerKey);
  /* Left from Copy is the speaker beside it; with no speaker, back to the answer as it always was. */
  const leftOutOfCopy = () =>
    (showCornerReadAloud && takeThenFocus(readNavRef, "read-aloud-corner")) || upOutOfCorner();
  /* Left from the speaker has nothing to its left but the answer; hold still if even that is gone
     rather than let Steam's Left find the Quick Access rail. */
  const leftOutOfReadAloud = () => upOutOfCorner() || true;
  /* Right from the speaker is Copy; with no Copy, hold still for the same reason. */
  const rightOutOfReadAloud = () => rightIntoCopy() || true;

  const slots = (
    <>
      {showCornerReadAloud ? (
        <Focusable
          key={`answer-read-aloud-${answerKey}`}
          className={`bonsai-reply-read-aloud-corner-slot${
            showCornerCopy ? " bonsai-reply-read-aloud-corner-slot--before-copy" : ""
          }`}
          {...({
            navRef: readNavRef,
            onMoveLeft: () => leftOutOfReadAloud(),
            onMoveRight: () => rightOutOfReadAloud(),
            onMoveUp: () => upOutOfCorner(),
            onMoveDown: () => downOutOfCorner(),
            onButtonDown: (button: unknown) => {
              if (isDeckDirectionLeftEvent(button)) return leftOutOfReadAloud();
              if (isDeckDirectionRightEvent(button)) return rightOutOfReadAloud();
              if (isDownDeckButtonEvent(button)) return downOutOfCorner();
              return false;
            },
          } as Record<string, unknown>)}
        >
          {/*
            * Never disabled, so it stays a real D-pad stop on a reply stopped part-way through. Icon
            * only, the glyph 14 like Copy's; its words live in the spoken label, which flips between
            * Read aloud and Stop. `bonsai-chat-read-aloud-btn` is the name the speaker has always
            * carried, kept so its speaking colour and the older tests keep finding it.
            */}
          <BonsaiChatSecondaryButton
            onClick={onReadAloudToggle ?? (() => undefined)}
            aria-label={readAloudLabel}
            replyStop="read-aloud-corner"
            className={`bonsai-reply-read-aloud-corner bonsai-chat-read-aloud-btn${
              isReadAloudSpeaking ? " bonsai-chat-read-aloud-btn--speaking" : ""
            }`}
          >
            {isReadAloudSpeaking ? <AskStopIcon size={14} /> : <ReadAloudSpeakerIcon size={14} />}
          </BonsaiChatSecondaryButton>
        </Focusable>
      ) : null}
      {showCornerCopy ? (
        <Focusable
          key={`answer-copy-${answerKey}`}
          className={`bonsai-reply-copy-corner-slot${
            showCornerReadAloud ? " bonsai-reply-copy-corner-slot--after-read-aloud" : ""
          }`}
          {...({
            navRef: copyNavRef,
            onMoveLeft: () => leftOutOfCopy(),
            onMoveUp: () => upOutOfCorner(),
            onMoveDown: () => downOutOfCorner(),
            onButtonDown: (button: unknown) => {
              if (isDeckDirectionLeftEvent(button)) return leftOutOfCopy();
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

  return { showCornerCopy, showCornerReadAloud, rightIntoCorner, slots };
}
