/**
 * Title: The two one-tap model downloads
 *
 * Purpose: When the AI runs on the Deck itself instead of a PC, the Ollama
 * tab offers two one-tap downloads instead of asking the user to pick a
 * model by hand: "Install Tier 1 essentials" (one small open-source model
 * that can chat, read screenshots, and do OCR) and an optional Tier 2 pull
 * (a second model, not fully open-source, that trades a bigger download for
 * a stronger all-in-one model). This file names exactly which Ollama tag
 * each button downloads.
 *
 * Used for: the local-AI setup section of the Ollama tab, and the one-time
 * warning shown the first time local AI is turned on, which names the
 * Tier 1 tag in its own text.
 *
 * Solves: the tag name only needs to change in one place on this side when a
 * better small model replaces the current pick.
 *
 * Does not: list every model available to pull — see pullModelCatalog for
 * the full browsable list, of which these two tags are just the recommended
 * first pick. It also does not keep itself in sync automatically with the
 * matching tag on the computer or Deck side
 * (`py_modules/backend/ollama_routing.py`): that file has its own copy of
 * the same tag, kept aligned by a comment telling a person to update both,
 * not by either file importing the other. The old header for this file
 * claimed the alignment was with a file called `refactor_helpers`; no such
 * file exists in this project, so that claim was dropped rather than
 * carried forward.
 */
export const TIER1_ESSENTIALS_TAG = "qwen2.5vl:3b" as const;

export const TIER1_ESSENTIALS_PULL_TAGS: readonly string[] = [TIER1_ESSENTIALS_TAG];

export const TIER2_MULTIMODAL_TAG = "gemma4:e2b-it-qat" as const;
export const TIER2_MULTIMODAL_PULL_TAGS: readonly string[] = [TIER2_MULTIMODAL_TAG];
