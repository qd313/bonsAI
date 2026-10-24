/**
 * Title: How much the AI thinks before answering
 *
 * Purpose: A row in the Ollama tab lets the user choose how much reasoning
 * the AI does before it writes a reply: Off, Brief, Balanced, or Deep. More
 * thinking can give a better answer to a hard question, but Deep is
 * noticeably slower on a Deck. Above Off, the reasoning itself shows on
 * screen live as it happens (plan 57), behind a one-time notice the first
 * time the row is moved off Off -- see `useThinkingNoticeGate.tsx`. This
 * file holds the four choices, their labels, and the one-line description
 * shown under each.
 *
 * Used for: the thinking-effort row in the Ollama tab, and the settings
 * clean-up file that reads a saved choice back.
 *
 * Solves: one shared list of the four choices and their wording, so the row
 * and the settings clean-up file agree on what "Balanced" means.
 *
 * Does not: decide exactly how long the AI reasons for. Off tells the AI not
 * to think at all; Brief, Balanced, and Deep all send the same plain "think
 * first" instruction, but each reserves a bigger separate allowance of extra
 * room for that thinking on top of the normal reply length — that reserved
 * room, not a different instruction, is what actually makes Deep slower.
 * That is a deliberate choice, recorded as decision D21, not a gap in this
 * file.
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
  low: "A moment of reasoning first, shown on screen as it happens.",
  medium: "More reasoning on harder questions, shown on screen as it happens.",
  high: "Most reasoning, shown on screen as it happens. Noticeably slower on a Deck.",
};
