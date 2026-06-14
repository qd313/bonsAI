import { Focusable } from "@decky/ui";

import { panelStepUp } from "../utils/answerBubbleNavigation";
import { BonsaiChatSecondaryButton } from "./BonsaiChatSecondaryButton";

import {

  RefreshArrowIcon,

  ThumbDownOutlineIcon,

  ThumbUpOutlineIcon,

} from "./icons";



type BonsaiChatReplyActionsProps = {

  rating: "up" | "down" | null;

  onRate: (rating: "up" | "down") => void;

  showFeedback: boolean;

  onRetry?: () => void;

  transparencyOpen?: boolean;

  onToggleTransparency?: () => void;

};



export function BonsaiChatReplyActions({

  rating,

  onRate,

  showFeedback,

  onRetry,

  transparencyOpen,

  onToggleTransparency,

}: BonsaiChatReplyActionsProps) {

  const showUtilityRow = Boolean(onRetry) || Boolean(onToggleTransparency);



  if (!showFeedback && !showUtilityRow && rating === null) {

    return null;

  }



  return (

    <Focusable
      className="bonsai-chat-reply-actions"
      flow-children="vertical"
      {...({
        onMoveUp: () => {
          const reply = document.activeElement as HTMLElement | null;
          const column = reply?.closest(".bonsai-chat-main-column");
          const bubble = column?.querySelector(
            "[data-bonsai-answer-bubble]"
          ) as HTMLElement | null;
          if (bubble && panelStepUp(bubble)) return true;
          if (bubble) {
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


