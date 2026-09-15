/**
 * Title: The "your reply is ready" notification
 *
 * Purpose: When a question finishes being answered while the player is not looking at the part of
 * the screen that would show it, this file is what puts up a small notification (a "toast") saying
 * the reply is ready, or that something went wrong. It also notifies if checking in on the question
 * itself failed, so losing the connection while waiting does not just go silent. Tapping the
 * notification takes the player back to see the answer. Each question only ever gets one
 * notification, even if it is checked on more than once.
 *
 * Used for: useBackgroundGameAi and the background-question watcher (bonsaiAskCompletionWatch), both
 * of which call in here once a question is known to be finished, failed, or unreachable.
 *
 * Solves: without this, a finished answer arriving while the player was on a different Steam tab
 * would go unnoticed instead of being called out — and calling it out from more than one place risked
 * the same finished question getting notified about twice.
 *
 * Does not: bring the player back to the reply itself, or bring the plugin's panel to the front —
 * tapping the notification only queues that request; bonsaiReplySurface.openBonsaiReplyFromToast is
 * what actually does it.
 */
import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import { formatDeckyRpcError } from "./deckyCall";
import { showPhaseToast } from "./bonsaiPhaseToast";
import { isReplySurfaceVisible, openBonsaiReplyFromToast } from "./bonsaiReplySurface";

const toastedRequestIds = new Set<number>();

function markRequestToasted(requestId: number | null): void {
  if (requestId != null && Number.isFinite(requestId)) {
    toastedRequestIds.add(requestId);
  }
}

function wasRequestToasted(requestId: number | null): boolean {
  return requestId != null && Number.isFinite(requestId) && toastedRequestIds.has(requestId);
}

function truncateToastBody(text: string, maxLen = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

/** Notify once per completed/failed Ask when the reply surface is not already visible. */
export function handleAskTerminalForToast(status: BackgroundRequestStatus): void {
  const requestId = status.request_id;

  if (wasRequestToasted(requestId)) return;

  if (isReplySurfaceVisible()) {
    markRequestToasted(requestId);
    return;
  }

  if (status.status === "completed" && status.success) {
    showPhaseToast({
      title: "Reply ready",
      body: "Tap to open",
      duration: 4000,
      onClick: openBonsaiReplyFromToast,
    });
    markRequestToasted(requestId);
    return;
  }

  if (status.status === "failed" || (status.status === "completed" && !status.success)) {
    const body =
      truncateToastBody(status.error ?? "") ||
      truncateToastBody(status.response ?? "") ||
      "Something went wrong.";
    showPhaseToast({
      title: "Ask failed",
      body,
      duration: 5000,
    });
    markRequestToasted(requestId);
  }
}

/** Background status poll failed while QAM was closed — surface a single error toast. */
export function handleAskPollErrorForToast(error: unknown): void {
  if (isReplySurfaceVisible()) return;
  const body = truncateToastBody(formatDeckyRpcError(error));
  showPhaseToast({
    title: "Ask failed",
    body: body || "Connection error.",
    duration: 5000,
  });
}

/** Test-only reset. */
export function resetReplyReadyToastState(): void {
  toastedRequestIds.clear();
}
