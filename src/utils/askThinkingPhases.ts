/**
 * Title: "Thinking..." status text, and telling a real answer from a status message
 *
 * Purpose: While the AI is working on a reply, the screen shows a short "starting..." or
 * "thinking..." message in the player's chosen language. This file holds that wording, and also
 * answers two small yes/no questions used elsewhere: is this text actually just a placeholder and
 * not a real answer yet, and is this text a message about the request being stopped rather than a
 * kept partial answer.
 *
 * Used for: the thinking indicator on the main tab, and the code that decides how quickly to reveal
 * streaming text as it arrives (useSmoothStreamReveal).
 *
 * Solves: keeps the wording for "still working on it" consistent across languages, and gives one
 * place to check for placeholder or stopped-request text instead of every caller matching it by hand.
 *
 * Does not: track the AI's actual progress. The back end's own status updates remain the source of
 * truth for what stage a request is in once the first one arrives — this file only supplies display
 * text and a couple of pattern checks.
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
