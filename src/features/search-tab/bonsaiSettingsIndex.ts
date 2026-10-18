/**
 * Title: The index of bonsAI's own settings
 *
 * Purpose: One plain table of the settings a player can change in bonsAI itself, so the Search tab can find
 * them the way it finds Steam's: typing "mic" lists Voice input, "spoiler" lists Story spoilers, "text size"
 * lists Text size. Each entry says what the setting is called as drawn, a few other words a person might type
 * for it, and where it lives: the tab, the folded section on it and the row inside that section (plan 96,
 * lane N2; the maintainer's call of 2026-10-17). Every row of the Settings, Ollama and Permissions tabs a
 * person can change has an entry.
 *
 * Used for: SearchTab.tsx (the "bonsAI settings" group) and bonsaiSettingJump.ts (where A goes).
 *
 * Solves: bonsAI's settings had no index: section names are in the two fold tables, row names are inline in the
 * tabs, and permission names are in permissionDeepLink.ts. The test beside this file checks every entry's tab
 * and section against those tables, so a renamed or removed section fails a test instead of sending A nowhere.
 *
 * Does not: Search Steam's settings (settingsDatabase.ts and searchModel.ts do), switch tabs or move the ring
 * (bonsaiSettingJump.ts), or draw anything.
 */
import { SETTINGS_SEARCH_MIN_QUERY_LENGTH } from "../../shared/constants";
import { OLLAMA_SECTIONS } from "../ai-connection/ollamaTabFolds";
import { SETTINGS_SECTIONS } from "../settings/settingsTabFolds";

/** The tabs the index points into: the two folded ones, and Permissions (not folded). */
export type BonsaiSettingTab = "settings" | "ollama" | "permissions";

export type BonsaiSettingEntry = {
  /** The setting's name as the tab draws it. */
  label: string;
  /** Other words a person might type for it, in lower case. A typed word matches when it is inside the label or inside one of these. */
  words: readonly string[];
  tab: BonsaiSettingTab;
  /** The folded section's id in that tab's fold table; null on Permissions, which has no sections. */
  section: string | null;
  /**
   * The row inside the section. A row whose control registers itself with bonsaiSettingRowNav (bonsaiSettingJump.ts)
   * gets the ring; any other row gets it on its section's line. On Permissions this is the switch's focus id.
   */
  row: string;
};

const TAB_NAME: Record<BonsaiSettingTab, string> = { settings: "Settings", ollama: "Ollama", permissions: "Permissions" };

/** In the order a person meets them: the Settings tab top to bottom, then Ollama, then Permissions. */
export const BONSAI_SETTINGS_INDEX: readonly BonsaiSettingEntry[] = [
  { label: "Screenshot quality", words: ["screenshot", "screenshots", "picture", "image", "vision", "detail", "save memory", "balanced"], tab: "settings", section: "screenshot", row: "screenshot-quality" },
  { label: "Text size", words: ["text", "font", "bigger", "smaller", "large", "small", "zoom", "readable"], tab: "settings", section: "textsize", row: "text-size" },
  { label: "Remember what I typed", words: ["remember", "typed", "draft", "question box", "keep", "forget"], tab: "settings", section: "remember", row: "remember-typed" },
  { label: "Story spoilers", words: ["spoiler", "spoilers", "story", "strategy mode", "hide", "mask", "reveal", "hide spoilers until i tap"], tab: "settings", section: "spoilers", row: "story-spoilers" },
  { label: "Suggestion chips", words: ["chip", "chips", "suggestion", "suggestions", "show one chip instead of two"], tab: "settings", section: "chips", row: "suggestion-chips" },
  { label: "Voice input", words: ["mic", "microphone", "voice", "speech", "speak", "talk", "dictate", "whisper", "stt", "transcribe", "voice engine"], tab: "settings", section: "voiceinput", row: "stt-model" },
  { label: "AI voice & personality", words: ["character", "personality", "persona", "tone", "voice"], tab: "settings", section: "character", row: "ai-personality" },
  { label: "Character", words: ["character", "persona", "picker", "preset", "random", "custom"], tab: "settings", section: "character", row: "character-picker" },
  { label: "Accent intensity", words: ["accent", "intensity", "personality", "strength"], tab: "settings", section: "character", row: "accent-intensity" },
  { label: "Show Developer tab", words: ["developer", "dev", "logs", "advanced", "export", "tuning"], tab: "settings", section: "data", row: "developer-tab" },
  { label: "Clear cache", words: ["clear", "cache", "session", "reset session"], tab: "settings", section: "data", row: "clear-data" },
  { label: "Clear all data", words: ["clear", "wipe", "reset", "delete", "erase", "fresh install", "factory"], tab: "settings", section: "data", row: "clear-data" },

  { label: "Run AI on this Deck", words: ["ollama", "local", "on-device", "offline", "host", "run ai", "this deck"], tab: "ollama", section: "where", row: "run-on-deck" },
  { label: "Start the AI with the Deck", words: ["autostart", "startup", "boot", "launch", "start the ai", "ollama"], tab: "ollama", section: "where", row: "autostart" },
  { label: "Install Ollama", words: ["install", "update", "setup", "set up", "engine", "update ai", "ollama"], tab: "ollama", section: "where", row: "install-ollama" },
  { label: "Test connection to Ollama", words: ["test", "connection", "reachable", "ping", "ollama"], tab: "ollama", section: "where", row: "test-connection" },
  { label: "Find Ollama on your network", words: ["find", "lan", "network", "mdns", "discover", "address", "host", "home pc", "wifi", "ollama"], tab: "ollama", section: "where", row: "find-on-lan" },
  { label: "Use local knowledge base", words: ["knowledge", "library", "offline", "cards", "retrieval", "hybrid", "meaning search", "grounding"], tab: "ollama", section: "kb", row: "use-kb" },
  { label: "Reply style", words: ["reply", "style", "terse", "verbose", "balanced", "detailed", "caveman", "short", "length", "wordy"], tab: "ollama", section: "reply", row: "reply-style" },
  { label: "Thinking", words: ["think", "effort", "reasoning", "reason"], tab: "ollama", section: "reply", row: "thinking" },
  { label: "Custom timeouts", words: ["timeout", "timeouts", "slow", "warning", "abort", "patience"], tab: "ollama", section: "tuning", row: "custom-timeouts" },
  { label: "Keep models loaded", words: ["keep alive", "keep-alive", "memory", "vram", "unload", "loaded"], tab: "ollama", section: "tuning", row: "keep-alive" },
  { label: "AI models", words: ["model", "models", "pull", "download", "browse", "qwen", "llama", "ollama"], tab: "ollama", section: "models", row: "ai-models" },

  { label: "Read game & screenshot context", words: ["context", "screenshot", "screenshots", "logs", "proton", "read game", "permission", "media"], tab: "permissions", section: null, row: "game_context_read" },
  { label: "Save files to Desktop", words: ["save", "files", "desktop", "export", "write", "permission"], tab: "permissions", section: null, row: "filesystem_write" },
  { label: "Voice input (microphone)", words: ["mic", "microphone", "voice", "speech", "permission"], tab: "permissions", section: null, row: "microphone_access" },
  { label: "Internet downloads", words: ["internet", "download", "downloads", "online", "permission"], tab: "permissions", section: null, row: "internet_downloads" },
];

/**
 * The entries a typed word finds: the word (two letters at least, the same rule as Steam's) is inside the label or
 * inside one of the entry's words, in any case. In the table's order.
 */
export function matchBonsaiSettings(word: string): BonsaiSettingEntry[] {
  const needle = word.trim().toLowerCase();
  if (needle.length < SETTINGS_SEARCH_MIN_QUERY_LENGTH) return [];
  return BONSAI_SETTINGS_INDEX.filter((e) => e.label.toLowerCase().includes(needle) || e.words.some((w) => w.includes(needle)));
}

/** The folded sections of a tab, in order: what the fold store keys a tab's open set by. */
export function bonsaiSectionIds(tab: BonsaiSettingTab): string[] {
  if (tab === "settings") return SETTINGS_SECTIONS.map((s) => s.id);
  if (tab === "ollama") return OLLAMA_SECTIONS.map((s) => s.id);
  return [];
}

/** Where the setting lives, as the line under its result: "bonsAI Settings > Voice input", or "bonsAI Permissions". */
export function bonsaiSettingCrumb(entry: BonsaiSettingEntry): string {
  const tab = `bonsAI ${TAB_NAME[entry.tab]}`;
  const sections: ReadonlyArray<{ id: string; title: string }> =
    entry.tab === "settings" ? SETTINGS_SECTIONS : entry.tab === "ollama" ? OLLAMA_SECTIONS : [];
  const title = sections.find((s) => s.id === entry.section)?.title;
  return title ? `${tab} > ${title}` : tab;
}
