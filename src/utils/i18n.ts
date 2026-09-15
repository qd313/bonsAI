/**
 * Title: Looking up one on-screen label in the player's language
 *
 * Purpose: Small one-function file that looks up a single piece of on-screen text in whichever
 * language the player has chosen for AI replies, falling back to English for anything not yet
 * translated into that language.
 *
 * Used for: the `t()` helper used throughout the screen (useReplyLanguage) and the "thinking..."
 * status text (askThinkingPhases).
 *
 * Solves: nothing on its own beyond picking the right language variant of a lookup that already
 * exists — see below.
 *
 * Does not: hold the actual text for each label, or the list of which labels exist — those live in
 * i18n/keys and i18n/catalog. This file only picks the right language before handing the lookup off
 * to them.
 */
import { effectiveLangCatalogKey } from "../data/replyLanguage";
import { lookupUiString, type UiStringVars } from "../i18n/catalog";
import type { UiStringKey } from "../i18n/keys";

/** Resolve a UI string for the effective Ask reply language (English per-key fallback). */
export function t(key: UiStringKey, effectiveLangCode: string, vars?: UiStringVars): string {
  return lookupUiString(key, effectiveLangCatalogKey(effectiveLangCode), vars);
}
