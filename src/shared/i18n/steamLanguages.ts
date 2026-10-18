/**
 * Title: Steam's languages, re-opened under a shorter name
 *
 * Purpose: This file adds nothing of its own — it just hands back, under a
 * shorter import path, the same list of Steam's languages, their English
 * names, and the reply-language helpers that `replyLanguage.ts` already
 * defines. A file elsewhere that only needs the language list, without
 * needing anything else from `replyLanguage.ts`, can get it from here
 * instead.
 *
 * Used for: the About tab's reply-language section, and anywhere else that
 * wants Steam's language codes and labels without importing the whole
 * reply-language file.
 *
 * Solves: nothing gets defined twice. If `replyLanguage.ts` ever needed to
 * move, only this one file's imports would need updating, not every file
 * that uses the language list.
 *
 * Does not: define any language, code, or label of its own. The real list is
 * in `replyLanguage.ts` — add or change a language there, never here.
 */
export {
  REPLY_LANGUAGE_ALWAYS_ENGLISH,
  REPLY_LANGUAGE_FOLLOW_SYSTEM,
  STEAM_LANGUAGE_CODES,
  STEAM_LANGUAGE_LABELS,
  buildReplyLanguageDropdownOptions,
  effectiveLangCatalogKey,
  replyLanguageLabel,
  type ReplyLanguageDropdownOption,
  type ReplyLanguageId,
  type SteamLanguageCode,
} from "./replyLanguage";
