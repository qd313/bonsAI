/**
 * Title: UI string keys
 * Purpose: Typed union and registry of bounded v1 UI localization keys.
 * Used for: i18n/catalog and utils/i18n t() lookups.
 * Solves: Compile-time key safety for reply-language UI strings without open-ended string keys.
 * Does not: Store translations — see i18n/catalog language tables.
 */
/** Typed UI string keys for bounded v1 localization. */

export type UiStringKey =
  | "ask.starting"
  | "ask.working"
  | "toast.permissionRequired.title"
  | "toast.permissionRequired.body"
  | "toast.voiceInputError.title"
  | "toast.sessionCleared.title"
  | "toast.sessionCleared.body"
  | "toast.clearFailed.title"
  | "about.replyLanguage.sectionTitle"
  | "about.replyLanguage.dropdownLabel"
  | "about.replyLanguage.hint"
  | "about.replyLanguage.systemDetected";
