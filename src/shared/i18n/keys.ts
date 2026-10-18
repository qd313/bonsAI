/**
 * Title: The list of text bonsAI can show in another language
 *
 * Purpose: bonsAI can show a handful of its own interface messages — "Ask
 * is starting", a couple of toast titles, the reply-language picker's own
 * labels — in the language a person has chosen, separately from whatever
 * language the AI itself answers in. This file is the fixed list of which
 * pieces of text that covers. It is deliberately short: this does not
 * translate the whole plugin, only these few strings.
 *
 * Used for: Wherever the plugin looks up one of these strings by name (see
 * i18n/catalog and utils/i18n).
 *
 * Solves: Keeping this as a fixed, typed list means asking for a string
 * that was never added is caught immediately, while writing the code,
 * instead of quietly showing nothing at all on screen.
 *
 * Does not: Hold the actual translated words — those live in a separate
 * table per language (i18n/catalog). This file only names which strings
 * exist to be translated.
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
