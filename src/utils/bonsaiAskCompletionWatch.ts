/**
 * Title: Watching a background question for when it finishes
 *
 * Purpose: The player can ask the AI a question, then close the plugin's own panel (or switch to a
 * different Steam tab) while the answer is still being written. This file is what keeps checking, in
 * the background, whether that answer has finished, failed, or been cancelled — even while none of
 * the plugin's own screen is showing. When it notices the answer is done, it is what triggers the
 * "your reply is ready" notification and read-aloud, if either is turned on.
 *
 * Used for: index.tsx, started right after a question is sent in the background, for the case where
 * the part of the screen that would normally show the answer arriving might not be visible to check
 * on its own.
 *
 * Solves: the ready/failed notification and the handling that follows it would not run at all if
 * something had to keep the main tab mounted on screen the whole time an answer was being written.
 *
 * Does not: start the question, or receive the answer's text as it streams in — that is
 * useBackgroundGameAi's job. This file only checks in periodically and reacts once the question is
 * fully done.
 *
 * How it works: starting a watch bumps a counter and begins checking in on a timer, waiting longer
 * between checks for an ordinary answer and shorter while text is actively streaming in. Every check
 * first confirms its own counter still matches the current one — starting a new watch, or stopping
 * the current one, bumps the counter and makes any check already in flight for the old one a no-op,
 * so an old watch can never act after a newer one has taken over.
 */
import { callDeckyWithTimeout } from "./deckyCall";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import {
  BACKGROUND_STATUS_POLL_MS,
  BACKGROUND_STREAM_POLL_MS,
} from "../hooks/useBackgroundGameAi";
import { handleAskPollErrorForToast, handleAskTerminalForToast } from "./bonsaiReplyReadyToast";
import { handleAskTerminalForReadAloud } from "../hooks/useReadAloud";

let watchSeq = 0;
let pollTimer: number | null = null;

function clearPollTimer(): void {
  if (pollTimer != null) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function isWatchActive(seq: number): boolean {
  return seq === watchSeq;
}

async function pollOnce(seq: number): Promise<void> {
  if (!isWatchActive(seq)) return;
  try {
    const status = await callDeckyWithTimeout<[], BackgroundRequestStatus>(
      "get_background_game_ai_status",
      []
    );
    if (!isWatchActive(seq)) return;

    if (status.status === "completed" || status.status === "failed") {
      handleAskTerminalForToast(status);
      handleAskTerminalForReadAloud(status);
      stopAskCompletionWatch();
      return;
    }

    if (status.status === "cancelled") {
      stopAskCompletionWatch();
      return;
    }

    if (status.status === "pending") {
      const delayMs = status.streaming ? BACKGROUND_STREAM_POLL_MS : BACKGROUND_STATUS_POLL_MS;
      pollTimer = window.setTimeout(() => {
        void pollOnce(seq);
      }, delayMs);
      return;
    }

    stopAskCompletionWatch();
  } catch (error: unknown) {
    if (!isWatchActive(seq)) return;
    handleAskPollErrorForToast(error);
    stopAskCompletionWatch();
  }
}

/**
 * Module-level Ask status poll — survives Content unmount when QAM closes.
 * React polling in useBackgroundGameAi still drives in-plugin UI updates.
 */
export function startAskCompletionWatch(): void {
  watchSeq += 1;
  const seq = watchSeq;
  clearPollTimer();
  void pollOnce(seq);
}

export function stopAskCompletionWatch(): void {
  watchSeq += 1;
  clearPollTimer();
}

/** Test-only: current watch generation (invalidated when stopped/started). */
export function getAskCompletionWatchSeq(): number {
  return watchSeq;
}
