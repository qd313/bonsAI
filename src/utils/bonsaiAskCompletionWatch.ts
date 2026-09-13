/**
 * Title: Ask completion watcher
 * Purpose: Background poll loop for terminal Ask status when user leaves Main tab during a request.
 * Used for: index.tsx after background Ask start when reply surface may be hidden.
 * Solves: Ready/error toasts and completion handling without keeping MainTab mounted.
 * Does not: Start Ask or stream tokens — see useBackgroundGameAi.
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
