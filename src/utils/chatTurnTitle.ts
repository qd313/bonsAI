/**
 * Title: The question shown at the top of each chat turn
 *
 * Purpose: Every question-and-answer pair in the chat has the player's question written above it as
 * a heading. While that pair is closed, the heading shows a short, one-line version of the question.
 * Once the player opens it, the heading should show the whole question, not a cut-off version. This
 * file builds both versions of that text.
 *
 * Used for: the turn headers in the main chat view (MainTabChatTranscript, via
 * buildTurnHeaderElement). The heading's own on-screen styling wraps the open version onto up to five
 * lines with a fade at the end if it still runs long — this file only decides what text to hand it,
 * not how that text is laid out.
 *
 * Solves: a past version of this cut the question short twice — once here, and a second time by an
 * unrelated styling rule that cut it even shorter — so the length meant to apply here was never
 * actually what the player saw. An open turn is now guaranteed to show the whole question.
 *
 * Does not: save these headings anywhere. They are worked out fresh each time from whatever question
 * is currently in memory.
 */
function normalizeQuestionText(question: string): string {
  return (question || "").trim().replace(/\s+/g, " ");
}

/** One-line collapsed title for a CLOSED Ask thread row (truncated user question). */
export function buildCollapsedTurnTitle(question: string, maxLen = 60): string {
  const normalized = normalizeQuestionText(question);
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * Whole-question title for an OPEN Ask thread row. Whitespace-normalized only — no length cap.
 * The turn header's expanded CSS wraps this and caps it visually at five lines.
 */
export function buildExpandedTurnTitle(question: string): string {
  return normalizeQuestionText(question);
}
