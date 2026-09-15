/**
 * Title: How long the AI's replies are
 *
 * Purpose: A three-stop slider in the Ollama tab controls how long-winded
 * the AI's answers are: Caveman (short, blunt, key points only), Balanced
 * (the default, no particular instruction either way), and Detailed (more
 * explanation, examples, and steps). This file holds the three stops, their
 * labels, and the math that turns a slider position into one of the three
 * (and back).
 *
 * Used for: the verbosity slider in the Ollama tab, and the settings
 * clean-up file that reads a saved choice back.
 *
 * Solves: one shared list of the three stops and their order, so the slider
 * and the settings clean-up file agree on what "Balanced" is and which
 * direction the slider moves in.
 *
 * Does not: change the wording the AI is actually given. Choosing Caveman or
 * Detailed only saves that choice; turning it into an instruction the AI
 * follows happens on the computer or Deck side, when a question is sent.
 */
export type ReplyVerbosityId = "caveman" | "balanced" | "detailed";

export const REPLY_VERBOSITY_ORDER: readonly ReplyVerbosityId[] = [
  "caveman",
  "balanced",
  "detailed",
] as const;

export const DEFAULT_REPLY_VERBOSITY: ReplyVerbosityId = "balanced";

const _set = new Set<string>(REPLY_VERBOSITY_ORDER);

export const REPLY_VERBOSITY_LABELS: Record<ReplyVerbosityId, string> = {
  caveman: "Caveman",
  balanced: "Balanced",
  detailed: "Detailed",
};

export function isReplyVerbosityId(value: string): value is ReplyVerbosityId {
  return _set.has(value);
}

const _defaultIdx = REPLY_VERBOSITY_ORDER.indexOf(DEFAULT_REPLY_VERBOSITY);

export function indexOfReplyVerbosity(v: ReplyVerbosityId): number {
  const i = REPLY_VERBOSITY_ORDER.indexOf(v);
  return i >= 0 ? i : _defaultIdx >= 0 ? _defaultIdx : 1;
}

export function replyVerbosityAtIndex(index: number): ReplyVerbosityId {
  const n = REPLY_VERBOSITY_ORDER.length;
  if (n <= 0) return DEFAULT_REPLY_VERBOSITY;
  const clamped = Math.max(0, Math.min(n - 1, Math.round(index)));
  return REPLY_VERBOSITY_ORDER[clamped];
}
