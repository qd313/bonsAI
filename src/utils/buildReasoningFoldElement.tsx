/**
 * Title: The Show reasoning line, and the block it opens
 *
 * Purpose: On a turn where the model thought before it answered, a line sits between the question
 * and the answer reading *Show reasoning · 41 s*. A press opens the whole thinking as a quiet
 * block above the answer and the line reads *Hide reasoning · 41 s*; another press closes it. This
 * file draws both, and wires the line into the controller's path down the turn.
 *
 * Used for: MainTabChatTranscript, on the live turn and on whichever older turn is open.
 *
 * Solves: keeping the line's own controller wiring in one place instead of twice in the
 * transcript, once for the live turn and once for an older one — they are the same row.
 *
 * Does not: decide whether a turn has any thinking to show, hold the open-or-closed state, or read
 * anything from the computer side. The transcript owns all three.
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
 *   - The move handlers go on this row's own `Focusable`, never on a child. A Decky button does
 *     not forward them (buildReplyActionsElement.tsx has the measurement), and `pressHandler`
 *     answers only Up and Down so an A press still reaches `onOKButton` rather than being eaten.
 */
import React from "react";
import { Focusable } from "@decky/ui";

import { reasoningFoldLabel } from "./reasoningDisplay";
import { registerReplyStop } from "./replyStopRegistry";
import { elementHasGamepadFocus } from "./uiDocument";
import { isDeckDirectionDownEvent, isDeckDirectionUpEvent } from "./focusNavigation";

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
  /** Down: into the answer. */
  onMoveDown: () => boolean;
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
}: BuildReasoningFoldRowArgs): React.ReactElement {
  const label = reasoningFoldLabel(open, seconds);
  /*
   * A fresh holder each render, the way the reply row below the answer does it: this is a plain
   * function called during render, so there are no hooks to keep one in.
   */
  const rowEl: { current: HTMLElement | null } = { current: null };

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
    return isDown ? onMoveDown() : onMoveUp();
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
        onMoveDown: () => onMoveDown(),
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

/**
 * Feature: the opened block of reasoning.
 * In: the whole thinking the computer side kept. Out: it, as written, above the answer.
 *
 * Line breaks are kept as the model wrote them and nothing inside is masked — the maintainer's
 * call: the closed line is the fence, not the words inside. Not a controller stop: the ring stays
 * on the line above, so a press of B closes the block from where you already are.
 */
export function buildReasoningOpenBlock(turnId: string, text: string): React.ReactElement {
  return (
    <div key={`reasoning-block-${turnId}`} className="bonsai-chat-reasoning-block">
      {text}
    </div>
  );
}
