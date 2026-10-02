/**
 * Title: The starter model's tag
 *
 * Purpose: When the AI runs on the Deck itself instead of a PC, one small
 * model (qwen2.5vl:3b: chat, screenshots, OCR and Strategy mode) is offered
 * as the starter set, by the first "Install Ollama" on a Deck with no models
 * and by Browse models' "Install the starter set" button. This file names
 * exactly which Ollama tag that is.
 *
 * Used for: the starter-set boxes and button (localOllamaStarterSet.tsx), and
 * the one-time warning shown the first time local AI is turned on, which names
 * the tag in its own text.
 *
 * Solves: the tag name only needs to change in one place on this side when a
 * better small model replaces the current pick.
 *
 * Does not: list every model available to pull — see pullModelCatalog for
 * the full browsable list, of which this tag is just the recommended first
 * pick. It also does not keep itself in sync automatically with the
 * matching tag on the computer or Deck side
 * (`py_modules/backend/ollama_routing.py`): that file has its own copy of
 * the same tag, kept aligned by a comment telling a person to update both,
 * not by either file importing the other. The bigger Gemma 4 model is no
 * longer a one-tap download (plan 79); it is reached through Browse models.
 */
export const TIER1_ESSENTIALS_TAG = "qwen2.5vl:3b" as const;

export const TIER1_ESSENTIALS_PULL_TAGS: readonly string[] = [TIER1_ESSENTIALS_TAG];

