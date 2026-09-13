/**
 * Title: Deprioritized Ollama tags
 * Purpose: Sets of model tags deprioritized or blocked from the pull catalog and routing UI.
 * Used for: PullModelsModal filtering, model routing order picker, and catalog overlay merge.
 * Solves: Frontend mirror of refactor_helpers deprioritized/blocked tag lists in Python.
 * Does not: Delete installed models or change backend routing — classification happens server-side.
 */
export const DEPRIORITIZED_OLLAMA_TAGS = new Set(
  [
    "qwen2.5:1.5b",
    "qwen2.5:7b",
    "qwen2.5:14b",
    "qwen2.5:latest",
    "qwen2.5",
    "tinyllama",
    "orca-mini",
    "vicuna",
    "llava:7b",
    "llava:latest",
    "llava",
    "gemma3:4b",
    "gemma3:1b",
    "gemma3:latest",
    "gemma3:27b",
    "gemma4:31b",
    "qwen2.5:32b",
    "qwen3.5:32b",
    "qwen3-vl:30b-a3b",
    "internvl3.5:38b",
    "internvl2.5:38b",
    "llama3.2:3b",
    "llama3.2:1b",
    "llama3:latest",
    "llama3",
  ].map((t) => t.toLowerCase())
);

export const DEPRIORITIZED_OLLAMA_BASES = new Set(["tinyllama", "orca-mini", "vicuna", "phi"]);

export const BLOCKED_PULL_CATALOG_TAGS = new Set(
  ["qwen3-vl:30b-a3b", "internvl3.5:38b", "internvl2.5:38b"].map((t) => t.toLowerCase())
);

export function isDeprioritizedOllamaTag(tag: string): boolean {
  const t = (tag || "").trim().toLowerCase();
  if (!t) return false;
  if (DEPRIORITIZED_OLLAMA_TAGS.has(t)) return true;
  const base = t.split(":")[0] ?? t;
  return DEPRIORITIZED_OLLAMA_BASES.has(base);
}
