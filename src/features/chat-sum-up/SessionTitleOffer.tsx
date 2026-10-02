/**
 * Title: The summary card's offer of a fresher chat title
 *
 * Purpose: When the summary the AI wrote also suggested a better title for the chat, one quiet row
 * under the card's lines asks "Rename this chat to "..."?" with two choices, Rename and Keep
 * (plan 79, D122 item 6). Nothing pops up and nothing is renamed without a yes.
 *
 * Used for: SessionSumUpSection.tsx, directly under the summary card.
 *
 * Solves: A long chat is still called by its first question. The summary already reads the chat, so
 * it is the natural place to ask, and the offer stays on the card until it is answered.
 *
 * Does not: Rename anything or call the back end: `onRename` and `onKeep` do (useChatSlots.ts, through
 * the ordinary rename call). Does not decide whether an offer exists -- the caller only mounts this
 * when the summary holds a suggestion, and the back end never stores one for a title typed by hand.
 *
 * Focus graph (new controls, AGENTS.md "Adding a new control"; Steam calls the move handlers):
 *
 *   What the AI remembers card          <- Down from the card lands on Rename
 *      | Down            ^ Up
 *   [ Rename ]  --Right-->  [ Keep ]    <- Left from Rename and Right from Keep are claimed, so a
 *      | Down            | Down            press at the edge never hands the ring out of the plugin
 *   whatever follows the section (`onMoveDownPastSection`)
 *
 * Up from either button returns to the card. The card, the buttons and the Sum up button are
 * siblings in one container, so the hops between them are plain `focus()` calls (focusRowElement).
 */
import React from "react";
import { Focusable } from "@decky/ui";

import { uiScalePx } from "../../styles/sections/uiScalePx";
import { isDeckDirectionLeftEvent, isDeckDirectionRightEvent } from "../../utils/focusNavigation";
import { elementHasGamepadFocus } from "../../utils/uiDocument";
import { focusRowElement } from "../../utils/focusPerTurnRow";
import { revealBelowKeepingAsItSettles } from "../../utils/chatPanelScroll";
import { TITLE_OFFER_KEEP, TITLE_OFFER_YES } from "./chatSumUpModel";
import { directionHandlers } from "./sumUpDirectionHandlers";

let renameEl: HTMLElement | null = null;
let keepEl: HTMLElement | null = null;

/** The offer's first stop (Rename), when an offer is showing. */
export function focusTitleOffer(): boolean {
  return renameEl ? focusRowElement(renameEl) : false;
}

function focusKeep(): boolean {
  return keepEl ? focusRowElement(keepEl) : false;
}

/**
 * Every direction for one of the two buttons. Up and Down come from the shared handlers; Left and
 * Right are this row's. `onButtonDown` is one function for all four, because two spread objects
 * would each carry their own and the second would silently replace the first.
 */
function buttonHandlers(
  self: () => HTMLElement | null,
  moves: { up: () => boolean; down: () => boolean; left: () => boolean; right: () => boolean },
): Record<string, unknown> {
  const shared = directionHandlers(self, moves.up, moves.down);
  return {
    ...shared,
    onMoveLeft: () => moves.left(),
    onMoveRight: () => moves.right(),
    onButtonDown: (evt: unknown) => {
      const el = self();
      if (el && !elementHasGamepadFocus(el)) return false;
      if (isDeckDirectionLeftEvent(evt)) return moves.left();
      if (isDeckDirectionRightEvent(evt)) return moves.right();
      return (shared.onButtonDown as (e: unknown) => boolean)(evt);
    },
  };
}

/** The offer's look: the card's own blue edge continued around one more row, the choices as small outlined buttons. */
function titleOfferCss(): string {
  return `
    .bonsai-scope .bonsai-sumup-card.bonsai-sumup-card--offered {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom-color: transparent;
    }
    .bonsai-scope .bonsai-sumup-offer {
      box-sizing: border-box;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: ${uiScalePx(6)};
      padding: ${uiScalePx(6)} ${uiScalePx(10)} ${uiScalePx(8)};
      border: 1px solid rgba(125, 211, 252, 0.3);
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 0 0 8px 8px;
      background: rgba(14, 22, 32, 0.55);
      font-size: ${uiScalePx(11)};
      line-height: 1.4;
      color: #8fa8c4;
    }
    .bonsai-scope .bonsai-sumup-offer-question {
      flex: 1 1 100%;
    }
    .bonsai-scope .bonsai-sumup-offer-btn {
      flex: 1 1 0;
      box-sizing: border-box;
      text-align: center;
      padding: ${uiScalePx(5)} 0;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #8fa8c4;
      font-size: ${uiScalePx(11)};
      font-weight: 700;
      cursor: pointer;
      outline: none;
    }
    .bonsai-scope .bonsai-sumup-offer-btn.gpfocus,
    .bonsai-scope .bonsai-sumup-offer-btn:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.9) !important;
      outline-offset: 2px !important;
      color: #dce8f4;
    }
  `;
}

/**
 * In: the question line, what Rename and Keep do, and the two ways out of the row: Up back to the
 * card, Down past the section.
 * Out: the quiet row with its two buttons, A on either runs its choice.
 * Can go wrong: nothing here -- the choices are best-effort calls; the card reloads when they land.
 */
export function SessionTitleOffer(props: {
  question: string;
  onRename: () => void;
  onKeep: () => void;
  onMoveUpToCard: () => boolean;
  onMoveDownPastOffer: () => boolean;
}): React.ReactElement {
  const { question, onRename, onKeep, onMoveUpToCard, onMoveDownPastOffer } = props;
  const reveal = (el: () => HTMLElement | null) => () => {
    const target = el();
    if (target) revealBelowKeepingAsItSettles(target, el);
  };
  return (
    <div className="bonsai-sumup-offer">
      <style>{titleOfferCss()}</style>
      <div className="bonsai-sumup-offer-question">{question}</div>
      <Focusable
        className="bonsai-sumup-offer-btn"
        ref={(el: HTMLElement | null) => {
          renameEl = el;
        }}
        aria-label={`${TITLE_OFFER_YES}: ${question}`}
        onOKButton={onRename}
        onClick={onRename}
        onFocus={reveal(() => renameEl)}
        {...buttonHandlers(() => renameEl, { up: onMoveUpToCard, down: onMoveDownPastOffer, left: () => true, right: focusKeep })}
      >
        {TITLE_OFFER_YES}
      </Focusable>
      <Focusable
        className="bonsai-sumup-offer-btn"
        ref={(el: HTMLElement | null) => {
          keepEl = el;
        }}
        aria-label={`${TITLE_OFFER_KEEP}: leave the title as it is`}
        onOKButton={onKeep}
        onClick={onKeep}
        onFocus={reveal(() => keepEl)}
        {...buttonHandlers(() => keepEl, { up: onMoveUpToCard, down: onMoveDownPastOffer, left: focusTitleOffer, right: () => true })}
      >
        {TITLE_OFFER_KEEP}
      </Focusable>
    </div>
  );
}
