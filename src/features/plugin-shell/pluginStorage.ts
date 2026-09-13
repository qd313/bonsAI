/**
 * Title: Plugin shell local storage
 * Purpose: Read and write the browser-storage values the plugin shell keeps between sessions.
 * Used for: index.tsx — unified input text, Ollama host, plugin-help dismissal, and tab resume.
 * Solves: Keeps localStorage access and its try/catch guards out of the shell component.
 * Does not: Own any setting — `tab_resume_mode` lives in settings.json; this file only mirrors it
 *   so the opening tab can be resolved before load_settings answers.
 */
import {
  ACTIVE_CHAT_SLOT_STORAGE_KEY,
  IP_DEFAULT,
  IP_STORAGE_KEY,
  LAST_TAB_AT_STORAGE_KEY,
  LAST_TAB_STORAGE_KEY,
  PLUGIN_HELP_DISMISSED_STORAGE_KEY,
  TAB_RESUME_MODE_STORAGE_KEY,
  UNIFIED_INPUT_STORAGE_KEY,
} from "../../data/storageKeys";
import {
  DEFAULT_TAB_RESUME_MODE,
  TAB_RESUME_MODE_OPTIONS,
  TAB_RESUME_RECENT_WINDOW_MS,
  type TabResumeMode,
} from "../../data/bonsaiSettingsSchema";

/** Load persisted unified input text based on the selected persistence mode. */
export function loadSavedSearchQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(UNIFIED_INPUT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Persist or clear unified input text according to current persistence preference. */
export function persistSearchQuery(unifiedInputText: string): void {
  if (typeof window === "undefined") return;
  try {
    if (unifiedInputText) {
      window.localStorage.setItem(UNIFIED_INPUT_STORAGE_KEY, unifiedInputText);
    } else {
      window.localStorage.removeItem(UNIFIED_INPUT_STORAGE_KEY);
    }
  } catch {}
}

/** Load saved Ollama host/IP for convenience between plugin sessions. */
export function loadSavedIp(): string {
  if (typeof window === "undefined") return IP_DEFAULT;
  try {
    return window.localStorage.getItem(IP_STORAGE_KEY) || IP_DEFAULT;
  } catch {
    return IP_DEFAULT;
  }
}

/** Persist Ollama host/IP updates from the connection field. */
export function saveIp(ip: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IP_STORAGE_KEY, ip);
  } catch {}
}

/**
 * Load the tab to open on, per D15 option B — reopening resumes where you left off.
 * Returns null when nothing is stored, so the caller keeps its own default.
 */
export function loadLastTab(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_TAB_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

/** Which saved chat the session was in, or null when there is none. See the key's own comment. */
export function loadActiveChatSlotId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_CHAT_SLOT_STORAGE_KEY);
    const id = (raw ?? "").trim();
    return id || null;
  } catch {
    return null;
  }
}

/**
 * Record the active saved chat, or clear it when `id` is null.
 *
 * Clearing on null is load-bearing, not tidiness: *Clear cache* detaches the slot by calling
 * `setActiveSlot(null)`, and the whole D32 fix rests on there being nothing left to restore
 * afterwards. If this only ever wrote ids, the next reopen would read a stale pointer and refill
 * the thread the user had just cleared.
 */
export function saveActiveChatSlotId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const next = (id ?? "").trim();
    if (next) window.localStorage.setItem(ACTIVE_CHAT_SLOT_STORAGE_KEY, next);
    else window.localStorage.removeItem(ACTIVE_CHAT_SLOT_STORAGE_KEY);
  } catch {}
}

/**
 * Remember the active tab so the next open resumes there. Called on every tab change.
 *
 * Stamps the time alongside it because D15 option C expires the resume; written unconditionally
 * rather than only in that mode, so switching modes takes effect on the next open instead of
 * waiting for one more tab change to lay down a timestamp.
 */
export function saveLastTab(tabId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (tabId && tabId.trim()) {
      window.localStorage.setItem(LAST_TAB_STORAGE_KEY, tabId.trim());
      window.localStorage.setItem(LAST_TAB_AT_STORAGE_KEY, String(Date.now()));
    } else {
      window.localStorage.removeItem(LAST_TAB_STORAGE_KEY);
      window.localStorage.removeItem(LAST_TAB_AT_STORAGE_KEY);
    }
  } catch {}
}

/** Epoch ms `saveLastTab` last ran, or null when absent or unparseable. */
function loadLastTabSavedAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_TAB_AT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Read the mirrored `tab_resume_mode` setting. Falls back to the locked D15 default, so a first
 * open — or one where the mirror was wiped with the rest of plugin data — behaves as option B.
 */
export function loadTabResumeMode(): TabResumeMode {
  if (typeof window === "undefined") return DEFAULT_TAB_RESUME_MODE;
  try {
    const raw = window.localStorage.getItem(TAB_RESUME_MODE_STORAGE_KEY)?.trim() ?? "";
    return (TAB_RESUME_MODE_OPTIONS as string[]).includes(raw)
      ? (raw as TabResumeMode)
      : DEFAULT_TAB_RESUME_MODE;
  } catch {
    return DEFAULT_TAB_RESUME_MODE;
  }
}

/** Update the synchronous mirror. Called by `usePluginSettings` whenever the setting changes. */
export function saveTabResumeMode(mode: TabResumeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TAB_RESUME_MODE_STORAGE_KEY, mode);
  } catch {}
}

/**
 * The tab a reopen should land on, per the selected D15 option:
 *
 * - `always_main` (A) — ignore the stored tab entirely.
 * - `resume` (B) — resume it, however long ago you were there.
 * - `resume_recent` (C) — resume it only within `TAB_RESUME_RECENT_WINDOW_MS`.
 *
 * A missing timestamp under C counts as expired: the only way to get one is a tab written by an
 * older build, and treating an unknown age as stale keeps the fallback the predictable tab.
 */
export function resolveResumeTab(fallbackTab: string): string {
  const mode = loadTabResumeMode();
  if (mode === "always_main") return fallbackTab;
  const tab = loadLastTab();
  if (!tab) return fallbackTab;
  if (mode === "resume_recent") {
    const savedAt = loadLastTabSavedAt();
    if (savedAt == null) return fallbackTab;
    if (Date.now() - savedAt > TAB_RESUME_RECENT_WINDOW_MS) return fallbackTab;
  }
  return tab;
}

export function pluginHelpDismissedFromStorage(): boolean {
  try {
    return window.localStorage.getItem(PLUGIN_HELP_DISMISSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPluginHelpDismissedPersist(): void {
  try {
    window.localStorage.setItem(PLUGIN_HELP_DISMISSED_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
