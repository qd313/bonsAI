/**
 * Title: UI string catalog
 * Purpose: Per-language UI string tables with English defaults and partial translation fallback.
 * Used for: utils/i18n lookupUiString and useReplyLanguage localized toasts/labels.
 * Solves: Missing per-key fallback to English without failing the whole locale bundle.
 * Does not: Detect Steam client language — backend get_reply_language_snapshot owns effective lang.
 */
import type { UiStringKey } from "./keys";

type UiStringCatalog = Partial<Record<UiStringKey, string>>;

const EN: Record<UiStringKey, string> = {
  "ask.starting": "Starting…",
  "ask.working": "Working on your question…",
  "toast.permissionRequired.title": "Permission required",
  "toast.permissionRequired.body": "Enable External and Steam navigation in the Permissions tab.",
  "toast.voiceInputError.title": "Voice input error",
  "toast.sessionCleared.title": "Session cleared",
  "toast.sessionCleared.body": "Chat history on this tab was reset.",
  "toast.clearFailed.title": "Clear failed",
  "about.replyLanguage.sectionTitle": "Reply language",
  "about.replyLanguage.dropdownLabel": "Language",
  "about.replyLanguage.hint":
    "Plugin UI may stay partly English. Ask replies and translated strings follow this language.",
  "about.replyLanguage.systemDetected": "Steam client language: {name}",
};

/** Partial translations — missing keys fall back to English per string. */
const JA: UiStringCatalog = {
  "ask.starting": "開始中…",
  "ask.working": "質問を処理しています…",
  "toast.permissionRequired.title": "権限が必要です",
  "toast.permissionRequired.body": "Permissions タブで外部・Steam ナビゲーションを有効にしてください。",
  "toast.voiceInputError.title": "音声入力エラー",
  "toast.sessionCleared.title": "セッションをクリアしました",
  "toast.sessionCleared.body": "このタブのチャット履歴をリセットしました。",
  "toast.clearFailed.title": "クリアに失敗しました",
  "about.replyLanguage.sectionTitle": "返信言語",
  "about.replyLanguage.dropdownLabel": "言語",
  "about.replyLanguage.hint":
    "プラグイン UI は一部英語のままの場合があります。Ask の返信と翻訳済み文字列はこの言語に従います。",
  "about.replyLanguage.systemDetected": "Steam クライアント言語: {name}",
};

const DE: UiStringCatalog = {
  "ask.starting": "Startet…",
  "ask.working": "Deine Frage wird bearbeitet…",
  "toast.permissionRequired.title": "Berechtigung erforderlich",
  "toast.permissionRequired.body":
    "Aktiviere externe und Steam-Navigation auf der Registerkarte Berechtigungen.",
  "toast.voiceInputError.title": "Spracheingabe-Fehler",
  "toast.sessionCleared.title": "Sitzung gelöscht",
  "toast.sessionCleared.body": "Der Chatverlauf auf diesem Tab wurde zurückgesetzt.",
  "toast.clearFailed.title": "Löschen fehlgeschlagen",
  "about.replyLanguage.sectionTitle": "Antwortsprache",
  "about.replyLanguage.dropdownLabel": "Sprache",
  "about.replyLanguage.hint":
    "Die Plugin-Oberfläche kann teilweise auf Englisch bleiben. Ask-Antworten und übersetzte Texte folgen dieser Sprache.",
  "about.replyLanguage.systemDetected": "Steam-Client-Sprache: {name}",
};

const UI_STRING_CATALOG: Record<string, UiStringCatalog> = {
  english: EN,
  japanese: JA,
  german: DE,
};

export function englishUiString(key: UiStringKey): string {
  return EN[key];
}

function catalogLangForCode(code: string): string {
  const c = (code || "english").trim().toLowerCase();
  if (c in UI_STRING_CATALOG) return c;
  return "english";
}

export type UiStringVars = Record<string, string | number>;

function formatUiString(template: string, vars?: UiStringVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const v = vars[name];
    return v == null ? "" : String(v);
  });
}

export function lookupUiString(
  key: UiStringKey,
  langCode: string,
  vars?: UiStringVars,
): string {
  const catalogKey = catalogLangForCode(langCode);
  const localized = UI_STRING_CATALOG[catalogKey]?.[key];
  const base = localized ?? EN[key];
  return formatUiString(base, vars);
}
