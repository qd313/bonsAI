import React from "react";
import { Focusable } from "@decky/ui";
import { MainTabBonsaiAiMarkdownChunk } from "../components/MainTabBonsaiAiMarkdownChunk";
import { registerAnswerBubbleNav } from "./answerBubbleNavRegistry";
import {
  registerAnswerBubbleEl,
  resolveFocusedAnswerBubble,
} from "./answerBubbleElRegistry";
import { debugSessionLog } from "./debugSessionLog";
import {
  handleAnswerBubbleMoveDown,
  handleAnswerBubbleMoveUp,
} from "./answerBubbleNavigation";
import {
  isDownDeckButtonEvent,
  isUpDeckButtonEvent,
} from "./focusNavigation";
import { splitResponseIntoChunks } from "./splitResponseIntoChunks";

export type BuildAnswerBubbleElementArgs = {
  body: string;
  streaming: boolean;
  spoilerMaskingEnabled: boolean;
  maxWidthCss: string;
  answerKey: string;
};

const noopChunkRef = { current: 0 };

function captureBubble(answerKey: string): HTMLElement | null {
  const bubble = resolveFocusedAnswerBubble();
  if (bubble) registerAnswerBubbleEl(answerKey, bubble);
  return bubble;
}

/**
 * One Focusable answer bubble per turn (display chunks are non-focusable divs inside).
 * Parent turn-slot Focusable uses flow-children="vertical" for header → answer → reply.
 */
export function buildAnswerBubbleElement(
  args: BuildAnswerBubbleElementArgs
): React.ReactElement | null {
  const { body, streaming, spoilerMaskingEnabled, maxWidthCss, answerKey } = args;
  if (!body.trim()) return null;

  const displayChunks = splitResponseIntoChunks(body);
  const chunkTotal = displayChunks.length;

  const moveDown = () => {
    const bubble = captureBubble(answerKey);
    return handleAnswerBubbleMoveDown(bubble, noopChunkRef, chunkTotal, answerKey);
  };

  const moveUp = () => {
    const bubble = captureBubble(answerKey);
    return handleAnswerBubbleMoveUp(bubble, noopChunkRef, chunkTotal, answerKey);
  };

  const navHandlers = {
    onFocus: () => {
      const bubble = captureBubble(answerKey);
      registerAnswerBubbleNav({ moveDown, moveUp, resetChunkIndex: () => {} });
      // #region agent log
      debugSessionLog("buildAnswerBubbleElement", "answer bubble focused", "H6", {
        answerKey,
        chunkTotal,
        streaming,
        captured: Boolean(bubble),
        runId: "post-fix-14",
      });
      // #endregion
    },
    onMoveDown: () => {
      const bubble = captureBubble(answerKey);
      const handled = handleAnswerBubbleMoveDown(bubble, noopChunkRef, chunkTotal, answerKey);
      // #region agent log
      debugSessionLog("buildAnswerBubbleElement", "onMoveDown", "H7", {
        answerKey,
        handled,
        captured: Boolean(bubble),
        streaming,
        runId: "post-fix-14",
      });
      // #endregion
      return handled;
    },
    onMoveUp: () => moveUp(),
    onActivate: () => {
      captureBubble(answerKey);
    },
    onButtonDown: (button: unknown) => {
      if (isDownDeckButtonEvent(button)) return moveDown();
      if (isUpDeckButtonEvent(button)) return moveUp();
      return false;
    },
  } as Record<string, unknown>;

  return (
    <Focusable
      key={`answer-bubble-${answerKey}`}
      className={`bonsai-chat-ai-bubble bonsai-glass-panel${
        streaming ? " bonsai-chat-ai-bubble--stream-preview" : ""
      }`}
      {...navHandlers}
      style={{
        width: maxWidthCss,
        maxWidth: maxWidthCss,
        alignSelf: "flex-start",
        marginBottom: 8,
        boxSizing: "border-box",
      }}
    >
      <div
        className="bonsai-chat-ai-bubble-inner"
        data-bonsai-answer-bubble="true"
        data-bonsai-answer-key={answerKey}
      >
        <div className="bonsai-ai-response-stack bonsai-ai-response-stack--in-bubble">
          {displayChunks.map((chunk, i) => {
            const isLiveTail = streaming && i === displayChunks.length - 1;
            return (
              <div
                key={`${answerKey}-chunk-${i}`}
                className="bonsai-ai-response-chunk bonsai-ai-response-chunk--in-bubble"
                data-bonsai-chunk-index={String(i)}
                {...(isLiveTail ? { "data-bonsai-stream-preview": "true" } : {})}
              >
                {streaming ? (
                  <div className="bonsai-ai-response-plain-stream">{chunk}</div>
                ) : (
                  <MainTabBonsaiAiMarkdownChunk
                    source={chunk}
                    spoilerMaskingEnabled={spoilerMaskingEnabled}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Focusable>
  );
}
