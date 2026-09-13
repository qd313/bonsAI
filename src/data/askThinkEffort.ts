/**
 * Title: Ask thinking effort levels
 * Purpose: Off / Brief / Balanced / Deep thinking effort ids, labels, and descriptions.
 * Used for: OllamaThinkingEffortRow and bonsaiSettingsNormalizers persistence.
 * Solves: Typed effort enum for the four-stop control that enables model thinking.
 * Does not: Decide the wire value or token budgets — backend `ollama_ask_budgets`
 *   owns both, and sends `think` as a boolean regardless of level (decision D21).
 */
export type AskThinkEffortId = "off" | "low" | "medium" | "high";

export const ASK_THINK_EFFORT_IDS: readonly AskThinkEffortId[] = [
  "off",
  "low",
  "medium",
  "high",
] as const;

/** Off by default: thinking costs latency and tokens, so it is opt-in. */
export const DEFAULT_ASK_THINK_EFFORT: AskThinkEffortId = "off";

/** Named for what the user gets, not the token count behind it. */
export const ASK_THINK_EFFORT_LABELS: Record<AskThinkEffortId, string> = {
  off: "Off",
  low: "Brief",
  medium: "Balanced",
  high: "Deep",
};

export const ASK_THINK_EFFORT_DESCRIPTIONS: Record<AskThinkEffortId, string> = {
  off: "Answer straight away. Fastest.",
  low: "A moment of hidden reasoning first.",
  medium: "More reasoning on harder questions.",
  high: "Most reasoning. Noticeably slower on a Deck.",
};
