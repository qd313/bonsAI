/**
 * Ollama `keep_alive` duration presets (plugin → host). Values are Go-style duration strings accepted by Ollama's API.
 * Default 5m matches Ollama's typical unload delay after a request.
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
