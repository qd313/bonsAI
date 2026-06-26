/** Persisted Ask inference mode (maps to ordered Ollama model fallbacks on the backend). */
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

/** Semi-transparent fill for the mode trigger chip background. */
export const ASK_MODE_FILL: Record<AskModeId, string> = {
  speed: "rgba(74, 222, 128, 0.22)",
  strategy: "rgba(250, 204, 21, 0.20)",
  expert: "rgba(248, 113, 113, 0.22)",
};

/** @deprecated Use ASK_MODE_ACCENT */
export const ASK_MODE_OUTLINE: Record<AskModeId, string> = ASK_MODE_ACCENT;
