/** Display-only thinking phase copy; backend remains source of truth after first poll. */
export const ASK_THINKING_STARTING_DISPLAY = "Starting…";

const PENDING_PLACEHOLDER_RE = /^thinking\.{0,3}$/i;

/** True when assistant text is a non-displayable pending placeholder. */
export function isPendingPlaceholderResponse(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return true;
  return PENDING_PLACEHOLDER_RE.test(t);
}
