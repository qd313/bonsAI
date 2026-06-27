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

/** @deprecated Use ASK_MODE_ACCENT */
export const ASK_MODE_OUTLINE: Record<AskModeId, string> = ASK_MODE_ACCENT;
