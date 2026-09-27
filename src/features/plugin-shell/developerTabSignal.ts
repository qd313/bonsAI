/**
 * Title: Whether the Developer tab is turned on — read without a new prop
 *
 * Purpose: 0.6.0 (plan 72) shows a few half-built controls only when the Developer tab is on.
 * Find LAN on the Ollama tab is one, and the Ollama tab's section sits several files below
 * usePluginSettings with no prop carrying this value. Same shape and same reason as
 * settingsLoadedSignal.ts: threading a new value through index.tsx and the tab's payload hook
 * raises the shell-seam count, which is only supposed to shrink.
 *
 * Used for: usePluginSettings.ts writes it whenever its own showDeveloperTab value changes;
 * OllamaWhereAiRunsSection.tsx reads it through useDeveloperTabShown.
 *
 * Does not: replace the showDeveloperTab setting. Anywhere that already receives it as a prop
 * (the Settings tab, the Developer tab) should keep using the prop.
 */
import { useEffect, useState } from "react";

let shown = false;
const listeners = new Set<(value: boolean) => void>();

/** Called by usePluginSettings each time its showDeveloperTab value changes. */
export function publishDeveloperTabShown(value: boolean): void {
  if (shown === value) return;
  shown = value;
  listeners.forEach((listener) => listener(value));
}

/** A synchronous read, for code that only needs the value at the moment it runs. */
export function peekDeveloperTabShown(): boolean {
  return shown;
}

/** Subscribe to changes. Returns the unsubscribe function. */
function subscribeDeveloperTabShown(listener: (value: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only reset. */
export function resetDeveloperTabSignalForTests(): void {
  shown = false;
  listeners.clear();
}

/** Re-renders the caller whenever the Developer tab is turned on or off. */
export function useDeveloperTabShown(): boolean {
  const [value, setValue] = useState(peekDeveloperTabShown);
  useEffect(() => {
    // Catch a change that landed between the first render and this effect.
    setValue(peekDeveloperTabShown());
    return subscribeDeveloperTabShown(setValue);
  }, []);
  return value;
}
