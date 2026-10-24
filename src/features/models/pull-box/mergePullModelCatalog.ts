/**
 * Title: Small helpers for the Pull Models list of tags
 *
 * Purpose: Three small checks the Pull Models screen shares: the list of tags in the built-in
 * model list, whether one tag is in that list, and whether a typed-in model name is shaped
 * like a real one. (This file once also laid a downloaded update over the built-in list; that
 * download is gone, so the built-in list is now the only list.)
 *
 * Used for: the Pull Models screen's list of downloadable models, its typed-name field and the
 * code that pulls a typed-in model.
 *
 * Solves: one place for the tag checks, so the screen and its hooks agree on what counts as a
 * model in the list and what counts as a plausible typed name.
 *
 * Does not: fetch anything, or know whether a model exists. Only the back end can look that up
 * (`partition_pull_tags_by_registry`).
 *
 * Gotchas:
 *   - `isPlausibleOllamaPullTag()` only checks that a typed-in model name is shaped like a real
 *     one — right characters, not too long, not empty. It mirrors the back end's own
 *     `is_valid_ollama_pull_tag` check (`ollama_catalog_service.py`). It cannot tell whether that
 *     model actually exists; only the back end can look that up
 *     (`partition_pull_tags_by_registry`).
 */
import type { PullModelEntry } from "../pullModelCatalog";

const TAG_RE = /^[a-z0-9][a-z0-9._-]{0,63}(:[a-z0-9._-]{1,32})?$/;

export function getCatalogTags(catalog: readonly PullModelEntry[]): string[] {
  return catalog.map((e) => e.tag);
}

export function isCatalogModelTagInList(catalog: readonly PullModelEntry[], tag: string): boolean {
  return catalog.some((e) => e.tag === tag);
}

/**
 * Same shape check the backend runs (`OLLAMA_TAG_RE` / `is_valid_ollama_pull_tag` in
 * `ollama_catalog_service.py`) so a typed custom tag can be sanity-checked before the round trip.
 * This only rules out something that could never be a real Ollama tag (bad characters, empty,
 * too long) — whether the tag actually exists in the Ollama library is a registry lookup the
 * backend still owns (`partition_pull_tags_by_registry`), not something the frontend can know.
 */
export function isPlausibleOllamaPullTag(tag: string): boolean {
  const t = tag.trim();
  if (!t || t.length > 96) return false;
  return TAG_RE.test(t);
}
