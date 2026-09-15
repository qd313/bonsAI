/**
 * Title: The three Ask modes: Speed, Strategy, Expert
 *
 * Purpose: Every question typed into the Ask bar goes out in one of three
 * modes, picked from the small menu above the bar: Speed for a fast plain
 * answer, Strategy for a walkthrough with branching choices, and Expert for
 * the most thorough (and slowest) answer. This file holds the three mode
 * names, and the colors used to tint the Ask bar, its chip, and the
 * "thinking" outline so each mode has its own look.
 *
 * Used for: the Ask mode menu, the mode chip on the Ask bar, and the
 * settings clean-up file that reads a saved mode back.
 *
 * Solves: one shared list of the three modes and their colors, so the menu,
 * the chip, and the glow around the bar while it is thinking all agree on
 * what color Speed (or Strategy, or Expert) is.
 *
 * Does not: decide which AI model actually answers a Speed vs. an Expert
 * question, or how many models are tried before giving up. That list of
 * fallback models lives on the computer or Deck running the AI, not here —
 * this file only carries the mode's name and its color.
 */
export type AskModeId = "speed" | "strategy" | "expert";

export const ASK_MODE_IDS: readonly AskModeId[] = ["speed", "strategy", "expert"];

export const ASK_MODE_LABELS: Record<AskModeId, string> = {
  speed: "Speed",
  strategy: "Strategy",
  expert: "Expert",
};

/** Accent color for mode chip border, label, and thinking outline (Steam-friendly on dark glass). */
export const ASK_MODE_ACCENT: Record<AskModeId, string> = {
  speed: "#4ade80",
  strategy: "#facc15",
  expert: "#f87171",
};

/** Very subtle tint for the mode chip (blends with ask-bar glass; borderless). */
export const ASK_MODE_FILL: Record<AskModeId, string> = {
  speed: "rgba(74, 222, 128, 0.06)",
  strategy: "rgba(250, 204, 21, 0.05)",
  expert: "rgba(248, 113, 113, 0.06)",
};

/** Low/high accent stops for ask-bar breathe (no color-mix — Deck CEF safe). */
export const ASK_MODE_ACCENT_BREATHE_LOW: Record<AskModeId, string> = {
  speed: "rgba(74, 222, 128, 0.24)",
  strategy: "rgba(250, 204, 21, 0.22)",
  expert: "rgba(248, 113, 113, 0.24)",
};

export const ASK_MODE_ACCENT_BREATHE_HIGH: Record<AskModeId, string> = {
  speed: "rgba(74, 222, 128, 0.62)",
  strategy: "rgba(250, 204, 21, 0.58)",
  expert: "rgba(248, 113, 113, 0.62)",
};

export const ASK_MODE_ACCENT_GLOW_LOW: Record<AskModeId, string> = {
  speed: "rgba(74, 222, 128, 0.04)",
  strategy: "rgba(250, 204, 21, 0.04)",
  expert: "rgba(248, 113, 113, 0.04)",
};

export const ASK_MODE_ACCENT_GLOW_HIGH: Record<AskModeId, string> = {
  speed: "rgba(74, 222, 128, 0.14)",
  strategy: "rgba(250, 204, 21, 0.12)",
  expert: "rgba(248, 113, 113, 0.14)",
};
