/**
 * Title: Deck essentials model tags
 * Purpose: Canonical Ollama pull tags for tier-1 and tier-2 multimodal essentials bundles.
 * Used for: Pull models flow, setup wizards, and backend refactor_helpers alignment.
 * Solves: Keeps frontend essentials lists in sync with Python essentials pull tags.
 * Does not: Define full pull catalog entries — see pullModelCatalog for curated metadata.
 */
export const TIER1_ESSENTIALS_TAG = "qwen2.5vl:3b" as const;

export const TIER1_ESSENTIALS_PULL_TAGS: readonly string[] = [TIER1_ESSENTIALS_TAG];

export const TIER2_MULTIMODAL_TAG = "gemma4:e2b-it-qat" as const;
export const TIER2_MULTIMODAL_PULL_TAGS: readonly string[] = [TIER2_MULTIMODAL_TAG];
