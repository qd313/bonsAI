/**
 * Title: The "Suggest as a tip" button and its line under a finished answer
 *
 * Purpose: Draws the one button that turns a good answer into a proposed library note (plan 100, lane J) and the
 * one line under it: "Saved <file>. To send it in: <link>" once the file is written, or the words of a refusal
 * (with the Desktop permission off they name the Permissions tab). The Deck has no browser in the panel, so
 * the link is plain text to copy or type. The button stays after the answer is rated.
 *
 * Used for: buildReplyActionsElement.tsx, which draws this between the note card and the Show details line and
 * wires its Up and Down; useReplySuggestTip.ts holds the state this draws.
 *
 * Solves: A good answer had nowhere to go but the clipboard. The file lands in the person's Desktop notes folder
 * and the link opens a GitHub issue with the title filled in.
 *
 * Does not: Call the plugin (useReplySuggestTip.ts does), check the permission (the back end does), or hold the
 * ring between the answer and the button (the reply row's chains do, through the `suggest-tip` stop).
 *
 * Focus graph (AGENTS.md, "Adding a new control"). One stop, its own Steam Focusable with its own nav node
 * (`replyStopNavRef("suggest-tip")`), the move handlers on that Focusable and not on the button (a Decky button does
 * not forward them), A as the button's own press (a tap is the same click), B left to Steam. It sits inside the
 * plugin's reply row, so A and B reach it:
 *
 *   the rating row, its choices, or the note card's "For" line       Down from any of them lands here
 *      | Down                         ^ Up (the note card's "For" line when a card is on offer, else the choices,
 *   [ Suggest as a tip ]                 Helpful, the branch picker, the summed-up note, the answer's last section)
 *      | Down                         ^ Up                     Left and Right hold still
 *   the Show details line
 *
 * The ring stays on the button after A: the line is drawn under it and nothing the ring stands on goes away.
 * While a new question is asked the button is greyed and the stop is skipped, as the thumbs are.
 */
import React from "react";
import { Focusable } from "@decky/ui";

import { BonsaiChatSecondaryButton } from "./BonsaiChatSecondaryButton";
import { replyStopNavRef } from "../../../shared/dpad/replyStopRegistry";
import { textPx } from "../../../styles/textPx";
import { suggestTipLine, type ReplySuggestTipView } from "./useReplySuggestTip";

export type SuggestTipRowArgs = {
  view: ReplySuggestTipView;
  /** A new question is being asked: the button is greyed and A does nothing. */
  disabled: boolean;
  /** The reply row's chains: what is above this button, and what is below it. */
  up: () => boolean;
  down: () => boolean;
};

/**
 * In: the state and press from the hook, whether to grey the button, and the two moves out of it.
 * Out: the button's row and, once there is something to say, the line under it.
 * Can go wrong: nothing; a press while saving is ignored by the hook, and the button is greyed while saving.
 */
export function renderSuggestTipRow(a: SuggestTipRowArgs): React.ReactElement {
  const { view, disabled, up, down } = a;
  const line = suggestTipLine(view.state);
  return (
    <React.Fragment key="suggest-tip">
      <Focusable
        className="bonsai-chat-reply-actions-row bonsai-chat-reply-actions-row--suggest"
        flow-children="horizontal"
        {...({
          navRef: replyStopNavRef("suggest-tip"),
          onMoveUp: up,
          onMoveDown: down,
          /* One button: a sideways press holds, so the ring never wanders off the row to a neighbour. */
          onMoveLeft: () => true,
          onMoveRight: () => true,
        } as Record<string, unknown>)}
      >
        <BonsaiChatSecondaryButton
          disabled={disabled || view.state.phase === "saving"}
          onClick={view.onSuggest}
          aria-label="Suggest as a tip"
          replyStop="suggest-tip"
        >
          Suggest as a tip
        </BonsaiChatSecondaryButton>
      </Focusable>
      {line ? (
        <div
          className="bonsai-chat-suggest-tip-line"
          role="status"
          style={{
            color: view.state.phase === "refused" ? "#f2a0a0" : "#9fb7d5",
            fontSize: textPx(11),
            lineHeight: 1.35,
            marginTop: 2,
            overflowWrap: "anywhere",
          }}
        >
          {line}
        </div>
      ) : null}
    </React.Fragment>
  );
}
