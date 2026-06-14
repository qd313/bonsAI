/** One-line collapsed title for an Ask thread row (truncated user question). */
export function buildCollapsedTurnTitle(question: string, maxLen = 60): string {
  const normalized = (question || "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 1).trimEnd()}…`;
}
