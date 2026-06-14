import React from "react";
import { Focusable } from "@decky/ui";
import { focusFirstAnswerChunk } from "./answerBubbleNavigation";
import { debugSessionLog } from "./debugSessionLog";
import { isDownDeckButtonEvent } from "./focusNavigation";

export type BuildTurnHeaderElementArgs = {
  turnId: string;
  title: string;
  expanded: boolean;
  variant?: "history" | "live";
  isStreaming?: boolean;
  onActivate: () => void;
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
  } = args;

  const headerClass = [
    "bonsai-chat-turn-row-header",
    variant === "live" ? "bonsai-chat-turn-row-header--live" : "bonsai-chat-turn-row-header--history",
    expanded ? "bonsai-chat-turn-row-header--expanded" : "bonsai-chat-turn-row-header--collapsed",
    isStreaming ? "bonsai-chat-turn-row-header--streaming" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const focusAnswer = () => {
    if (!expanded) return false;
    const focused = focusFirstAnswerChunk(turnId);
    // #region agent log
    debugSessionLog("buildTurnHeaderElement", "header focus answer", "H21", {
      turnId,
      focused,
      runId: "post-fix-14",
    });
    // #endregion
    return focused;
  };

  const headerNavHandlers = {
    onMoveDown: () => focusAnswer(),
    onButtonDown: (button: unknown) =>
      isDownDeckButtonEvent(button) ? focusAnswer() : false,
  } as Record<string, unknown>;

  return (
    <Focusable
      key={`turn-header-${turnId}`}
      className={headerClass}
      onActivate={onActivate}
      aria-expanded={expanded}
      data-bonsai-turn-id={turnId}
      {...headerNavHandlers}
    >
      <span className="bonsai-chat-turn-row-title" data-bonsai-turn-id={turnId}>
        {title || "…"}
      </span>
    </Focusable>
  );
}
