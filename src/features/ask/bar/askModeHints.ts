/**
 * Title: The grey hint in the empty question box, one per Ask mode
 *
 * Purpose: When the question box is empty it shows one grey sentence saying
 * what to type. Each of the three Ask modes has its own sentence.
 *
 * Used for: MainTabUnifiedAskBar.tsx, on both ways the box is drawn (the real
 * field's own hint, and the drawn overlay used where the field cannot show a
 * multi-line hint itself).
 *
 * Solves: Only Strategy used to have a hint; Speed and Expert showed an empty
 * box. One table keyed by mode keeps all three in one place so a new mode
 * cannot be forgotten and the two drawing paths cannot disagree.
 *
 * Does not: decide when the hint shows (the box being empty is the caller's
 * business) or how it looks (the sections styles do that).
 */
import type { AskModeId } from "./askMode";

export const ASK_MODE_HINTS: Record<AskModeId, string> = {
  speed: "Ask a quick question about your game.",
  strategy: "Describe the level, boss, or puzzle you're stuck on.",
  expert: "Ask for the full detail: builds, numbers, every step.",
};
