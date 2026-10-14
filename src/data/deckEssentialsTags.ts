/**
 * Title: The starter model's tag
 *
 * Purpose: When the AI runs on the Deck itself instead of a PC, one small
 * model (gemma4:e2b-it-qat: chat, screenshots, OCR and Strategy mode) is offered
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
 * pick (since 2026-10-13 it is Gemma 4, not qwen2.5vl:3b, whose own licence is research-only). It also does not keep itself in sync automatically with the
 * matching tag on the computer or Deck side
 * (`py_modules/backend/ollama_routing.py`): that file has its own copy of
 * the same tag, kept aligned by a comment telling a person to update both,
 * not by either file importing the other (tests/test_starter_tag_parity.py fails if they drift). The bigger Gemma 4 model is no
 * longer a one-tap download (plan 79); it is reached through Browse models.
 */
export const TIER1_ESSENTIALS_TAG = "gemma4:e2b-it-qat" as const;

/** The note-search model the starter set also installs (the knowledge library reads it). */
export const STARTER_NOTE_SEARCH_TAG = "nomic-embed-text" as const;

/** The two speech models the starter set downloads through the voice engine, not Ollama. */
export const STARTER_SPEECH_MODELS: readonly string[] = ["tiny.en", "base.en"];

/** What Ollama pulls for the starter set, in order. Python's TIER1_ESSENTIALS_PULL_TAGS must match (tests/test_starter_set_extras.py). */
export const TIER1_ESSENTIALS_PULL_TAGS: readonly string[] = [TIER1_ESSENTIALS_TAG, STARTER_NOTE_SEARCH_TAG];

