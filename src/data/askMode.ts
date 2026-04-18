/** Persisted Ask inference mode (maps to ordered Ollama model fallbacks on the backend). */
export type AskModeId = "speed" | "strategy" | "deep";

export const ASK_MODE_IDS: readonly AskModeId[] = ["speed", "strategy", "deep"];

export const ASK_MODE_LABELS: Record<AskModeId, string> = {
  speed: "Speed",
  strategy: "Strategy Guide",
  deep: "Expert",
};

/** Outline color for the mode trigger button (Steam-friendly on dark glass). */
export const ASK_MODE_OUTLINE: Record<AskModeId, string> = {
  speed: "#4ade80",
  strategy: "#cd7f32",
  deep: "#d4af37",
};
