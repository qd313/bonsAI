/**
 * Title: The Show reasoning line, and the block it opens
 *
 * Purpose: On a turn where the model thought before it answered, a line sits between the question
 * and the answer reading *Show reasoning · 41 s*. A press opens the whole thinking as a quiet
 * block above the answer and the line reads *Hide reasoning · 41 s*; another press closes it. This
 * file draws both, and wires them into the controller's path down the turn.
 *
 * Used for: MainTabChatTranscript, on the live turn and on whichever older turn is open.
 *
 * Solves: keeping the line's own controller wiring in one place instead of twice in the
 * transcript, once for the live turn and once for an older one — they are the same row.
 *
 * Does not: decide whether a turn has any thinking to show, hold the open-or-closed state, or read
 * anything from the computer side. The transcript owns all three.
 *
 * How it works: `buildReasoningFold()` draws the line, and the block under it while it is open.
 *
 *     Hide reasoning · 18 s        Down: onto the block (closed: into the answer); Up: the question
 *     ┌ the open block ─────┐      a stop of its own: Down and Up read it a screen at a time, then
 *     │ 1. Analyze ...      │      leave it (Down: into the answer, Up: back on the line); B closes
 *     └─────────────────────┘      it from here too, the ring back on the line
 *     the answer                   Up from its first section: Steam's own move, onto the block
 *
 * The two hand the ring to each other through `reasoningFoldHandles()`, filled by their refs; the
 * scrolling and the landing placement are in reasoningBlockReading.ts. The plan 82 bug this answers:
 * the block used to be plain text, so one Down from the line jumped the whole block into the answer.
 *
 * Gotchas:
 *   - The line is drawn exactly like the Show details line below the answer, and shares its
 *     classes on purpose (D76 made that the shape a single reply-level control takes here). It is
 *     not the small-button component.
 *   - B is handled with `onCancelButton`, and attached only while the block is open. Measured on
 *     device 2026-08-28 (DrgGlossaryTermChip.tsx): `onButtonDown` does receive B, but returning
 *     true from it does NOT stop Steam also backing the ring out of the panel, while
 *     `onCancelButton` plus `preventDefault` genuinely consumes the press. The same measurement
 *     found that merely having the handler attached eats B even when it does nothing, which is why
 *     it is attached conditionally: with the block closed, B must still back out of the panel.
 *     The block exists only while open, so it always has one.
 *   - The move handlers go on each row's own `Focusable`, never on a child. A Decky button does
 *     not forward them (buildReplyActionsElement.tsx has the measurement), and `pressHandler`
 *     answers only Up and Down so an A press still reaches `onOKButton` rather than being eaten.
 */
import React from "react";
import { Focusable } from "@decky/ui";

import { reasoningFoldLabel, tidyReasoningText, type LiveStepLine } from "./reasoningDisplay";
import { registerReplyStop } from "./replyStopRegistry";
import { elementHasGamepadFocus } from "./uiDocument";
import {
  isDeckDirectionDownEvent,
  isDeckDirectionUpEvent,
  isDownDeckButtonEvent,
  isUpDeckButtonEvent,
} from "./focusNavigation";
import {
  enterReasoningBlock,
  placeReasoningBlockOnLanding,
  showLineInBand,
  stepReasoningBlock,
  type ReasoningNavHolder,
} from "./reasoningBlockReading";

/** The line's and the open block's elements and the block's Steam node, filled by their refs on mount. */
export type ReasoningFoldHandles = {
  line: { current: HTMLElement | null };
  block: { current: HTMLElement | null };
  blockNav: ReasoningNavHolder;
};

/** A fresh set per render, like every holder here: these are plain functions called during render. */
function reasoningFoldHandles(): ReasoningFoldHandles {
  return { line: { current: null }, block: { current: null }, blockNav: { current: null } };
}

export type BuildReasoningFoldRowArgs = {
  /** The turn this row belongs to: "live", or an older turn's own id. */
  turnId: string;
  /** Whether the block below is showing right now. */
  open: boolean;
  /** How long the model thought, in whole seconds; anything missing reads as one second. */
  seconds: number | null;
  /** Open or close the block. */
  onToggle: () => void;
  /** Up: to Retry, or to the question's own row when this turn offers no Retry. */
  onMoveUp: () => boolean;
  /** Down: into the answer (from the open block's end, when the block is open). */
  onMoveDown: () => boolean;
  /** Shared with the open block, so Down from the line lands on it. Without them Down goes to `onMoveDown`. */
  handles?: ReasoningFoldHandles;
};

/**
 * Feature: the Show reasoning line above an answer.
 * In: the turn, whether the block is open, the seconds, and where Up and Down should go.
 * Out: the line, as a real controller stop registered under the name "show-reasoning".
 *
 * What can go wrong: nothing here decides whether the line should exist. A caller that draws it on
 * a turn with no thinking gets a row that opens an empty block.
 */
export function buildReasoningFoldRow({
  turnId,
  open,
  seconds,
  onToggle,
  onMoveUp,
  onMoveDown,
  handles,
}: BuildReasoningFoldRowArgs): React.ReactElement {
  const label = reasoningFoldLabel(open, seconds);
  /*
   * A fresh holder each render, the way the reply row below the answer does it: this is a plain
   * function called during render, so there are no hooks to keep one in.
   */
  const rowEl: { current: HTMLElement | null } = handles?.line ?? { current: null };
  /* With the block open, Down reads it first (plan 82); the block's own Down goes on into the answer. */
  const moveDown = () =>
    (open && handles ? enterReasoningBlock(handles.block.current, handles.blockNav) : false) || onMoveDown();

  const pressHandler = (evt: unknown): boolean => {
    const isDown = isDeckDirectionDownEvent(evt);
    const isUp = isDeckDirectionUpEvent(evt);
    if (!isDown && !isUp) return false;
    const el = rowEl.current;
    /*
     * On the Deck this row can own the controller's highlight while the browser's own idea of the
     * focused element is somewhere else entirely, so the check has to read Steam's ring. Asking
     * the browser instead is what made three earlier hand-offs dead code (docs/testing.md,
     * MICRO-04).
     */
    if (el && !elementHasGamepadFocus(el)) return false;
    return isDown ? moveDown() : onMoveUp();
  };

  return (
    <Focusable
      key={`reasoning-fold-${turnId}`}
      className="bonsai-chat-details-divider bonsai-chat-reasoning-fold"
      ref={(el: HTMLElement | null) => {
        rowEl.current = el;
        registerReplyStop("show-reasoning", el);
      }}
      /*
       * Two sources, not three, for the same reason the Show details line gives: `onOKButton` is
       * the A press and `onClick` is a finger on the screen, while `onActivate` also fires for A
       * and would toggle the block twice on one press.
       */
      onOKButton={onToggle}
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label}
      {...({
        onMoveUp: () => onMoveUp(),
        onMoveDown: () => moveDown(),
        onButtonDown: pressHandler,
        ...(open
          ? {
              onCancelButton: (e: unknown) => {
                onToggle();
                (e as { preventDefault?: () => void })?.preventDefault?.();
              },
            }
          : {}),
      } as Record<string, unknown>)}
    >
      <span className="bonsai-chat-details-divider-rule" />
      <span className="bonsai-chat-details-divider-label">{label}</span>
      <span className="bonsai-chat-details-divider-rule" />
    </Focusable>
  );
}

export type ReasoningOpenBlockNav = {
  /** Shared with the line: the line is where Up and B hand the ring back to. */
  handles: ReasoningFoldHandles;
  /** Down once the block's end is on screen: into the answer, the line's own Down when closed. */
  onMoveDown: () => boolean;
  /** B: close the block (the ring is put back on the line first). */
  onToggle: () => void;
};

/**
 * Feature: the opened block of reasoning, a stop the D-pad reads a screen at a time.
 * In: the whole thinking the computer side kept, and how it joins the line and the answer.
 * Out: it, as written, above the answer.
 *
 * Line breaks are kept as the model wrote them and nothing inside is masked — the maintainer's
 * call: the closed line is the fence, not the words inside. Only the marks the model writes for
 * itself go: its "Thinking Process:" heading, stars and backticks (a quoted tag showed as
 * `<bonsai-status>` with its backticks in 3 of 6 Deck tries, plan70-THINKING-SPOILER-01-try2.json).
 *
 * The ring sits on the block while it is read (plan 82): the panel moves at most one screen a press
 * and the reasoning stays under the ring. It used to be plain text with the ring left on the line,
 * and the next Down went straight into the answer, 555 px in one press on the Deck. Left and Right
 * hold still, as on an answer section (Left otherwise left the panel for Steam's own rail). B closes
 * it from here as from the line. Without `nav` (a test drawing the block alone) nothing hands on.
 */
export function buildReasoningOpenBlock(
  turnId: string,
  text: string,
  nav?: ReasoningOpenBlockNav,
): React.ReactElement {
  const blockEl: { current: HTMLElement | null } = nav?.handles.block ?? { current: null };
  const line = () => nav?.handles.line.current ?? null;
  const moveDown = () => stepReasoningBlock(blockEl.current, "down") || (nav ? nav.onMoveDown() : false);
  const moveUp = () => stepReasoningBlock(blockEl.current, "up") || showLineInBand(line());
  return (
    <Focusable
      key={`reasoning-block-${turnId}`}
      className="bonsai-chat-reasoning-block"
      ref={(el: HTMLElement | null) => {
        blockEl.current = el;
      }}
      onFocus={() => {
        if (blockEl.current) placeReasoningBlockOnLanding(blockEl.current);
      }}
      {...({
        /*
         * Marks the block as a stop. Steam treats a Focusable as a container unless something does, and
         * skips a container with no stops inside; the block holds only text and has no A handler. On the
         * Deck (build efd4258b, plan82-P82-REASONING-BLOCK-PAGES.json) it was skipped both ways: Down from
         * the line went straight to the answer, Up from the answer straight to the line, 751 px in one
         * press. The chat row hit the same trap and has the same flag (ChatSlotRow.tsx).
         */
        focusable: true,
        navRef: nav?.handles.blockNav,
        onMoveDown: () => moveDown(),
        onMoveUp: () => moveUp(),
        onMoveLeft: () => true,
        onMoveRight: () => true,
        /* String-shaped presses only (tests, a desktop keyboard), so one press never fires both. */
        onButtonDown: (button: unknown) => {
          if (isDownDeckButtonEvent(button)) return moveDown();
          if (isUpDeckButtonEvent(button)) return moveUp();
          return false;
        },
        ...(nav
          ? {
              onCancelButton: (e: unknown) => {
                showLineInBand(line());
                nav.onToggle();
                (e as { preventDefault?: () => void })?.preventDefault?.();
              },
            }
          : {}),
      } as Record<string, unknown>)}
    >
      {tidyReasoningText(text)}
    </Focusable>
  );
}

export type BuildReasoningFoldArgs = BuildReasoningFoldRowArgs & {
  /** The whole thinking the computer side kept, drawn in the block while it is open. */
  text: string;
};

/**
 * Feature: the line and, while it is open, the block under it, as the transcript draws them.
 * In: the row's arguments plus the thinking. Out: one fragment, the line first.
 *
 * The line keeps its place as the fragment's first child whether the block is open or not, so
 * opening the block never remounts the element holding the ring.
 */
export function buildReasoningFold({ text, ...row }: BuildReasoningFoldArgs): React.ReactElement {
  const handles = row.handles ?? reasoningFoldHandles();
  return (
    <>
      {buildReasoningFoldRow({ ...row, handles })}
      {row.open
        ? buildReasoningOpenBlock(row.turnId, text, { handles, onMoveDown: row.onMoveDown, onToggle: row.onToggle })
        : null}
    </>
  );
}

/**
 * Feature: the live thinking block's lines, while the model works (the maintainer's option B,
 * 2026-09-27).
 * In: the step lines from useReasoningFoldState. Out: one line each, finished steps faded.
 *
 * The fade is set here rather than in the stylesheet so the block's rule in section-6.ts (size,
 * italics, six-line height, newest line at the bottom) stays exactly as it was.
 */
export function buildLiveReasoningSteps(lines: readonly LiveStepLine[]): React.ReactElement[] {
  return lines.map((line, i) => (
    <div
      key={`live-step-${i}`}
      className="bonsai-chat-reasoning-live-step"
      style={line.done ? { opacity: 0.55 } : undefined}
    >
      {line.text}
    </div>
  ));
}
