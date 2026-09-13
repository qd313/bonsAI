/**
 * Title: Reply language options
 * Purpose: Steam language codes, reply-language override ids, and dropdown builder helpers.
 * Used for: AboutReplyLanguageSection, i18n effective-lang resolution, and settings persistence.
 * Solves: Canonical locale list with follow-system and always-English special cases.
 * Does not: Translate plugin UI strings — see i18n keys and steamLanguages re-export barrel.
 */
export const REPLY_LANGUAGE_FOLLOW_SYSTEM = "follow_system" as const;
export const REPLY_LANGUAGE_ALWAYS_ENGLISH = "en" as const;
export const DEFAULT_REPLY_LANGUAGE = REPLY_LANGUAGE_FOLLOW_SYSTEM;

type ReplyLanguageSpecialId = typeof REPLY_LANGUAGE_FOLLOW_SYSTEM | typeof REPLY_LANGUAGE_ALWAYS_ENGLISH;

/** Steam client ``config.vdf`` language codes (canonical lowercase). */
export const STEAM_LANGUAGE_CODES = [
  "english",
  "french",
  "german",
  "italian",
  "korean",
  "spanish",
  "schinese",
  "tchinese",
  "russian",
  "thai",
  "japanese",
  "portuguese",
  "polish",
  "danish",
  "dutch",
  "finnish",
  "norwegian",
  "swedish",
  "hungarian",
  "czech",
  "romanian",
  "turkish",
  "arabic",
  "brazilian",
  "bulgarian",
  "greek",
  "ukrainian",
  "latam",
  "vietnamese",
  "indonesian",
] as const;

export type SteamLanguageCode = (typeof STEAM_LANGUAGE_CODES)[number];

export type ReplyLanguageId = ReplyLanguageSpecialId | SteamLanguageCode;

const steamSet = new Set<string>(STEAM_LANGUAGE_CODES);

/** English UI labels for Steam languages (dropdown + debug). */
export const STEAM_LANGUAGE_LABELS: Record<SteamLanguageCode, string> = {
  english: "English",
  french: "French",
  german: "German",
  italian: "Italian",
  korean: "Korean",
  spanish: "Spanish",
  schinese: "Simplified Chinese",
  tchinese: "Traditional Chinese",
  russian: "Russian",
  thai: "Thai",
  japanese: "Japanese",
  portuguese: "Portuguese",
  polish: "Polish",
  danish: "Danish",
  dutch: "Dutch",
  finnish: "Finnish",
  norwegian: "Norwegian",
  swedish: "Swedish",
  hungarian: "Hungarian",
  czech: "Czech",
  romanian: "Romanian",
  turkish: "Turkish",
  arabic: "Arabic",
  brazilian: "Brazilian Portuguese",
  bulgarian: "Bulgarian",
  greek: "Greek",
  ukrainian: "Ukrainian",
  latam: "Latin American Spanish",
  vietnamese: "Vietnamese",
  indonesian: "Indonesian",
};

function isSteamLanguageCode(value: string): value is SteamLanguageCode {
  return steamSet.has(value);
}

export function normalizeReplyLanguage(value: unknown): ReplyLanguageId {
  if (typeof value !== "string") return DEFAULT_REPLY_LANGUAGE;
  const raw = value.trim().toLowerCase();
  if (!raw) return DEFAULT_REPLY_LANGUAGE;
  if (raw === REPLY_LANGUAGE_FOLLOW_SYSTEM || raw === "follow-system" || raw === "system") {
    return REPLY_LANGUAGE_FOLLOW_SYSTEM;
  }
  if (raw === REPLY_LANGUAGE_ALWAYS_ENGLISH || raw === "english") {
    return REPLY_LANGUAGE_ALWAYS_ENGLISH;
  }
  if (isSteamLanguageCode(raw)) return raw;
  return DEFAULT_REPLY_LANGUAGE;
}

export function replyLanguageLabel(id: ReplyLanguageId): string {
  if (id === REPLY_LANGUAGE_FOLLOW_SYSTEM) return "Follow system";
  if (id === REPLY_LANGUAGE_ALWAYS_ENGLISH) return "Always English";
  return STEAM_LANGUAGE_LABELS[id];
}

export type ReplyLanguageDropdownOption = {
  label: string;
  data: ReplyLanguageId;
};

/** Dropdown options: Follow system, Always English, then Steam languages A–Z by label. */
export function buildReplyLanguageDropdownOptions(): ReplyLanguageDropdownOption[] {
  const specials: ReplyLanguageDropdownOption[] = [
    { label: "Follow system", data: REPLY_LANGUAGE_FOLLOW_SYSTEM },
    { label: "Always English", data: REPLY_LANGUAGE_ALWAYS_ENGLISH },
  ];
  const langs = STEAM_LANGUAGE_CODES.map((code) => ({
    label: STEAM_LANGUAGE_LABELS[code],
    data: code as ReplyLanguageId,
  }));
  langs.sort((a, b) => a.label.localeCompare(b.label));
  return [...specials, ...langs];
}

/** Map effective Steam language code (from backend) to catalog key for ``t()``. */
export function effectiveLangCatalogKey(effectiveCode: string): string {
  const code = (effectiveCode || "english").trim().toLowerCase();
  return isSteamLanguageCode(code) ? code : "english";
}
