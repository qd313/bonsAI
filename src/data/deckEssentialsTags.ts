/** Must stay aligned with essentials pull tags in `refactor_helpers.py`. */

export const TIER1_ESSENTIALS_TAG = "qwen2.5vl:3b" as const;

export const TIER1_ESSENTIALS_PULL_TAGS: readonly string[] = [TIER1_ESSENTIALS_TAG];

export const TIER2_MULTIMODAL_TAG = "gemma4:e2b-it-qat" as const;

export const TIER2_MULTIMODAL_PULL_FALLBACK_TAG = "gemma4:e2b" as const;

export const TIER2_MULTIMODAL_PULL_TAGS: readonly string[] = [TIER2_MULTIMODAL_TAG];
