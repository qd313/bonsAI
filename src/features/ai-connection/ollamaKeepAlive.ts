/**
 * Title: How long a model stays loaded after answering
 *
 * Purpose: A slider in Settings controls how long the AI model stays loaded
 * in memory on the computer or Deck after it answers a question, before
 * Ollama unloads it to free that memory back up. The slider has thirteen
 * stops, from 0 (unload right away) up to 4 hours, with 5 minutes as the
 * default. This file holds the thirteen stops in order, the short label
 * shown on each, and the math that turns a slider position into one of the
 * thirteen values (and back).
 *
 * Used for: the keep-alive slider in Settings, and the settings clean-up
 * file that reads a saved value back.
 *
 * Solves: the slider, its chip labels, and the settings clean-up file all
 * need the exact same thirteen values, spelled the way Ollama itself expects
 * ("5m", "30m", and so on) — this is the one place that list is written.
 *
 * Does not: tell Ollama to unload a model early, or do anything with the
 * chosen value beyond saving it. The value is sent along with every question
 * asked, on the computer or Deck side, not from here.
 */
export type OllamaKeepAliveDuration =
  | "0s"
  | "15s"
  | "30s"
  | "1m"
  | "2m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "45m"
  | "60m"
  | "120m"
  | "240m";

export const OLLAMA_KEEP_ALIVE_ORDER: readonly OllamaKeepAliveDuration[] = [
  "0s",
  "15s",
  "30s",
  "1m",
  "2m",
  "3m",
  "5m",
  "15m",
  "30m",
  "45m",
  "60m",
  "120m",
  "240m",
] as const;

export const DEFAULT_OLLAMA_KEEP_ALIVE: OllamaKeepAliveDuration = "5m";

const _set = new Set<string>(OLLAMA_KEEP_ALIVE_ORDER);

/** Short labels for settings chips (full context in section title + prose). */
export const OLLAMA_KEEP_ALIVE_CHIP_LABEL: Record<OllamaKeepAliveDuration, string> = {
  "0s": "0",
  "15s": "15s",
  "30s": "30s",
  "1m": "1m",
  "2m": "2m",
  "3m": "3m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "45m": "45m",
  "60m": "60m",
  "120m": "120m",
  "240m": "240m",
};

export function isOllamaKeepAliveDuration(value: string): value is OllamaKeepAliveDuration {
  return _set.has(value);
}

const _defaultIdx = OLLAMA_KEEP_ALIVE_ORDER.indexOf(DEFAULT_OLLAMA_KEEP_ALIVE);

export function indexOfOllamaKeepAlive(d: OllamaKeepAliveDuration): number {
  const i = OLLAMA_KEEP_ALIVE_ORDER.indexOf(d);
  return i >= 0 ? i : _defaultIdx >= 0 ? _defaultIdx : 0;
}

export function ollamaKeepAliveAtIndex(index: number): OllamaKeepAliveDuration {
  const n = OLLAMA_KEEP_ALIVE_ORDER.length;
  if (n <= 0) return DEFAULT_OLLAMA_KEEP_ALIVE;
  const clamped = Math.max(0, Math.min(n - 1, Math.round(index)));
  return OLLAMA_KEEP_ALIVE_ORDER[clamped];
}
