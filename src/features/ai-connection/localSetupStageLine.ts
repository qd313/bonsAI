/**
 * Title: The one changing line that says what a local Ollama setup is doing right now
 *
 * Purpose: "Pull 1/2 — gemma4:e2b-it-qat · Downloading 6e4c…: 43% 1.9 GB/4.3 GB", "Installing Ollama…",
 * "Starting Ollama service…": the words a running setup shows, read from the back end's status.
 *
 * Used for: useLocalOllamaSetupFlow.tsx (the Ollama tab's status line) and the first-time setup's card on the Main
 * tab (main-tab/FirstRunSetupCard.tsx), so both say the same thing about the same run.
 *
 * Solves: The wording lived inside the Ollama tab's hook, where the Main tab's card could not reach it.
 *
 * Does not: Read the status itself; empty when no run is going.
 */
import type { LocalOllamaSetupStatus } from "./OllamaWhereAiRunsSection.types";

const STAGE_WORDS: Record<string, string> = {
  check: "Checking…",
  install: "Installing Ollama…",
  restart: "Restarting Ollama so the new version is the one running…",
  service: "Starting Ollama service…",
  pull: "Pulling models…",
  complete: "Finishing…",
};

/** The line for a running setup; empty when none is running. */
export function localSetupStageLine(st: LocalOllamaSetupStatus | null): string {
  if (!st || st.phase !== "running") return "";
  const stage = st.stage ?? "";
  if (stage === "pull" && (st.total_pull_steps ?? 0) > 0) {
    const cur = st.current_tag ? ` — ${st.current_tag}` : "";
    const progress = st.progress_text ? ` · ${st.progress_text}` : "";
    return `Pull ${st.pull_step ?? 0}/${st.total_pull_steps}${cur}${progress}`;
  }
  return STAGE_WORDS[stage] || (stage ? `${stage}…` : "Working…");
}
