import React from "react";
import { Focusable } from "@decky/ui";
import { findAnswerBubbleByKey, panelStepUp } from "./answerBubbleNavigation";
import { registerAnswerBubbleEl } from "./answerBubbleElRegistry";
import { BonsaiChatSecondaryButton } from "../components/BonsaiChatSecondaryButton";
import {
  RefreshArrowIcon,
  ThumbDownOutlineIcon,
  ThumbUpOutlineIcon,
} from "../components/icons";

export type BuildReplyActionsElementArgs = {
  replyKey: string;
  rating: "up" | "down" | null;
  onRate: (rating: "up" | "down") => void;
  showFeedback: boolean;
  onRetry?: () => void;
  transparencyOpen?: boolean;
  onToggleTransparency?: () => void;
};

/** Plain function so reply row is a direct transcript focus-graph sibling. */
export function buildReplyActionsElement(
  args: BuildReplyActionsElementArgs
): React.ReactElement | null {
  const {
    replyKey,
    rating,
    onRate,
    showFeedback,
    onRetry,
    transparencyOpen,
    onToggleTransparency,
  } = args;

  const showUtilityRow = Boolean(onRetry) || Boolean(onToggleTransparency);

  if (!showFeedback && !showUtilityRow && rating === null) {
    return null;
  }

  return (
    <Focusable
      key={`reply-actions-${replyKey}`}
      className="bonsai-chat-reply-actions"
      flow-children="vertical"
      {...({
        onMoveUp: () => {
          const bubble = findAnswerBubbleByKey(replyKey);
          if (bubble) registerAnswerBubbleEl(replyKey, bubble);
          if (bubble && panelStepUp(bubble)) return true;
          if (bubble) {
            bubble.setAttribute("tabindex", "-1");
            bubble.focus();
            const active = document.activeElement as HTMLElement | null;
            return Boolean(active && bubble.contains(active));
          }
          return false;
        },
      } as Record<string, unknown>)}
    >
      {showFeedback && rating !== null ? (
        <span className="bonsai-chat-feedback-row__label bonsai-chat-feedback-row--rated">
          Saved on this Deck
        </span>
      ) : null}
      {showFeedback && rating === null ? (
        <>
          <span className="bonsai-chat-feedback-row__label">Was this helpful?</span>
          <Focusable className="bonsai-chat-reply-actions-row" flow-children="horizontal">
            <BonsaiChatSecondaryButton
              onClick={() => onRate("up")}
              aria-label="Mark reply helpful"
            >
              <ThumbUpOutlineIcon size={14} />
              Helpful
            </BonsaiChatSecondaryButton>
            <BonsaiChatSecondaryButton onClick={() => onRate("down")} aria-label="Mark reply not helpful">
              <ThumbDownOutlineIcon size={14} />
              Not really
            </BonsaiChatSecondaryButton>
          </Focusable>
        </>
      ) : null}
      {showUtilityRow ? (
        <Focusable
          className="bonsai-chat-reply-actions-row bonsai-chat-reply-actions-row--utility"
          flow-children="horizontal"
          style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 8, alignItems: "center" }}
        >
          {onRetry ? (
            <BonsaiChatSecondaryButton onClick={onRetry} aria-label="Retry same prompt">
              <RefreshArrowIcon size={14} />
              Retry same prompt
            </BonsaiChatSecondaryButton>
          ) : null}
          {onToggleTransparency ? (
            <BonsaiChatSecondaryButton
              onClick={onToggleTransparency}
              aria-expanded={transparencyOpen}
              aria-label={transparencyOpen ? "Hide details" : "Show details"}
            >
              {transparencyOpen ? "Hide details" : "Show details"}
            </BonsaiChatSecondaryButton>
          ) : null}
        </Focusable>
      ) : null}
    </Focusable>
  );
}
