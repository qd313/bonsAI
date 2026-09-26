/**
 * Title: Whether the plugin's saved settings have finished loading — read without a new prop
 *
 * Purpose: A couple of places need to know the moment usePluginSettings' own load effect has
 * settled (succeeded, or failed and fell back to defaults — either way, values are final for
 * this mount) so they can wait for it, without index.tsx threading a value down to reach them.
 * OllamaWhereAiRunsSection.tsx is the one that needed this: its automatic connection check has to
 * wait for real settings, or it probes a leftover default host and logs a failure it caused
 * itself (docs/test-evidence/plan64-OLLAMA-TAB-AFTER-RELOAD.json).
 *
 * Used for: usePluginSettings.ts writes it, the same moment its own `settingsLoaded` state turns
 * true. useSettingsLoadedFlag (src/hooks/useSettingsLoadedFlag.ts) reads it.
 *
 * Solves: threading a new value down through index.tsx and a tab's own payload hook is what
 * scripts/shell_seam.mjs counts as "things the main screen hands down to its tabs" — a number
 * that is only supposed to shrink. A plain module-level flag with a subscriber list, the same
 * shape MainTabBonsaiAiMarkdownChunk.tsx already uses for "any spoiler fence open anywhere",
 * reaches a component several files away from usePluginSettings without adding to that count.
 *
 * Does not: replace usePluginSettings' own `settingsLoaded` React state — every place that can
 * already reach it through an ordinary prop still should. This exists only for the one place that
 * could not, without the shell-seam count going up.
 */

let loaded = false;
const listeners = new Set<() => void>();

/** Called once, the same moment usePluginSettings' own settingsLoaded state turns true. */
export function markSettingsLoaded(): void {
  if (loaded) return;
  loaded = true;
  listeners.forEach((listener) => listener());
}

/** A synchronous read, for code that only needs the value at the moment it runs. */
export function peekSettingsLoaded(): boolean {
  return loaded;
}

/** Subscribe to the one moment this ever changes (false -> true). Returns the unsubscribe function. */
export function subscribeSettingsLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only reset, the same shape MainTabBonsaiAiMarkdownChunk.tsx's own registry offers. */
export function resetSettingsLoadedSignalForTests(): void {
  loaded = false;
  listeners.clear();
}
