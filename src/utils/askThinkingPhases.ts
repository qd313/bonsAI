/**
 * Title: Ask thinking phase copy
 * Purpose: Localized display strings and pending-placeholder detection for in-flight Ask status.
 * Used for: MainTab thinking indicator and useSmoothStreamReveal gating.
 * Solves: Consistent starting/working labels per reply language before backend phase arrives.
 * Does not: Poll thinking_summary — backend status poll remains authoritative after first update.
 */
/** Display-only thinking phase copy; backend remains source of truth after first poll. */
import { englishUiString } from "../i18n/catalog";
export const ASK_THINKING_STARTING_DISPLAY = englishUiString("ask.starting");
const PENDING_PLACEHOLDER_RE = /^thinking\.{0,3}$/i;

/** True when assistant text is a non-displayable pending placeholder. */
export function isPendingPlaceholderResponse(text: string): boolean {
  const raw = (text || "").trim();
  if (!raw) return true;
  return PENDING_PLACEHOLDER_RE.test(raw);
}

/**
 * Statuses the backend sends in the ``response`` field of a stopped Ask when it had no readable
 * draft to keep — ``Plugin._cancelled_response_text``'s fallback, plus the executor's transport
 * message. They are statuses, not answers, so the UI shows them as a Stopped notice instead of
 * rendering them as the assistant's reply.
 */
const STOP_NOTICE_RESPONSES = new Set([
  "request cancelled.",
  "request stopped (connection closed).",
  "stopped.",
]);

/** True when a cancelled Ask's text is a stop status rather than a kept partial answer. */
export function isStopNoticeResponse(text: string): boolean {
  const raw = (text || "").trim().toLowerCase();
  if (!raw) return true;
  return STOP_NOTICE_RESPONSES.has(raw);
}
