import React, { useCallback, useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { definePlugin, toaster, call } from "@decky/api";
import {
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
  Button,
  Navigation,
  QuickAccessTab,
  Focusable,
  Router,
  showModal,
  ConfirmModal,
  Tabs,
} from "@decky/ui";
import {
  buildResponseText,
  DEFAULT_LATENCY_WARNING_SECONDS,
  DEFAULT_REQUEST_TIMEOUT_SECONDS,
  DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE,
  DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING,
  DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED,
  DEFAULT_INPUT_SANITIZER_USER_DISABLED,
  DEFAULT_SCREENSHOT_MAX_DIMENSION,
  DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE,
  DEFAULT_CAPABILITIES,
  DEFAULT_AI_CHARACTER_CUSTOM_TEXT,
  DEFAULT_AI_CHARACTER_ENABLED,
  DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
  DEFAULT_ASK_MODE,
  DEFAULT_AI_CHARACTER_PRESET_ID,
  DEFAULT_AI_CHARACTER_RANDOM,
  normalizeAiCharacterCustomText,
  normalizeAiCharacterPresetId,
  normalizeSettings,
  normalizeLatencyWarningSeconds,
  normalizeRequestTimeoutSeconds,
  SCREENSHOT_DIMENSION_OPTIONS,
  type BonsaiCapabilities,
  type AskModeId,
  type BonsaiSettings,
  type ScreenshotMaxDimension,
  type UnifiedInputPersistenceMode,
} from "./utils/settingsAndResponse";
import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "./data/aiCharacterAccentIntensity";
import { AboutTab } from "./components/AboutTab";
import { CharacterPickerModal } from "./components/CharacterPickerModal";
import { DesktopNoteSaveModal } from "./components/DesktopNoteSaveModal";
import { DebugTab } from "./components/DebugTab";
import { ConnectionTimeoutSlider } from "./components/ConnectionTimeoutSlider";
import { MainTab } from "./components/MainTab";
import { PermissionsTab } from "./components/PermissionsTab";
import { getSteamInputLexiconEntry } from "./data/steam-input-lexicon";
import { jumpToSteamInputEntry } from "./utils/steamInputJump";
import type { InputTransparencyRpcResult, TransparencySnapshot } from "./utils/inputTransparency";
import { formatAiCharacterSelectionLine, resolveMainTabAvatarPresetId } from "./data/characterCatalog";
import { detectPromptCategory, getContextualPresets, getRandomPresets, type PresetPrompt } from "./data/presets";
import {
  INPUT_SANITIZER_COMMAND_DISABLE,
  INPUT_SANITIZER_COMMAND_ENABLE,
} from "./data/inputSanitizerCommands";
import { BonsaiLogoIcon, BonsaiSvgIcon, BugIcon, GearIcon, LockIcon } from "./components/icons";
import { SETTINGS_DATABASE } from "./data/settingsDatabase";
import {
  ASK_LABEL_COLOR,
  ASK_LABEL_READY_COLOR,
  ASK_READY_STATE_TRANSITION_MS,
  SETTINGS_SEARCH_MIN_QUERY_LENGTH,
  TAB_TITLE_ICON_PX_BONSAI,
  TAB_TITLE_ICON_PX_DEBUG,
  TAB_TITLE_ICON_PX_PERMISSIONS,
  TAB_TITLE_ICON_PX_SETTINGS,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_LINE_HEIGHT,
} from "./features/unified-input/constants";
import { useUnifiedInputSurface } from "./features/unified-input/useUnifiedInputSurface";
import type { AppliedResult, AskAttachment, OllamaContextUi, ScreenshotItem } from "./types/bonsaiUi";

/**
 * If Decky unmounts plugin `Content` when `showModal` closes, React state resets to defaults; this
 * outlives the component so `useLayoutEffect` can restore the tab on the next mount.
 */
let __bonsaiTabRestoreAfterCharacterPicker: string | null = null;

/**
 * This boundary protects the plugin UI from render-time failures so Decky can keep the panel alive.
 * It captures component errors, logs diagnostics, and shows a recoverable fallback with reset controls.
 */
class ErrorBoundary extends React.Component<any, { error: any; info?: any }> {
  /** Initialize boundary state with no captured error. */
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  /** Capture runtime render errors and persist debug details for the fallback panel. */
  componentDidCatch(error: any, info: any) {
    this.setState({ error, info });
    try {
      console.error("React render error", error, info);
    } catch (e) {}
  }

  /** Render either the fallback UI or the child tree based on current boundary state. */
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "white" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Plugin error</div>
          <div style={{ color: "tomato", whiteSpace: "pre-wrap" }}>{String(this.state.error)}</div>
          <pre style={{ color: "gray", whiteSpace: "pre-wrap" }}>{this.state.info?.componentStack ?? ""}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

type SteamUrlApi = {
  ExecuteSteamURL(url: string): void;
};

const UNIFIED_INPUT_STORAGE_KEY = "bonsai:last-query";

type BackgroundStartResponse = {
  accepted?: boolean;
  status: "pending" | "busy" | "invalid" | "completed" | "blocked";
  request_id?: number | null;
  response?: string;
  app_id?: string;
  app_context?: string;
  success?: boolean;
  applied?: AppliedResult | null;
  elapsed_seconds?: number;
  /** When set, this start finished without Ollama (e.g. sanitizer keyword command). */
  meta?: string;
};

type BackgroundRequestStatus = {
  status: "idle" | "pending" | "completed" | "failed";
  request_id: number | null;
  question: string;
  app_id: string;
  app_context: "active" | "none";
  success: boolean | null;
  response: string;
  applied: AppliedResult | null;
  elapsed_seconds: number;
  error: string | null;
  started_at: number | null;
  completed_at: number | null;
};

type ConnectionStatus = {
  reachable: boolean;
  version?: string;
  models?: string[];
  error?: string;
};

type RecentScreenshotsResponse = {
  success: boolean;
  items: ScreenshotItem[];
  error?: string;
};

type AppendDesktopNoteResult = {
  success: boolean;
  path?: string;
  error?: string;
};

type AppendDesktopChatEventPayload = {
  event: "ask" | "response";
  question?: string;
  response_text?: string;
  screenshot_paths?: string[];
};

const AUTO_SAVED_RESPONSE_IDS_KEY = "bonsai:auto-desktop-chat-response-ids";

function loadAutosavedResponseIds(): number[] {
  try {
    const raw = sessionStorage.getItem(AUTO_SAVED_RESPONSE_IDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  } catch {
    return [];
  }
}

function markResponseAutosaved(requestId: number): void {
  try {
    const ids = loadAutosavedResponseIds();
    if (ids.includes(requestId)) return;
    ids.push(requestId);
    while (ids.length > 120) ids.shift();
    sessionStorage.setItem(AUTO_SAVED_RESPONSE_IDS_KEY, JSON.stringify(ids));
  } catch {}
}

function hasResponseAutosaved(requestId: number): boolean {
  return loadAutosavedResponseIds().includes(requestId);
}

type LastExchangeSnapshot = {
  question: string;
  answer: string;
};
const BACKGROUND_STATUS_POLL_MS = 1200;
const DECKY_RPC_TIMEOUT_MS = 15000;
const TEST_CONNECTION_TIMEOUT_SECONDS = 10;

async function callDeckyWithTimeout<Args extends unknown[], Result>(
  method: string,
  args: Args,
  timeoutMs: number = DECKY_RPC_TIMEOUT_MS
): Promise<Result> {
  const callPromise = call<Args, Result>(method, ...args);
  let timerId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = window.setTimeout(() => {
      reject(new Error(`RPC timeout after ${timeoutMs}ms: ${method}`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([callPromise, timeoutPromise]);
  } finally {
    if (typeof timerId === "number") window.clearTimeout(timerId);
  }
}

// Normalize inconsistent Decky RPC error payloads into user-facing message strings.
function formatDeckyRpcError(e: unknown): string {
  if (e instanceof Error) {
    const traceback = (e as Error & { traceback?: string }).traceback;
    const base = e.message || String(e);
    return traceback ? `${base}\n\n${traceback}` : base;
  }
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = [o.message, o.error].find((x) => typeof x === "string");
    const tb = typeof o.traceback === "string" ? o.traceback : "";
    if (typeof msg === "string") {
      return tb ? `${msg}\n\n${tb}` : msg;
    }
  }
  return String(e);
}

// Load persisted unified input text based on the selected persistence mode.
function loadSavedSearchQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(UNIFIED_INPUT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

// Persist or clear unified input text according to current persistence preference.
function persistSearchQuery(unifiedInputText: string): void {
  if (typeof window === "undefined") return;
  try {
    if (unifiedInputText) {
      window.localStorage.setItem(UNIFIED_INPUT_STORAGE_KEY, unifiedInputText);
    } else {
      window.localStorage.removeItem(UNIFIED_INPUT_STORAGE_KEY);
    }
  } catch {}
}

const IP_STORAGE_KEY = "bonsai:pc-ip";
const IP_DEFAULT = "192.168.1.";

// Load saved Ollama host/IP for convenience between plugin sessions.
function loadSavedIp(): string {
  if (typeof window === "undefined") return IP_DEFAULT;
  try {
    return window.localStorage.getItem(IP_STORAGE_KEY) || IP_DEFAULT;
  } catch { return IP_DEFAULT; }
}

// Persist Ollama host/IP updates from the connection field.
function saveIp(ip: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(IP_STORAGE_KEY, ip); } catch {}
}

// De-duplicate screenshot rows by path while preserving original ordering.
function dedupeScreenshotItems(items: ScreenshotItem[]): ScreenshotItem[] {
  const seen = new Set<string>();
  const deduped: ScreenshotItem[] = [];
  for (const item of items) {
    const key = `${item.path}|${item.mtime}|${item.size_bytes ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

const DISCLAIMER_STORAGE_KEY = "bonsai:disclaimer-accepted";
const GITHUB_ISSUES_URL = "https://github.com/cantcurecancer/bonsAI/issues";
const GITHUB_REPO_URL = GITHUB_ISSUES_URL.replace(/\/issues$/, "");
const OLLAMA_UPSTREAM_REPO_URL = "https://github.com/ollama/ollama";

// Check whether the one-time safety disclaimer has already been acknowledged.
function hasAcceptedDisclaimer(): boolean {
  try {
    return window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "1";
  } catch { return false; }
}

// Persist acknowledgement so the disclaimer does not reappear each session.
function markDisclaimerAccepted(): void {
  try { window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "1"); } catch {}
}

const SETTINGS_SECTION_URLS: Record<string, string> = {
  system: "steam://open/settings/system",
  security: "steam://open/settings/security",
  internet: "steam://open/settings/internet",
  notifications: "steam://open/settings/notifications",
  display: "steam://open/settings/display",
  power: "steam://open/settings/power",
  audio: "steam://open/settings/audio",
  bluetooth: "steam://open/settings/bluetooth",
  controller: "steam://open/settings/controller",
  keyboard: "steam://open/settings/keyboard",
  customization: "steam://open/settings/customization",
  accessibility: "steam://open/settings/accessibility",
  "friends & chat": "steam://open/settings/friends",
  downloads: "steam://open/settings/downloads",
  cloud: "steam://open/settings/cloud",
  "in game": "steam://open/settings/ingame",
  family: "steam://open/settings/family",
  "remote play": "steam://open/settings/remoteplay",
  storage: "steam://open/settings/storage",
  "game recording": "steam://open/settings/gamerecording",
  home: "steam://open/settings/home",
  library: "steam://open/settings/library",
  store: "steam://open/settings/store",
  developer: "steam://open/settings/developer",
};

// Identify QAM-only setting routes so navigation can use tab switching instead of URLs.
function isQamSetting(settingPath: string): boolean {
  return settingPath.startsWith("QAM >");
}

const QAM_SECTION_TABS: Record<string, QuickAccessTab> = {
  "quick settings": QuickAccessTab.Settings,
  performance: QuickAccessTab.Perf,
  help: QuickAccessTab.Help,
  soundtracks: QuickAccessTab.Music,
};

// Extract section grouping label from a normalized setting-path string.
function getSettingSection(settingPath: string): string {
  const parts = settingPath.split(">").map((part) => part.trim().toLowerCase());
  return parts[1] ?? "";
}

// Build Steam settings deep-link URLs from selected search result entries.
function getSteamSettingsUrl(settingPath: string): string {
  const category = getSettingSection(settingPath);
  return SETTINGS_SECTION_URLS[category] ?? "steam://open/settings";
}

// Map QAM search paths to the tab enum needed for Router navigation.
function getQamTab(settingPath: string): QuickAccessTab {
  const section = getSettingSection(settingPath);
  return QAM_SECTION_TABS[section] ?? QuickAccessTab.Settings;
}

/**
 * This hook manages frontend settings loading, normalization, and persistence updates.
 * It keeps RPC and fallback logic out of the main component render body.
 */
function usePluginSettings() {
  const [latencyWarningSeconds, setLatencyWarningSeconds] = useState<number>(
    normalizeLatencyWarningSeconds(DEFAULT_LATENCY_WARNING_SECONDS)
  );
  const [requestTimeoutSeconds, setRequestTimeoutSeconds] = useState<number>(
    normalizeRequestTimeoutSeconds(DEFAULT_REQUEST_TIMEOUT_SECONDS)
  );
  const [unifiedInputPersistenceMode, setUnifiedInputPersistenceMode] = useState<UnifiedInputPersistenceMode>(
    DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE
  );
  const [screenshotMaxDimension, setScreenshotMaxDimension] = useState<ScreenshotMaxDimension>(
    DEFAULT_SCREENSHOT_MAX_DIMENSION
  );
  const [desktopDebugNoteAutoSave, setDesktopDebugNoteAutoSave] = useState<boolean>(
    DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE
  );
  const [desktopAskVerboseLogging, setDesktopAskVerboseLogging] = useState<boolean>(
    DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING
  );
  const [presetChipFadeAnimationEnabled, setPresetChipFadeAnimationEnabled] = useState<boolean>(
    DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED
  );
  const [inputSanitizerUserDisabled, setInputSanitizerUserDisabled] = useState<boolean>(
    DEFAULT_INPUT_SANITIZER_USER_DISABLED
  );
  const [capabilities, setCapabilities] = useState<BonsaiCapabilities>(() => ({ ...DEFAULT_CAPABILITIES }));
  const [aiCharacterEnabled, setAiCharacterEnabled] = useState<boolean>(DEFAULT_AI_CHARACTER_ENABLED);
  const [aiCharacterRandom, setAiCharacterRandom] = useState<boolean>(DEFAULT_AI_CHARACTER_RANDOM);
  const [aiCharacterPresetId, setAiCharacterPresetId] = useState<string>(DEFAULT_AI_CHARACTER_PRESET_ID);
  const [aiCharacterCustomText, setAiCharacterCustomText] = useState<string>(DEFAULT_AI_CHARACTER_CUSTOM_TEXT);
  const [aiCharacterAccentIntensity, setAiCharacterAccentIntensity] = useState<AiCharacterAccentIntensityId>(
    DEFAULT_AI_CHARACTER_ACCENT_INTENSITY
  );
  const [askMode, setAskMode] = useState<AskModeId>(DEFAULT_ASK_MODE);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    call<[], BonsaiSettings>("load_settings")
      .then((saved) => {
        if (cancelled) return;
        const normalized = normalizeSettings(saved);
        setLatencyWarningSeconds(normalized.latency_warning_seconds);
        setRequestTimeoutSeconds(normalized.request_timeout_seconds);
        setUnifiedInputPersistenceMode(normalized.unified_input_persistence_mode);
        setScreenshotMaxDimension(normalized.screenshot_max_dimension);
        setDesktopDebugNoteAutoSave(normalized.desktop_debug_note_auto_save);
        setDesktopAskVerboseLogging(normalized.desktop_ask_verbose_logging);
        setPresetChipFadeAnimationEnabled(normalized.preset_chip_fade_animation_enabled);
        setInputSanitizerUserDisabled(normalized.input_sanitizer_user_disabled);
        setCapabilities(normalized.capabilities);
        setAiCharacterEnabled(normalized.ai_character_enabled);
        setAiCharacterRandom(normalized.ai_character_random);
        setAiCharacterPresetId(normalized.ai_character_preset_id);
        setAiCharacterCustomText(normalized.ai_character_custom_text);
        setAiCharacterAccentIntensity(normalized.ai_character_accent_intensity);
        setAskMode(normalized.ask_mode);
      })
      .catch(() => {
        if (cancelled) return;
        setLatencyWarningSeconds(DEFAULT_LATENCY_WARNING_SECONDS);
        setRequestTimeoutSeconds(DEFAULT_REQUEST_TIMEOUT_SECONDS);
        setUnifiedInputPersistenceMode(DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE);
        setScreenshotMaxDimension(DEFAULT_SCREENSHOT_MAX_DIMENSION);
        setDesktopDebugNoteAutoSave(DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE);
        setDesktopAskVerboseLogging(DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING);
        setPresetChipFadeAnimationEnabled(DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED);
        setInputSanitizerUserDisabled(DEFAULT_INPUT_SANITIZER_USER_DISABLED);
        setCapabilities(DEFAULT_CAPABILITIES);
        setAiCharacterEnabled(DEFAULT_AI_CHARACTER_ENABLED);
        setAiCharacterRandom(DEFAULT_AI_CHARACTER_RANDOM);
        setAiCharacterPresetId(DEFAULT_AI_CHARACTER_PRESET_ID);
        setAiCharacterCustomText(DEFAULT_AI_CHARACTER_CUSTOM_TEXT);
        setAiCharacterAccentIntensity(DEFAULT_AI_CHARACTER_ACCENT_INTENSITY);
        setAskMode(DEFAULT_ASK_MODE);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    const timer = setTimeout(() => {
      call<[BonsaiSettings], BonsaiSettings>("save_settings", {
        latency_warning_seconds: latencyWarningSeconds,
        request_timeout_seconds: requestTimeoutSeconds,
        unified_input_persistence_mode: unifiedInputPersistenceMode,
        screenshot_max_dimension: screenshotMaxDimension,
        desktop_debug_note_auto_save: desktopDebugNoteAutoSave,
        desktop_ask_verbose_logging: desktopAskVerboseLogging,
        preset_chip_fade_animation_enabled: presetChipFadeAnimationEnabled,
        input_sanitizer_user_disabled: inputSanitizerUserDisabled,
        capabilities,
        ai_character_enabled: aiCharacterEnabled,
        ai_character_random: aiCharacterRandom,
        ai_character_preset_id: aiCharacterPresetId,
        ai_character_custom_text: aiCharacterCustomText,
        ai_character_accent_intensity: aiCharacterAccentIntensity,
        ask_mode: askMode,
      }).catch((err) => {
        console.error("save_settings failed", err);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    latencyWarningSeconds,
    requestTimeoutSeconds,
    unifiedInputPersistenceMode,
    screenshotMaxDimension,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    capabilities,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    askMode,
    settingsLoaded,
  ]);

  return {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    unifiedInputPersistenceMode,
    screenshotMaxDimension,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    capabilities,
    setCapabilities,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    setAiCharacterEnabled,
    setAiCharacterRandom,
    setAiCharacterPresetId,
    setAiCharacterCustomText,
    setAiCharacterAccentIntensity,
    askMode,
    setAskMode,
    settingsLoaded,
    setLatencyWarningSeconds,
    setRequestTimeoutSeconds,
    setUnifiedInputPersistenceMode,
    setScreenshotMaxDimension,
    setDesktopDebugNoteAutoSave,
    setDesktopAskVerboseLogging,
    setPresetChipFadeAnimationEnabled,
    setInputSanitizerUserDisabled,
  };
}

/**
 * This hook runs background ask lifecycle actions, polling, and timeout warning behavior.
 * It provides a focused state API so the main component only handles presentation logic.
 */
function useBackgroundGameAi(
  applyBackgroundStatusToUi: (status: BackgroundRequestStatus, fallbackQuestion?: string) => void,
  onPollError: (error: unknown) => void
) {
  const askRequestSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const backgroundPollTimerRef = useRef<number | null>(null);

  const clearBackgroundPollTimer = useCallback(() => {
    if (backgroundPollTimerRef.current != null) {
      window.clearTimeout(backgroundPollTimerRef.current);
      backgroundPollTimerRef.current = null;
    }
  }, []);

  const isRequestActive = useCallback((seq: number) => {
    return isMountedRef.current && seq === askRequestSeqRef.current;
  }, []);

  const startNextRequest = useCallback(() => {
    askRequestSeqRef.current += 1;
    return askRequestSeqRef.current;
  }, []);

  const invalidateRequests = useCallback(() => {
    askRequestSeqRef.current += 1;
    clearBackgroundPollTimer();
  }, [clearBackgroundPollTimer]);

  const startBackgroundStatusPolling = useCallback((seq: number, fallbackQuestion: string = "") => {
    clearBackgroundPollTimer();

    const pollOnce = async () => {
      if (!isRequestActive(seq)) return;
      try {
        const status = await call<[], BackgroundRequestStatus>("get_background_game_ai_status");
        if (!isRequestActive(seq)) return;
        applyBackgroundStatusToUi(status, fallbackQuestion);

        if (status.status === "pending") {
          backgroundPollTimerRef.current = window.setTimeout(() => {
            void pollOnce();
          }, BACKGROUND_STATUS_POLL_MS);
        }
      } catch (e: unknown) {
        if (!isRequestActive(seq)) return;
        onPollError(e);
      }
    };

    void pollOnce();
  }, [applyBackgroundStatusToUi, clearBackgroundPollTimer, isRequestActive, onPollError]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      askRequestSeqRef.current += 1;
      clearBackgroundPollTimer();
    };
  }, [clearBackgroundPollTimer]);

  return {
    startNextRequest,
    invalidateRequests,
    startBackgroundStatusPolling,
    isRequestActive,
  };
}

/** Wraps icon tab titles so centering applies inside Steam's tab-button / carousel layout. */
function bonsaiTabIconTitle(
  classSuffix: "main" | "settings" | "permissions" | "debug",
  children: React.ReactNode,
): React.ReactElement {
  return (
    <div className={`bonsai-tab-title-shell bonsai-tab-title-shell--${classSuffix}`}>
      <span className={`bonsai-tab-title-icon bonsai-tab-title-icon--${classSuffix}`}>{children}</span>
    </div>
  );
}

/**
 * This component is the primary plugin UI composition shell for tabs, ask flow, and settings tooling.
 * It stitches together extracted hooks/data/modules while keeping behavior parity with prior releases.
 */
const Content: React.FC = () => {
  const [currentTab, setCurrentTab] = useState("main");
  /** Remember tab when opening character picker so we restore after `showModal` closes. */
  const characterPickerReturnTabRef = useRef<string>("main");
  /**
   * After closing the character picker from a non-main tab, Decky sometimes fires `onShowTab("main")`
   * when focus returns. While this ref is within `until`, treat that as spurious and keep `tab` instead.
   */
  const postPickerTabLockRef = useRef<{ until: number; tab: string } | null>(null);

  useLayoutEffect(() => {
    const pending = __bonsaiTabRestoreAfterCharacterPicker;
    if (pending != null) {
      __bonsaiTabRestoreAfterCharacterPicker = null;
      setCurrentTab(pending);
    }
  }, []);

  // --- Unified input/search state ---
  const [unifiedInput, setUnifiedInput] = useState(() => loadSavedSearchQuery());
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isUnifiedInputFocused, setIsUnifiedInputFocused] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState<string>("");
  const {
    bonsaiScopeRef,
    unifiedInputHostRef,
    unifiedInputFieldLayerRef,
    unifiedInputMeasureRef,
    askBarHostRef,
    unifiedInputSurfacePx,
    usesNativeMultilineField,
  } = useUnifiedInputSurface(currentTab, unifiedInput);

  // --- AI state ---
  const [ollamaIp, setOllamaIp] = useState(loadSavedIp());
  const [ollamaResponse, setOllamaResponse] = useState("");
  const [ollamaContext, setOllamaContext] = useState<OllamaContextUi>(null);
  const [lastExchange, setLastExchange] = useState<LastExchangeSnapshot | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [lastApplied, setLastApplied] = useState<AppliedResult | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<PresetPrompt[]>(() => getRandomPresets(3));
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [isScreenshotBrowserOpen, setIsScreenshotBrowserOpen] = useState(false);
  const [mediaError, setMediaError] = useState<string>("");
  const [recentScreenshots, setRecentScreenshots] = useState<ScreenshotItem[]>([]);
  const [isLoadingRecentScreenshots, setIsLoadingRecentScreenshots] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<AskAttachment | null>(null);
  const screenshotBrowserHostRef = useRef<HTMLDivElement>(null);
  const attachActionHostRef = useRef<HTMLDivElement>(null);
  /** Anchor for Deck nav: latency slider thumbs move down into screenshot max-dimension chips. */
  const screenshotDimensionNavRef = useRef<HTMLDivElement>(null);
  /** Anchor for Deck nav: hard-timeout thumb moves up into Ollama IP TextField (not soft-warning thumb). */
  const ollamaIpConnectionNavRef = useRef<HTMLDivElement>(null);
  /** Exposes soft-warning slider thumb for D-pad up from screenshot dimension row. */
  const latencyWarningThumbHostRef = useRef<HTMLDivElement>(null);

  // --- Debug state (lifted from former ErrorCaptureUI) ---
  const [capturedErrors, setCapturedErrors] = useState<string[]>([]);

  // --- Settings tab state ---
  const [deckIp, setDeckIp] = useState<string>("...");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    unifiedInputPersistenceMode,
    screenshotMaxDimension,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    capabilities,
    setCapabilities,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    setAiCharacterEnabled,
    setAiCharacterRandom,
    setAiCharacterPresetId,
    setAiCharacterCustomText,
    setAiCharacterAccentIntensity,
    setLatencyWarningSeconds,
    setRequestTimeoutSeconds,
    setUnifiedInputPersistenceMode,
    setScreenshotMaxDimension,
    setDesktopDebugNoteAutoSave,
    setDesktopAskVerboseLogging,
    setPresetChipFadeAnimationEnabled,
    setInputSanitizerUserDisabled,
    askMode,
    setAskMode,
  } = usePluginSettings();

  const desktopAutoSavePrefsRef = useRef({
    autoSave: DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE,
    fsWrite: false,
  });
  useEffect(() => {
    desktopAutoSavePrefsRef.current = {
      autoSave: desktopDebugNoteAutoSave,
      fsWrite: capabilities.filesystem_write,
    };
  }, [desktopDebugNoteAutoSave, capabilities.filesystem_write]);

  const goToPermissionsTab = useCallback(() => {
    setCurrentTab("permissions");
  }, []);

  // --- Global error capture (always active regardless of tab) ---
  useEffect(() => {
    const onErr = (e: any) => {
      const msg = e?.error?.stack ?? e?.error?.message ?? e?.message ?? String(e);
      setCapturedErrors((p) => [msg, ...p]);
      try {
        console.error("GLOBAL ERROR", e);
      } catch (err) {}
    };

    const onRejection = (e: any) => {
      const reason = e?.reason ?? e;
      const msg = reason?.stack ?? reason?.message ?? String(reason);
      setCapturedErrors((p) => ["(unhandledrejection) " + msg, ...p]);
      try {
        console.error("UNHANDLED REJECTION", e);
      } catch (err) {}
    };

    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // --- Fetch Deck IP on mount ---
  useEffect(() => {
    callDeckyWithTimeout<[], string>("get_deck_ip", [], DECKY_RPC_TIMEOUT_MS)
      .then((ip) => {
        setDeckIp(ip ?? "unknown");
      })
      .catch(() => {
        setDeckIp("unknown");
      });
  }, []);

  // --- Slow-response warning timer ---
  useEffect(() => {
    if (!isAsking) {
      setShowSlowWarning(false);
      return;
    }
    const timer = setTimeout(() => setShowSlowWarning(true), latencyWarningSeconds * 1000);
    return () => clearTimeout(timer);
  }, [isAsking, latencyWarningSeconds]);

  // --- Disclaimer modal on first open ---
  useEffect(() => {
    if (!hasAcceptedDisclaimer()) {
      showModal(
        <ConfirmModal
          strTitle="bonsAI - Beta Notice"
          strDescription={
            "Welcome to bonsAI!\n\n" +
            "This plugin is currently in beta. Some features may not work as expected, " +
            "and AI-generated recommendations \u2014 especially TDP and performance changes \u2014 " +
            "should be verified before relying on them.\n\n" +
            "bonsAI modifies system hardware settings based on AI suggestions. " +
            "Use at your own risk.\n\n" +
            "To report bugs or request features, visit:\n" +
            GITHUB_ISSUES_URL + "\n\n" +
            "By continuing, you acknowledge this is experimental software."
          }
          strOKButtonText="Got it"
          bAlertDialog={true}
          onOK={() => { markDisclaimerAccepted(); }}
        />
      );
    }
  }, []);


  const filteredSettings = useMemo(() => {
    const q = unifiedInput.trim();
    if (q.length < SETTINGS_SEARCH_MIN_QUERY_LENGTH) return [];
    const lower = q.toLowerCase();
    return SETTINGS_DATABASE.filter((setting) => setting.toLowerCase().includes(lower));
  }, [unifiedInput]);

  useEffect(() => {
    if (unifiedInputPersistenceMode === "persist_all") {
      persistSearchQuery(unifiedInput);
      return;
    }
    if (unifiedInputPersistenceMode === "persist_search_only") {
      if (filteredSettings.length > 0) {
        persistSearchQuery(unifiedInput);
      } else {
        persistSearchQuery("");
      }
      return;
    }
    persistSearchQuery("");
  }, [unifiedInput, unifiedInputPersistenceMode, filteredSettings.length]);

  useEffect(() => {
    if (unifiedInputPersistenceMode === "no_persist") {
      setUnifiedInput("");
    }
  }, [unifiedInputPersistenceMode]);

  const [lastTransparency, setLastTransparency] = useState<TransparencySnapshot | null>(null);

  const refreshInputTransparency = useCallback(async () => {
    try {
      const r = await callDeckyWithTimeout<[], InputTransparencyRpcResult>(
        "get_input_transparency",
        [],
        DECKY_RPC_TIMEOUT_MS
      );
      if (r.available && "snapshot" in r) {
        setLastTransparency(r.snapshot);
      } else {
        setLastTransparency(null);
      }
    } catch {
      setLastTransparency(null);
    }
  }, []);

  const applyBackgroundStatusToUi = useCallback((status: BackgroundRequestStatus, fallbackQuestion: string = "") => {
    const appId = status.app_id ?? "";
    const appContext = status.app_context === "active" ? "active" : "none";

    if (status.status === "pending") {
      setOllamaContext({ app_id: appId, app_context: appContext });
      setIsAsking(true);
      setOllamaResponse(status.response?.trim() ? status.response : "Thinking...");
      setLastApplied(null);
      setElapsedSeconds(null);
      return;
    }

    if (status.status === "completed" || status.status === "failed") {
      const applied = status.applied ?? null;
      setOllamaContext({ app_id: appId, app_context: appContext });
      setIsAsking(false);
      setOllamaResponse(buildResponseText(status.response ?? "No response text.", applied));
      setLastApplied(applied);
      setElapsedSeconds(Number.isFinite(status.elapsed_seconds) ? status.elapsed_seconds : null);

      if (status.status === "completed" && status.success) {
        const q = (status.question || fallbackQuestion || "").trim();
        const answer = buildResponseText(status.response ?? "No response text.", applied);
        if (q) {
          const category = detectPromptCategory(q);
          setSuggestedPrompts(getContextualPresets(category, 3));
          setLastExchange({ question: q, answer });

          const { autoSave, fsWrite } = desktopAutoSavePrefsRef.current;
          const rid = status.request_id;
          if (
            autoSave &&
            fsWrite &&
            rid != null &&
            typeof rid === "number" &&
            !hasResponseAutosaved(rid)
          ) {
            void callDeckyWithTimeout<[AppendDesktopChatEventPayload], AppendDesktopNoteResult>(
              "append_desktop_chat_event",
              [{ event: "response", response_text: answer, question: q }],
              DECKY_RPC_TIMEOUT_MS
            )
              .then((result) => {
                if (result.success) markResponseAutosaved(rid);
              })
              .catch(() => {});
          }
        } else {
          setLastExchange(null);
        }
      } else {
        setLastExchange(null);
      }
      void refreshInputTransparency();
      return;
    }

    setOllamaContext(null);
    setIsAsking(false);
  }, [refreshInputTransparency]);

  const onBackgroundPollError = useCallback((e: unknown) => {
    setIsAsking(false);
    setOllamaResponse(`Error: ${formatDeckyRpcError(e)}`);
    setLastApplied(null);
    setOllamaContext(null);
    setLastExchange(null);
  }, []);

  const {
    startNextRequest,
    invalidateRequests,
    startBackgroundStatusPolling,
    isRequestActive,
  } = useBackgroundGameAi(applyBackgroundStatusToUi, onBackgroundPollError);

  useEffect(() => {
    const seq = startNextRequest();

    call<[], BackgroundRequestStatus>("get_background_game_ai_status")
      .then((status) => {
        if (!isRequestActive(seq)) return;
        applyBackgroundStatusToUi(status);
        if (status.status === "pending") {
          startBackgroundStatusPolling(seq, status.question ?? "");
        }
      })
      .catch(() => {
        // Best-effort restore only; keep startup quiet if backend status isn't available.
      });
  }, [applyBackgroundStatusToUi, isRequestActive, startBackgroundStatusPolling, startNextRequest]);

  const clearUnifiedInput = () => {
    if (isAsking) {
      invalidateRequests();
      setIsAsking(false);
    }
    setUnifiedInput("");
    setSelectedIndex(-1);
    setNavigationMessage("");
    setOllamaResponse("");
    setOllamaContext(null);
    setLastApplied(null);
    setLastExchange(null);
    setSelectedAttachment(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
  };

  const onSettingClick = (settingPath: string, index?: number) => {
    if (index !== undefined) setSelectedIndex(index);
    try {
      if (isQamSetting(settingPath)) {
        const qamTab = getQamTab(settingPath);
        Navigation.OpenQuickAccessMenu(qamTab);
        toaster.toast({ title: "Opening QAM", body: settingPath, duration: 2000 });
        setNavigationMessage(`Opened QAM: ${settingPath}`);
        return;
      }

      const steamUrlApi = SteamClient.URL as unknown as SteamUrlApi;
      const steamUrl = getSteamSettingsUrl(settingPath);
      steamUrlApi.ExecuteSteamURL(steamUrl);
      toaster.toast({ title: "Opening settings", body: settingPath, duration: 2000 });
      setNavigationMessage(`Opened: ${settingPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toaster.toast({ title: "Navigation failed", body: message, duration: 3000 });
      setNavigationMessage(`Navigation failed: ${message}`);
    }
  };

  const onCancelAsk = () => {
    invalidateRequests();
    setIsAsking(false);
    setOllamaResponse("Request cancelled.");
    setOllamaContext(null);
    setLastApplied(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
  };

  const onMicInput = () => {
    toaster.toast({ title: "Voice input", body: "Voice capture is not implemented yet.", duration: 1800 });
  };

  const loadRecentScreenshots = async (limit: number = 24) => {
    const runningApp = Router.MainRunningApp;
    const appId = runningApp?.appid?.toString() ?? "";
    setIsLoadingRecentScreenshots(true);
    setMediaError("");
    try {
      const response = await call<[string, number], RecentScreenshotsResponse>(
        "list_recent_screenshots",
        appId,
        limit
      );
      if (response.success) {
        const rawItems = response.items ?? [];
        const dedupedItems = dedupeScreenshotItems(rawItems);
        setRecentScreenshots(dedupedItems);
      } else {
        setRecentScreenshots([]);
        setMediaError(response.error ?? "Failed to list recent screenshots.");
      }
    } catch (e: unknown) {
      setRecentScreenshots([]);
      setMediaError(formatDeckyRpcError(e));
    } finally {
      setIsLoadingRecentScreenshots(false);
    }
  };

  const onOpenScreenshotBrowser = async () => {
    if (isAsking) return;
    if (!capabilities.media_library_access) {
      toaster.toast({
        title: "Permission required",
        body: "Enable Media library access in the Permissions tab to attach screenshots.",
        duration: 4500,
      });
      goToPermissionsTab();
      return;
    }
    setIsScreenshotBrowserOpen(true);
    setMediaError("");
    if (recentScreenshots.length === 0) {
      await loadRecentScreenshots(24);
    }
  };

  const onCloseScreenshotBrowser = () => {
    setIsScreenshotBrowserOpen(false);
    setMediaError("");
  };

  const onSelectRecentScreenshot = (item: ScreenshotItem) => {
    setSelectedAttachment({
      path: item.path,
      name: item.name,
      source: "recent",
      preview_data_uri: item.preview_data_uri,
      size_bytes: item.size_bytes,
      app_id: item.app_id,
    });
    setIsScreenshotBrowserOpen(false);
    setMediaError("");
    toaster.toast({ title: "Media attached", body: "Recent screenshot attached.", duration: 1800 });
  };

  const onAskOllama = async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise((r) => setTimeout(r, 50));

    const q = unifiedInput.trim();
    const ip = ollamaIp.trim();
    if (!q || !ip) return;
    const attachments = selectedAttachment
      ? [{
          path: selectedAttachment.path,
          name: selectedAttachment.name,
          source: selectedAttachment.source,
          app_id: selectedAttachment.app_id,
        }]
      : [];

    const seq = startNextRequest();

    const runningApp = Router.MainRunningApp;
    const appId = runningApp?.appid?.toString() ?? "";
    const appName = runningApp?.display_name ?? "";

    setIsAsking(true);
    setLastTransparency(null);
    setOllamaResponse("Thinking...");
    setLastApplied(null);
    setElapsedSeconds(null);
    setOllamaContext({
      app_id: appId,
      app_context: appId ? "active" : "none",
    });
    try {
      console.log(`[bonsAI] deck -> pc=${ip} game=${JSON.stringify(appName)}(${appId}) question=${JSON.stringify(q)}`);

      const data = await call<
        [{ question: string; PcIp: string; appId: string; appName: string; attachments: AskAttachment[] }],
        BackgroundStartResponse
      >("start_background_game_ai", { question: q, PcIp: ip, appId, appName, attachments, ask_mode: askMode });

      if (!isRequestActive(seq)) return;

      if (data.status === "invalid") {
        setIsAsking(false);
        setOllamaResponse(data.response ?? "Request is invalid.");
        setLastApplied(null);
        setElapsedSeconds(null);
        return;
      }

      if (data.status === "blocked") {
        setIsAsking(false);
        setOllamaResponse(data.response ?? "That input was not sent.");
        setLastApplied(null);
        setElapsedSeconds(null);
        setOllamaContext({ app_id: appId, app_context: appId ? "active" : "none" });
        void refreshInputTransparency();
        toaster.toast({
          title: "Input not sent",
          body: data.response ?? "Blocked by input checks.",
          duration: 5000,
        });
        return;
      }

      if (data.status === "completed" && data.success) {
        if (!isRequestActive(seq)) return;
        const now = Date.now() / 1000;
        const terminal: BackgroundRequestStatus = {
          status: "completed",
          request_id: data.request_id ?? null,
          question: "",
          app_id: data.app_id ?? appId,
          app_context: (appId ? "active" : "none") as "active" | "none",
          success: true,
          response: data.response ?? "",
          applied: data.applied ?? null,
          elapsed_seconds: Number.isFinite(data.elapsed_seconds) ? Number(data.elapsed_seconds) : 0,
          error: null,
          started_at: now,
          completed_at: now,
        };
        applyBackgroundStatusToUi(terminal, "");
        saveIp(ip);
        if (unifiedInputPersistenceMode === "persist_search_only") {
          persistSearchQuery("");
        }
        if (data.meta === "sanitizer_keyword") {
          const key = q.trim().toLowerCase();
          if (key === INPUT_SANITIZER_COMMAND_DISABLE.toLowerCase()) {
            setInputSanitizerUserDisabled(true);
          } else if (key === INPUT_SANITIZER_COMMAND_ENABLE.toLowerCase()) {
            setInputSanitizerUserDisabled(false);
          }
          toaster.toast({
            title: "Sanitizer",
            body: "Mode saved. See README for commands.",
            duration: 4000,
          });
        }
        return;
      }

      if (data.status === "busy") {
        setIsAsking(true);
        setOllamaResponse(data.response ?? "A request is already in progress.");
      }

      if (data.status === "pending" && desktopDebugNoteAutoSave && capabilities.filesystem_write) {
        const screenshotPaths = attachments.map((a) => a.path).filter((p) => p.trim().length > 0);
        void callDeckyWithTimeout<[AppendDesktopChatEventPayload], AppendDesktopNoteResult>(
          "append_desktop_chat_event",
          [{ event: "ask", question: q, screenshot_paths: screenshotPaths }],
          DECKY_RPC_TIMEOUT_MS
        ).catch(() => {});
      }

      saveIp(ip);
      if (unifiedInputPersistenceMode === "persist_search_only") {
        persistSearchQuery("");
      }
      startBackgroundStatusPolling(seq, q);
    } catch (e: unknown) {
      if (!isRequestActive(seq)) return;
      setIsAsking(false);
      setOllamaResponse(`Error: ${formatDeckyRpcError(e)}`);
      setLastApplied(null);
      setOllamaContext(null);
    }
  };

  const onTestConnection = async () => {
    const ip = ollamaIp.trim();
    if (!ip) return;
    setConnectionTesting(true);
    setConnectionStatus(null);
    try {
      const result = await callDeckyWithTimeout<[string, number], ConnectionStatus>(
        "test_ollama_connection",
        [ip, TEST_CONNECTION_TIMEOUT_SECONDS],
        TEST_CONNECTION_TIMEOUT_SECONDS * 1000 + 3000
      );
      setConnectionStatus(result);
      if (result.reachable) saveIp(ip);
    } catch (e: unknown) {
      setConnectionStatus({ reachable: false, error: formatDeckyRpcError(e) });
    } finally {
      setConnectionTesting(false);
    }
  };

  const persistenceModeLabel: Record<UnifiedInputPersistenceMode, string> = {
    persist_all: "Persist all text",
    persist_search_only: "Persist search-only",
    no_persist: "No persistence",
  };
  const persistenceModeShortLabel: Record<UnifiedInputPersistenceMode, string> = {
    persist_all: "All",
    persist_search_only: "Search",
    no_persist: "None",
  };
  const persistenceModeOptions: UnifiedInputPersistenceMode[] = [
    "persist_all",
    "persist_search_only",
    "no_persist",
  ];
  const persistenceModeDescription: Record<UnifiedInputPersistenceMode, string> = {
    persist_all: "Restore all unified input text, including AI prompts.",
    persist_search_only: "Restore only text that matches settings search results.",
    no_persist: "Never restore unified input text on reopen.",
  };
  const persistenceSettingsTooltip = [
    `All text — ${persistenceModeDescription.persist_all}`,
    `Search-only — ${persistenceModeDescription.persist_search_only}`,
    `None — ${persistenceModeDescription.no_persist}`,
  ].join(" ");
  const screenshotDimensionLabel: Record<ScreenshotMaxDimension, string> = {
    1280: "1280",
    1920: "1920",
    3160: "3160",
  };
  const focusScreenshotMaxDimensionFromSlider = useCallback((): boolean => {
    const root = screenshotDimensionNavRef.current;
    if (!root) return false;
    const btn = root.querySelector<HTMLElement>('button[aria-label^="Set screenshot max dimension"]');
    if (!btn) return false;
    btn.focus();
    return true;
  }, []);
  const focusOllamaIpFromTimeoutSlider = useCallback((): boolean => {
    const root = ollamaIpConnectionNavRef.current;
    if (!root) return false;
    const field = root.querySelector<HTMLElement>("input, textarea");
    if (!field) return false;
    field.focus();
    return true;
  }, []);
  const focusSoftWarningFromScreenshot = useCallback((): boolean => {
    const host = latencyWarningThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);
  const fullBleedRowStyle: React.CSSProperties = {
    width: "calc(100% + 24px)",
    marginLeft: -12,
    marginRight: -12,
    boxSizing: "border-box",
  };

  const presetButtonSurface: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.03)",
    color: "#93a3b0",
  };
  const showSearchClearButton = Boolean(unifiedInput.trim());

  const openDesktopNoteSaveModal = useCallback(() => {
    if (!capabilities.filesystem_write) {
      toaster.toast({
        title: "Permission required",
        body: "Enable Filesystem writes in the Permissions tab to save notes to Desktop.",
        duration: 4500,
      });
      goToPermissionsTab();
      return;
    }
    if (!lastExchange) {
      return;
    }
    const ex = lastExchange;
    const handle = showModal(
      <DesktopNoteSaveModal
        strDescriptionPrefix={
          "This appends to a file on your Steam Deck Desktop (not the PC running Ollama).\n\n" +
          "Folder: Desktop/BonsAI_notes/\n" +
          "Existing notes are never replaced; new entries are appended with a timestamp.\n\n" +
          "Proceed only if you want this question and answer saved there."
        }
        defaultStem="bonsai-debug"
        onCancel={() => handle.Close()}
        onConfirm={async (stem) => {
          if (!stem) {
            toaster.toast({ title: "Note name required", body: "Enter a name for the note file.", duration: 3200 });
            return;
          }
          try {
            const result = await call<[{ stem: string; question: string; response: string }], AppendDesktopNoteResult>(
              "append_desktop_debug_note",
              { stem, question: ex.question, response: ex.answer }
            );
            if (result.success) {
              toaster.toast({ title: "Note saved", body: result.path ?? "Saved.", duration: 3800 });
              handle.Close();
            } else {
              toaster.toast({ title: "Save failed", body: result.error ?? "Unknown error.", duration: 5000 });
            }
          } catch (e: unknown) {
            toaster.toast({ title: "Save failed", body: formatDeckyRpcError(e), duration: 5000 });
          }
        }}
      />
    );
  }, [lastExchange, capabilities.filesystem_write, goToPermissionsTab]);

  const armPostPickerTabLock = useCallback((back: string) => {
    if (back === "main") {
      postPickerTabLockRef.current = null;
      return;
    }
    postPickerTabLockRef.current = { until: Date.now() + 750, tab: back };
  }, []);

  const onTabsShowTab = useCallback((tabID: string) => {
    const lock = postPickerTabLockRef.current;
    const now = Date.now();
    if (lock && now < lock.until && tabID === "main" && lock.tab !== "main") {
      setCurrentTab(lock.tab);
      return;
    }
    if (lock && now < lock.until) {
      if (tabID === lock.tab) {
        postPickerTabLockRef.current = null;
      } else if (tabID !== "main") {
        // User chose another tab (e.g. debug); do not keep rewriting toward the old return tab.
        postPickerTabLockRef.current = null;
      }
    }
    if (lock && now >= lock.until) {
      postPickerTabLockRef.current = null;
    }
    setCurrentTab(tabID);
  }, []);

  const openCharacterPickerModal = useCallback(() => {
    characterPickerReturnTabRef.current = currentTab;
    const handle = showModal(
      <CharacterPickerModal
        initialDraft={{
          random: aiCharacterRandom,
          presetId: aiCharacterPresetId,
          customText: aiCharacterCustomText,
        }}
        onCancel={() => {
          const back = characterPickerReturnTabRef.current;
          __bonsaiTabRestoreAfterCharacterPicker = back;
          armPostPickerTabLock(back);
          setCurrentTab(back);
          handle.Close();
          // After modal teardown; immediate setState can lose to Decky’s tab reset (jumps to main).
          window.setTimeout(() => {
            setCurrentTab(back);
            __bonsaiTabRestoreAfterCharacterPicker = null;
          }, 80);
        }}
        onOK={(next) => {
          const pid = normalizeAiCharacterPresetId(next.presetId);
          const ctxt = normalizeAiCharacterCustomText(next.customText);
          setAiCharacterRandom(next.random);
          setAiCharacterPresetId(pid);
          setAiCharacterCustomText(ctxt);
          // Persist immediately so a debounced save scheduled before the modal cannot overwrite with stale random/character state.
          void call<[BonsaiSettings], BonsaiSettings>("save_settings", {
            latency_warning_seconds: latencyWarningSeconds,
            request_timeout_seconds: requestTimeoutSeconds,
            unified_input_persistence_mode: unifiedInputPersistenceMode,
            screenshot_max_dimension: screenshotMaxDimension,
            desktop_debug_note_auto_save: desktopDebugNoteAutoSave,
            desktop_ask_verbose_logging: desktopAskVerboseLogging,
            preset_chip_fade_animation_enabled: presetChipFadeAnimationEnabled,
            input_sanitizer_user_disabled: inputSanitizerUserDisabled,
            capabilities,
            ai_character_enabled: aiCharacterEnabled,
            ai_character_random: next.random,
            ai_character_preset_id: pid,
            ai_character_custom_text: ctxt,
            ai_character_accent_intensity: aiCharacterAccentIntensity,
            ask_mode: askMode,
          }).catch((err) => {
            console.error("save_settings failed (character picker OK)", err);
          });
          const back = characterPickerReturnTabRef.current;
          __bonsaiTabRestoreAfterCharacterPicker = back;
          armPostPickerTabLock(back);
          setCurrentTab(back);
          handle.Close();
          window.setTimeout(() => {
            setCurrentTab(back);
            __bonsaiTabRestoreAfterCharacterPicker = null;
          }, 80);
        }}
      />
    );
  }, [
    currentTab,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    aiCharacterEnabled,
    latencyWarningSeconds,
    requestTimeoutSeconds,
    unifiedInputPersistenceMode,
    screenshotMaxDimension,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    capabilities,
    setAiCharacterRandom,
    setAiCharacterPresetId,
    setAiCharacterCustomText,
    armPostPickerTabLock,
    askMode,
  ]);

  const mainTabAiCharacterPad = aiCharacterEnabled;
  const mainTabAvatarPresetId = aiCharacterEnabled
    ? resolveMainTabAvatarPresetId({
        enabled: aiCharacterEnabled,
        random: aiCharacterRandom,
        presetId: aiCharacterPresetId,
        customText: aiCharacterCustomText,
      })
    : null;

  const aiCharacterDebugLineForMainTab =
    typeof window !== "undefined" &&
    (window as unknown as { __BONSAI_DEBUG_AI_CHARACTER__?: boolean }).__BONSAI_DEBUG_AI_CHARACTER__
      ? [
          `avatar=${mainTabAvatarPresetId ?? "null"}`,
          `presetId="${aiCharacterPresetId}"`,
          `random=${String(aiCharacterRandom)}`,
          `line=${formatAiCharacterSelectionLine({
            random: aiCharacterRandom,
            presetId: aiCharacterPresetId,
            customText: aiCharacterCustomText,
          })}`,
          `accent=${aiCharacterAccentIntensity}`,
        ].join(" | ")
      : null;

  // =====================================================================
  // TAB CONTENT
  // =====================================================================

  const mainTab = (
    <MainTab
      key={JSON.stringify({
        t: "main",
        aiCharacterEnabled,
        aiCharacterRandom,
        aiCharacterPresetId,
        aiCharacterCustomText,
        aiCharacterAccentIntensity,
      })}
      fullBleedRowStyle={fullBleedRowStyle}
      presetButtonSurface={presetButtonSurface}
      suggestedPrompts={suggestedPrompts}
      presetChipFadeAnimationEnabled={presetChipFadeAnimationEnabled}
      setUnifiedInput={setUnifiedInput}
      unifiedInputHostRef={unifiedInputHostRef as React.Ref<HTMLDivElement>}
      unifiedInputFieldLayerRef={unifiedInputFieldLayerRef as React.Ref<HTMLDivElement>}
      unifiedInputMeasureRef={unifiedInputMeasureRef as React.Ref<HTMLDivElement>}
      attachActionHostRef={attachActionHostRef as React.Ref<HTMLDivElement>}
      askBarHostRef={askBarHostRef as React.Ref<HTMLDivElement>}
      screenshotBrowserHostRef={screenshotBrowserHostRef as React.Ref<HTMLDivElement>}
      unifiedInputSurfacePx={unifiedInputSurfacePx}
      unifiedInput={unifiedInput}
      usesNativeMultilineField={usesNativeMultilineField}
      setIsUnifiedInputFocused={setIsUnifiedInputFocused}
      isUnifiedInputFocused={isUnifiedInputFocused}
      setSelectedIndex={setSelectedIndex}
      filteredSettings={filteredSettings}
      selectedIndex={selectedIndex}
      onSettingClick={onSettingClick}
      isAsking={isAsking}
      ollamaIp={ollamaIp}
      onAskOllama={onAskOllama}
      onOpenScreenshotBrowser={onOpenScreenshotBrowser}
      onCancelAsk={onCancelAsk}
      onMicInput={onMicInput}
      selectedAttachment={selectedAttachment}
      setSelectedAttachment={setSelectedAttachment}
      clearUnifiedInput={clearUnifiedInput}
      showSearchClearButton={showSearchClearButton}
      isScreenshotBrowserOpen={isScreenshotBrowserOpen}
      onCloseScreenshotBrowser={onCloseScreenshotBrowser}
      loadRecentScreenshots={loadRecentScreenshots}
      mediaError={mediaError}
      recentScreenshots={recentScreenshots}
      isLoadingRecentScreenshots={isLoadingRecentScreenshots}
      onSelectRecentScreenshot={onSelectRecentScreenshot}
      navigationMessage={navigationMessage}
      isQamSetting={isQamSetting}
      showSlowWarning={showSlowWarning}
      latencyWarningSeconds={latencyWarningSeconds}
      ollamaResponse={ollamaResponse}
      elapsedSeconds={elapsedSeconds}
      lastApplied={lastApplied}
      ollamaContext={ollamaContext}
      canSaveDesktopNote={Boolean(lastExchange)}
      onOpenDesktopNoteSave={openDesktopNoteSaveModal}
      mediaLibraryEnabled={capabilities.media_library_access}
      desktopNoteSaveEnabled={capabilities.filesystem_write}
      aiCharacterPadClass={mainTabAiCharacterPad}
      aiCharacterAvatarPresetId={mainTabAvatarPresetId}
      onOpenCharacterPicker={aiCharacterEnabled ? openCharacterPickerModal : undefined}
      aiCharacterDebugLine={aiCharacterDebugLineForMainTab}
      transparencySnapshot={lastTransparency}
      onRunOriginalAsk={(text) => {
        setUnifiedInput(text);
        if (unifiedInputPersistenceMode === "persist_all") {
          persistSearchQuery(text);
        }
      }}
      askMode={askMode}
      onAskModeChange={setAskMode}
    />
  );

  const settingsTab = (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight">
    <PanelSection title="SETTINGS">
      <PanelSectionRow>
        <div
          ref={ollamaIpConnectionNavRef}
          className="bonsai-settings-connection-host"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <Focusable
            className="bonsai-settings-connection-row"
            flow-children="horizontal"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 8,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                flex: "0 1 172px",
                width: 172,
                maxWidth: "172px",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontVariant: "small-caps",
                  letterSpacing: "0.06em",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#b8c6d6",
                  marginBottom: 2,
                }}
              >
                OLLAMA IP ADDRESS
              </div>
              <TextField
                label=""
                value={ollamaIp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOllamaIp(e.target.value)}
                style={{ width: "100%", minWidth: 0, maxWidth: "100%" }}
              />
            </div>
            <Button
              onClick={onTestConnection}
              disabled={connectionTesting || !ollamaIp.trim()}
              style={{
                flex: "1 1 auto",
                alignSelf: "flex-end",
                marginBottom: 2,
                minHeight: 38,
                minWidth: 0,
                height: 38,
                maxWidth: 68,
                padding: "0 4px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                color: "#e8eef5",
              }}
              aria-label={connectionTesting ? "Testing Ollama connection" : "Test connection to Ollama"}
            >
              {connectionTesting ? "…" : "Test"}
            </Button>
          </Focusable>
          <div
            className="bonsai-prose"
            style={{
              fontSize: 10,
              color: "#6b7c90",
              lineHeight: 1.35,
              userSelect: "none",
              pointerEvents: "none",
            }}
            title="Network address of this Steam Deck (informational)"
            aria-live="polite"
          >
            {"This Deck's IP: "}
            <span style={{ color: "#8fa0b4", fontVariantNumeric: "tabular-nums" }}>{deckIp}</span>
          </div>
        </div>
      </PanelSectionRow>
      {connectionStatus && (
        <PanelSectionRow>
          {connectionStatus.reachable ? (
            <div style={{ fontSize: 12, color: "#81c784" }}>
              <div>Connected — Ollama v{connectionStatus.version}</div>
              {connectionStatus.models && connectionStatus.models.length > 0 && (
                <div className="bonsai-prose" style={{ color: "#9fb7d5", marginTop: 4 }}>
                  Models: {connectionStatus.models.join(", ")}
                </div>
              )}
            </div>
          ) : (
            <div className="bonsai-prose" style={{ fontSize: 12, color: "tomato" }}>
              Unreachable — {connectionStatus.error}
            </div>
          )}
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <div className="bonsai-prose-host" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "#d9d9d9", fontWeight: 600, marginBottom: 4 }}>
            Latency warning and backend timeout
          </div>
          <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.35 }}>
            Latency warning is how long an Ask may run before the UI flags the reply as slow. Backend timeout is the
            hard limit after which the plugin stops waiting and fails the request if Ollama has not finished.
          </div>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ConnectionTimeoutSlider
          warningSec={latencyWarningSeconds}
          timeoutSec={requestTimeoutSeconds}
          onChange={(w, t) => {
            setLatencyWarningSeconds(w);
            setRequestTimeoutSeconds(t);
          }}
          warningThumbHostRef={latencyWarningThumbHostRef}
          onMoveDownFromThumb={focusScreenshotMaxDimensionFromSlider}
          onMoveUpFromTimeoutThumb={focusOllamaIpFromTimeoutSlider}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div
          ref={screenshotDimensionNavRef}
          className="bonsai-prose-host"
          style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
        >
          <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            Screenshot max dimension
          </div>
          <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
            Long-edge clamp applied before sending image attachments to vision-capable models.
          </div>
          <Focusable
            flow-children="horizontal"
            style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
          >
            {SCREENSHOT_DIMENSION_OPTIONS.map((option) => {
              const active = option === screenshotMaxDimension;
              return (
                <Button
                  key={`dim-${option}`}
                  {...({
                    onMoveUp: () => focusSoftWarningFromScreenshot(),
                  } as Record<string, unknown>)}
                  onClick={() => setScreenshotMaxDimension(option)}
                  style={{
                    flex: 1,
                    minHeight: 36,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 4px",
                    borderRadius: 4,
                    border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                    background: active
                      ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                      : "rgba(255,255,255,0.04)",
                    color: active ? "#f0f4f8" : "#9fb0c0",
                    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                  }}
                  aria-label={`Set screenshot max dimension to ${option}`}
                >
                  {screenshotDimensionLabel[option]}
                </Button>
              );
            })}
          </Focusable>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div className="bonsai-prose-host" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            Unified input persistence
          </div>
          <div
            className="bonsai-prose"
            style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}
            title={persistenceSettingsTooltip}
          >
            Whether the Ask/search box is restored when you reopen the plugin. Hover for mode details.
          </div>
          <Focusable
            flow-children="horizontal"
            style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
          >
            {persistenceModeOptions.map((mode) => {
              const active = mode === unifiedInputPersistenceMode;
              return (
                <Button
                  key={mode}
                  onClick={() => {
                    setUnifiedInputPersistenceMode(mode);
                  }}
                  style={{
                    flex: 1,
                    minHeight: 36,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 4px",
                    borderRadius: 4,
                    border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                    background: active
                      ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                      : "rgba(255,255,255,0.04)",
                    color: active ? "#f0f4f8" : "#9fb0c0",
                    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                  }}
                  aria-label={`${persistenceModeLabel[mode]}: ${persistenceModeDescription[mode]}`}
                >
                  {persistenceModeShortLabel[mode]}
                </Button>
              );
            })}
          </Focusable>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ToggleField
          label="Preset chip fade animation"
          description="When off, main-tab suggestion chips stay fully visible and swap prompts without crossfades. Re-seeding after each Ask is unchanged."
          checked={presetChipFadeAnimationEnabled}
          onChange={(checked) => setPresetChipFadeAnimationEnabled(checked)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div
          className="bonsai-settings-ai-character-block"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <ToggleField
            label="AI characters"
            description="Optional character tone for local model replies. Choose a preset, randomize each Ask, or type your own."
            checked={aiCharacterEnabled}
            onChange={(checked) => setAiCharacterEnabled(checked)}
          />
          {aiCharacterEnabled && (
            <>
              <Button
                className="bonsai-ai-character-picker-open"
                onClick={() => openCharacterPickerModal()}
                style={{
                  width: "100%",
                  marginTop: 10,
                  minHeight: 38,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
                  color: "#e8eef5",
                  textAlign: "left",
                }}
              >
                {formatAiCharacterSelectionLine({
                  random: aiCharacterRandom,
                  presetId: aiCharacterPresetId,
                  customText: aiCharacterCustomText,
                })}
              </Button>
              <div style={{ marginTop: 12, width: "100%", maxWidth: "100%", minWidth: 0 }}>
                <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Accent intensity
                </div>
                <div
                  className="bonsai-prose"
                  style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}
                >
                  {
                    AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === aiCharacterAccentIntensity)
                      ?.description ?? ""
                  }
                </div>
                <Focusable
                  flow-children="horizontal"
                  style={{
                    display: "flex",
                    gap: 6,
                    width: "100%",
                    minWidth: 0,
                    maxWidth: "100%",
                    alignItems: "stretch",
                    flexWrap: "wrap",
                  }}
                >
                  {AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.map((opt) => {
                    const active = opt.id === aiCharacterAccentIntensity;
                    return (
                      <Button
                        key={opt.id}
                        onClick={() => setAiCharacterAccentIntensity(opt.id)}
                        style={{
                          flex: "1 1 22%",
                          minWidth: 72,
                          minHeight: 36,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "4px 4px",
                          borderRadius: 4,
                          border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                          background: active
                            ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                            : "rgba(255,255,255,0.04)",
                          color: active ? "#f0f4f8" : "#9fb0c0",
                          boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                        }}
                        aria-label={`Accent intensity ${opt.shortLabel}: ${opt.description}`}
                      >
                        {opt.shortLabel}
                      </Button>
                    );
                  })}
                </Focusable>
              </div>
              <div className="bonsai-prose" style={{ fontSize: 10, color: "#6b7c90", marginTop: 6, lineHeight: 1.35 }}>
                Tap the row for the fullscreen picker. On the main tab, tap the avatar beside the input to change character.
              </div>
            </>
          )}
        </div>
      </PanelSectionRow>
    </PanelSection>
    <PanelSection title="Desktop notes">
      <PanelSectionRow>
        <ToggleField
          label="Auto-save chat to Desktop notes"
          description={
            "Appends each Ask and each AI reply to Desktop/BonsAI_notes/bonsai-chat-YYYY-MM-DD.md (UTC day). " +
            "Requires Filesystem writes in the Permissions tab."
          }
          checked={desktopDebugNoteAutoSave}
          onChange={(checked) => setDesktopDebugNoteAutoSave(checked)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ToggleField
          label="Verbose Ask logging to Desktop notes"
          description={
            "When on and Filesystem writes are allowed, appends full prompts (system + user text), model name, " +
            "and replies to Desktop/BonsAI_notes/bonsai-ask-trace-YYYY-MM-DD.md (UTC day). " +
            "May grow large; contains sensitive prompt text. View the latest trace on the main tab under Input handling."
          }
          checked={desktopAskVerboseLogging}
          onChange={(checked) => setDesktopAskVerboseLogging(checked)}
        />
      </PanelSectionRow>
    </PanelSection>
    </div>
  );

  const permissionsTab = (
    <PermissionsTab capabilities={capabilities} setCapabilities={setCapabilities} />
  );

  const onSteamInputPhase1Jump = () => {
    if (!capabilities.external_navigation) {
      toaster.toast({
        title: "Permission required",
        body: "Enable External and Steam navigation in the Permissions tab for Steam Input jump.",
        duration: 4500,
      });
      goToPermissionsTab();
      return;
    }
    const entry = getSteamInputLexiconEntry("phase1_per_game_controller_config");
    if (!entry) {
      toaster.toast({ title: "Steam Input", body: "Lexicon entry missing.", duration: 3500 });
      return;
    }
    const result = jumpToSteamInputEntry(entry);
    if (result.ok) {
      toaster.toast({
        title: "Steam Input jump",
        body: `${result.confidenceLabel}: ${result.method} → ${result.detail}`,
        duration: 4000,
      });
    } else {
      const hint = entry.breadcrumb.length ? ` ${entry.breadcrumb[0]}` : "";
      toaster.toast({ title: "Steam Input jump", body: `${result.reason}${hint}`, duration: 6000 });
    }
  };

  const debugTab = (
    <DebugTab
      capturedErrors={capturedErrors}
      onClearErrors={() => setCapturedErrors([])}
      onSteamInputPhase1Jump={onSteamInputPhase1Jump}
    />
  );
  const aboutTab = (
    <AboutTab
      githubRepoUrl={GITHUB_REPO_URL}
      ollamaRepoUrl={OLLAMA_UPSTREAM_REPO_URL}
      githubIssuesUrl={GITHUB_ISSUES_URL}
      allowExternalNavigation={capabilities.external_navigation}
      onNavigateToPermissions={goToPermissionsTab}
    />
  );

  return (
    <div ref={bonsaiScopeRef} className="bonsai-scope">
      <style>{`
        /* Keep plugin subtree shrinkable inside QAM flex layout (avoids horizontal spill). */
        /*
          Do not set overflow-x on .bonsai-scope: if overflow-x is not visible, CSS forces overflow-y
          away from visible, which clipped tab content below the icon strip. Horizontal containment
          stays on TabContentsScroll + width/min-width fixes on bleed/ask rows.
        */
        .bonsai-scope {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .bonsai-scope .bonsai-settings-connection-row {
          min-width: 0;
          max-width: 100%;
        }
        .bonsai-scope .bonsai-settings-connection-host input {
          min-width: 0 !important;
          max-width: 100%;
        }

        /* Non-main tabs: clip horizontal paint overflow without touching Main full-bleed (shell only). */
        .bonsai-scope .bonsai-tab-panel-shell--tight {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        /*
          Explicit prose hooks: Deck CEF often ignored inherited overflow-wrap on PanelSection subtrees
          (class names do not always match our [class*="PanelSection"] patterns). H6 fix.
        */
        .bonsai-scope .bonsai-prose-host {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-prose {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
        }

        /* ==========================================================================
           1. STEAM NATIVE OVERRIDES (CAROUSEL & WRAPPERS)
           These rules tame Steam's default UI behaviors to give us a clean slate.
           ========================================================================== */
        .bonsai-scope [class*="Tabs"] .Panel.Focusable,
        .bonsai-scope [class*="Tabs"] .DialogButton,
        .bonsai-scope [class*="Tabs"] button {
          transition-property: none !important;
        }

        .bonsai-scope [class*="TabContentsScroll"] {
          scroll-behavior: auto !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }

        /* ==========================================================================
           2. TAB CAROUSEL LAYOUT (THE "GHOST NUDGE" FIX)
           ========================================================================== */
        .bonsai-scope .bonsai-tab-title-shell {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 68px !important;
          height: 100% !important;
          
          /* -> KEYWORD EXPLANATION: MARGIN <- 
             Margin defines the invisible space OUTSIDE an element's border, pushing neighboring 
             elements away. In this implementation, setting it to 0 ensures our shell doesn't 
             inherit stray Steam spacing that would randomly shift our tabs out of alignment. */
          margin: 0 !important;
          
          /* -> KEYWORD EXPLANATION: PADDING <- 
             Padding defines the invisible space INSIDE an element, between its border and its content. 
             In this implementation, setting it to 0 ensures our shell doesn't squish the icon inwards, 
             giving us absolute control over the icon's exact placement. */
          padding: 0 !important;
          
          /* -> KEYWORD EXPLANATION: TRANSFORM <- 
             Transform alters an element's coordinate space (allowing it to be moved, rotated, scaled, etc)
             without affecting the flow of the document around it. In this implementation, 'none' acts as 
             a shield to prevent Steam's native animations from physically moving our container. */
          transform: none !important;
        }
        
        .bonsai-scope .bonsai-tab-title-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 0;
          
          /* THE GHOST NUDGE: 'transform: translateX()' visually slides the pixels of the icon
             to the right without altering the physical layout box, perfectly countering Steam's
             lopsided native padding on the parent pill. */
          transform: translateX(4px) !important;
        }
        
        /* ==========================================================================
           3. GENERAL SPACING & WIDTH RESETS
           Groups and removes Steam's default padding/margins on scroll areas and panels
           to allow true full-bleed layouts across the entire plugin.
           ========================================================================== */
        .bonsai-scope [class*="TabContentsScroll"],
        .bonsai-scope [class*="TabContentsScroll"] > div,
        .bonsai-scope [class*="PanelSection"] {
          margin-top: 0 !important;
          padding-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          min-width: 0 !important;
        }

        /*
          Panel copy was still painting past the QAM edge (Deck screenshot): long lines need explicit
          wrapping + shrink in nested flex; overflow-wrap:anywhere breaks tokens if needed.
        */
        .bonsai-scope [class*="PanelSection"],
        .bonsai-scope [class*="PanelSectionRow"],
        .bonsai-scope [class*="PanelSectionRow"] > div {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow-wrap: anywhere !important;
          word-wrap: break-word !important;
        }

        .bonsai-scope [class*="PanelSectionRow"] {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          overflow: visible !important;
          align-self: stretch !important;
        }
        
        .bonsai-scope .Panel.Focusable { height: auto !important; }
        .bonsai-scope .Panel.Focusable > div { position: relative !important; top: 0 !important; }

        /* ==========================================================================
           4. FULL-BLEED & ASKBAR WRAPPERS
           Forces specific containers to break out of standard bounds for edge-to-edge UI.
           ========================================================================== */
        /*
          Full-bleed width uses negative margins; do not set min-width to (100% + Npx) or the tab
          scroll region gains a wider min-content width and the QAM scrolls horizontally.
        */
        .bonsai-scope .bonsai-full-bleed-row,
        .bonsai-scope .bonsai-ask-bleed-wrap.bonsai-full-bleed-row {
          width: calc(100% + 24px) !important;
          max-width: none !important;
          min-width: 0 !important;
          margin-left: -12px !important;
          margin-right: -12px !important;
          box-sizing: border-box !important;
        }

        /* Main unified search + Ask row: less horizontal bleed than preset carousel (same host width var). */
        .bonsai-scope .bonsai-unified-input-host.bonsai-full-bleed-row {
          width: calc(100% - 8px) !important;
          margin-left: 4px !important;
          margin-right: 4px !important;
        }

        /* Settings search hits — same horizontal track as unified host so results line up under the textarea. */
        .bonsai-scope .bonsai-main-search-results-pane {
          width: calc(100% - 6px) !important;
          max-width: none !important;
          min-width: 0 !important;
          margin-left: 4px !important;
          margin-right: 4px !important;
          box-sizing: border-box !important;
        }

        /* Re-map width for specific askbar rows using CSS Variables with fallbacks */
        .bonsai-scope .bonsai-ask-bleed-wrap.bonsai-full-bleed-row {
          width: var(--bonsai-askbar-outer-width, var(--bonsai-search-host-width, calc(100% + 2px))) !important;
          min-width: 0 !important;
          margin-left: -1px !important;
          margin-right: -1px !important;
        }

        /*
          H1 fix: never tie min-width to --bonsai-search-host-width (measured px); that inflates tab
          min-content and causes QAM horizontal spill. Ask inner width uses --bonsai-askbar-outer-width
          (host + small extra) so the glass matches the unified field spill; max-width stays none so % parents do not clip it.
        */
        .bonsai-scope .bonsai-askbar-row-host,
        .bonsai-scope .bonsai-ask-bleed-wrap .bonsai-askbar-merged {
          width: var(--bonsai-askbar-outer-width, var(--bonsai-search-host-width, 100%)) !important;
          min-width: 0 !important;
          max-width: none !important;
          /* Left-edge correction (ASK bar shell starts inset from the unified input host).
           * Applied via CSS var set in useUnifiedInputSurface; ref-set inline styles on the
           * ask element get wiped by React re-renders, but scope-level vars persist. */
          margin-left: var(--bonsai-ask-margin-left, 0px) !important;
        }

        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary.DialogButton,
        .bonsai-scope .bonsai-ask-bleed-wrap .Panel.Focusable {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
        }

        .bonsai-scope .bonsai-ask-bleed-wrap,
        .bonsai-scope .bonsai-ask-bleed-wrap .bonsai-askbar-merged {
          flex: 1 1 auto !important;
          align-self: stretch !important;
        }

        /* ==========================================================================
           5. UNIFIED INPUT FIELD & TEXT AREA STYLING
           Aggressively strips native styling from inputs so we can draw custom carets/overlays.
           ========================================================================== */
        .bonsai-scope .bonsai-unified-input-host input,
        .bonsai-scope .bonsai-unified-input-host textarea {
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          text-indent: 0 !important;
          box-sizing: border-box !important;
          font-size: ${UNIFIED_TEXT_FONT_PX}px !important;
          line-height: ${UNIFIED_TEXT_LINE_HEIGHT} !important;
          vertical-align: top !important;
        }

        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character textarea,
        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character input {
          padding-left: 22px !important;
        }

        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character .bonsai-unified-input-measure,
        .bonsai-scope .bonsai-unified-input-host.bonsai-unified-input--ai-character .bonsai-unified-input-text-overlay {
          padding-left: 22px !important;
          box-sizing: border-box !important;
        }

        .bonsai-scope .bonsai-ai-character-avatar {
          outline: none;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          opacity: 0.75 !important;
        }

        .bonsai-scope .bonsai-unified-input-host input::placeholder { font-size: 12px; }

        /* Hide standard field labels to allow custom overlays */
        .bonsai-scope .bonsai-unified-input-host [class*="FieldLabel"],
        .bonsai-scope .bonsai-unified-input-host [class*="fieldlabel"] {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        /* Position the fake text overlay to perfectly cover the invisible actual input */
        .bonsai-scope .bonsai-unified-input-text-overlay {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          left: var(--bonsai-unified-field-left, 0px) !important;
          top: var(--bonsai-unified-field-top, 0px) !important;
          right: auto !important;
          width: var(--bonsai-unified-field-width, 100%) !important;
        }

        /* Fake Caret Animation */
        .bonsai-scope .bonsai-unified-input-fake-caret {
          display: inline-block;
          margin-left: 1px;
          opacity: 0.9;
          transform: translateY(1px);
          animation: bonsai-caret-blink 1s step-end infinite;
        }
        @keyframes bonsai-caret-blink {
          0%, 45% { opacity: 0.9; }
          50%, 100% { opacity: 0; }
        }

        /* ==========================================================================
           6. GLASS PANELS & UI THEMING
           Applies frosted glass effects and borders to standard panels.
           ========================================================================== */
        .bonsai-scope .bonsai-glass-panel,
        .bonsai-scope .bonsai-preset-glass,
        .bonsai-scope .bonsai-ai-response-chunk {
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          box-sizing: border-box;
        }

        .bonsai-scope .bonsai-glass-panel {
          background: rgba(18, 26, 34, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
        }

        .bonsai-scope .bonsai-preset-glass {
          background: rgba(18, 26, 34, 0.22) !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
          box-shadow: none !important;
        }

        .bonsai-scope .bonsai-ai-response-chunk {
          background: rgba(18, 26, 34, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #e8eef4;
          padding: 8px;
          white-space: pre-wrap;
          font-size: 12px;
          line-height: 1.4;
        }

        /* ==========================================================================
           7. TRANSPARENCY FLATTENING (DECKY FIXES)
           Decky components heavily stack backgrounds/shadows. This flattens them
           so our custom backgrounds show through properly.
           ========================================================================== */
        .bonsai-scope .bonsai-preset-glass > div,
        .bonsai-scope .bonsai-unified-input-host div:not(.bonsai-unified-input-text-overlay),
        .bonsai-scope .bonsai-unified-input-host input,
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable,
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable > div,
        .bonsai-scope .bonsai-askbar-target,
        .bonsai-scope .bonsai-askbar-target > div,
        .bonsai-scope .bonsai-askbar-target > span,
        .bonsai-scope .bonsai-askbar-merged .DialogButton {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }

        /*
         * Ask-mode menu lives inside .bonsai-unified-input-host. Section 7 above uses
         * .bonsai-unified-input-host div and .Panel.Focusable with higher
         * specificity than .bonsai-ask-mode-menu-surface alone, so every menu
         * row/stack was forced transparent; ASK/glass bleeds through as a vertical fade.
         * Undo only under .bonsai-ask-mode-menu-floater (must beat section 7).
         */
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater div,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .Panel.Focusable,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .Panel.Focusable > div {
          background-image: none !important;
          /* §7 sets background-color transparent on .Panel.Focusable > div — must override or ASK bleeds through inner wrappers. */
          background-color: rgb(28, 36, 44) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item--selected.Panel.Focusable > div {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface div {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item--selected div {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item {
          background-color: rgb(28, 36, 44) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item--selected {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item,
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-item.Panel.Focusable {
          border-top: none !important;
          border-bottom: none !important;
        }

        /* ==========================================================================
           8. ASKBAR INTERACTIONS & ICONS
           Handles focus states, layout of bottom action icons, and opacity.
           ========================================================================== */
        .bonsai-scope .bonsai-unified-input-host { border-radius: 8px; overflow: hidden; }
        /*
         * While the ask-mode dropdown is open: overflow visible for the menu, and raise stacking.
         * The ASK row is a later PanelSectionRow, so it paints on top of this host by default;
         * the menu extends over the ASK bar and looked like a vertical fade (ASK ::before gradient on top of rows).
         */
        .bonsai-scope .bonsai-unified-input-host.bonsai-ask-mode-menu-open {
          overflow: visible;
          position: relative;
          z-index: 50;
        }

        /* Ask mode menu: solid stack (Decky sometimes composites menus semi-transparent over glass). */
        .bonsai-scope .bonsai-ask-mode-menu-floater {
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface,
        .bonsai-scope .bonsai-ask-mode-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .Panel.Focusable {
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item--selected {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item,
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item.Panel.Focusable {
          border-top: none !important;
          border-bottom: none !important;
        }
        /* Keep gamepad/pointer focus ring inside the row so it does not extend past the panel edge. */
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item:focus,
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.38) !important;
          outline-offset: -2px !important;
        }

        /*
         * Reset nested Panel.Focusable under the unified input host. Keep selector specificity LOW: adding :not()
         * on menu classes raised specificity above .bonsai-unified-input-bottom-actions / .bonsai-unified-input-actions-right,
         * so flex-direction:column here won the cascade and stacked the paperclip above the mode chip + mic row.
         */
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable {
          padding: 0 !important; margin: 0 !important; min-width: 0 !important;
          display: flex !important; flex-direction: column !important;
          align-items: stretch !important; justify-content: flex-start !important;
        }
        /* Stronger chain beats the rule above so ask-mode menu rows keep horizontal padding (vars from AskModeMenuPopover surface). */
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface > .bonsai-ask-mode-menu-list.Panel.Focusable {
          padding-top: var(--bonsai-ask-mode-menu-list-pad-y, 0px) !important;
          padding-bottom: var(--bonsai-ask-mode-menu-list-pad-y, 0px) !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item.Panel.Focusable {
          padding: var(--bonsai-ask-mode-menu-pad-y, 10px) var(--bonsai-ask-mode-menu-pad-x, 13px) !important;
        }

        /* Only the outer actions row is full-width; nested Focusable (mode + mic) stays end-aligned. */
        .bonsai-scope .bonsai-unified-input-bottom-actions > .Panel.Focusable {
          width: 100% !important; min-height: 100% !important;
          flex-direction: row !important; justify-content: flex-start !important;
          align-items: flex-end !important; flex-wrap: nowrap !important;
        }
        .bonsai-scope .bonsai-unified-input-actions-right.Panel.Focusable {
          width: auto !important;
          min-width: 0 !important;
          flex: 0 0 auto !important;
          margin-left: auto !important;
          flex-direction: row !important;
          align-items: flex-end !important;
          justify-content: flex-end !important;
        }

        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target.DialogButton,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target {
          padding: 0 !important; margin: 0 !important;
          min-width: 20px !important; min-height: 20px !important; border-radius: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target {
          min-width: unset !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target > span { padding: 0 !important; margin: 0 !important; }

        .bonsai-scope .bonsai-unified-input-icon { display: inline-flex; align-items: center; justify-content: center; opacity: 0.15 !important; }
        .bonsai-scope .bonsai-unified-input-icon svg { opacity: 1; }

        .bonsai-scope .bonsai-askbar-corner-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.5 !important;
          transition: opacity ${ASK_READY_STATE_TRANSITION_MS}ms ease !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-askbar-corner-icon svg { opacity: 1; }

        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary.DialogButton,
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary {
          color: ${ASK_LABEL_COLOR} !important;
          transition: color ${ASK_READY_STATE_TRANSITION_MS}ms ease !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary span { color: inherit !important; }

        /*
          Ask bar idle ↔ ready: crossfade a ::before overlay (opacity) so the lift animates smoothly; base glass stays
          from .bonsai-glass-panel (background gradients do not interpolate reliably in all engines).
        */
        .bonsai-scope .bonsai-askbar-merged {
          position: relative;
          transition:
            box-shadow ${ASK_READY_STATE_TRANSITION_MS}ms ease,
            border-color ${ASK_READY_STATE_TRANSITION_MS}ms ease;
        }
        .bonsai-scope .bonsai-askbar-merged::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          z-index: 0;
          opacity: 0;
          transition: opacity ${ASK_READY_STATE_TRANSITION_MS}ms ease;
          background: linear-gradient(180deg, rgba(42, 58, 76, 0.52) 0%, rgba(22, 34, 46, 0.46) 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .bonsai-scope .bonsai-askbar-merged--ready::before {
          opacity: 1;
        }
        .bonsai-scope .bonsai-askbar-merged > * {
          position: relative;
          z-index: 1;
        }

        /* Ask “ready” — border / outer ring (transitions on .bonsai-askbar-merged above) */
        .bonsai-scope .bonsai-askbar-merged.bonsai-askbar-merged--ready.bonsai-glass-panel {
          border-color: rgba(255, 255, 255, 0.11) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
        }
        .bonsai-scope .bonsai-askbar-merged.bonsai-askbar-merged--ready:focus-within {
          border-color: rgba(255, 255, 255, 0.14) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary--ready.DialogButton,
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary--ready { color: ${ASK_LABEL_READY_COLOR} !important; }
        .bonsai-scope .bonsai-askbar-merged--ready .bonsai-askbar-corner-icon { opacity: 0.62 !important; }

        /* Focus and Hover Effects */
        .bonsai-scope .bonsai-askbar-merged:focus-within {
          border-color: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .bonsai-scope .bonsai-askbar-target { transition: background-color 120ms ease, box-shadow 120ms ease; border: none !important; }
        .bonsai-scope .bonsai-askbar-target:focus-visible {
          background: rgba(160, 189, 220, 0.16) !important; box-shadow: inset 0 0 0 1px rgba(200, 223, 245, 0.8);
        }
        .bonsai-scope .bonsai-attachment-preview-target:focus-visible,
        .bonsai-scope .bonsai-attachment-preview-target :focus-visible {
          background: rgba(176, 205, 235, 0.14) !important; box-shadow: inset 0 0 0 1px rgba(206, 229, 249, 0.9);
        }
        .bonsai-scope .bonsai-attachment-remove-target:focus-visible,
        .bonsai-scope .bonsai-attachment-remove-target :focus-visible {
          background: rgba(176, 205, 235, 0.22) !important; box-shadow: inset 0 0 0 1px rgba(206, 229, 249, 0.95); border-radius: 6px;
        }

        /* ==========================================================================
           9. MISC FIXES (SLIDERS, ETC)
           ========================================================================== */
        .bonsai-scope .bonsai-preset-carousel-slot { width: 100%; min-width: 0; box-sizing: border-box; }
        .bonsai-scope [class*="SliderControlPanelGroup"],
        .bonsai-scope [class*="SliderControlAndNotches"] { width: 100% !important; min-width: 0 !important; max-width: 100% !important; }
        .bonsai-scope [class*="SliderControlPanelGroup"] > div,
        .bonsai-scope [class*="SliderControlAndNotches"] > div { min-width: 0 !important; }
      `}</style>
      <Tabs
        activeTab={currentTab}
        onShowTab={onTabsShowTab}
        tabs={[
          {
            id: "main",
            title: bonsaiTabIconTitle(
              "main",
              <BonsaiLogoIcon size={TAB_TITLE_ICON_PX_BONSAI} zoom={1} offsetX={0} offsetY={0} />,
            ),
            content: mainTab,
          },
          {
            id: "settings",
            title: bonsaiTabIconTitle("settings", <GearIcon size={TAB_TITLE_ICON_PX_SETTINGS} />),
            content: settingsTab,
          },
          {
            id: "permissions",
            title: bonsaiTabIconTitle("permissions", <LockIcon size={TAB_TITLE_ICON_PX_PERMISSIONS} />),
            content: (
              <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight">{permissionsTab}</div>
            ),
          },
          {
            id: "debug",
            title: bonsaiTabIconTitle("debug", <BugIcon size={TAB_TITLE_ICON_PX_DEBUG} />),
            content: <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight">{debugTab}</div>,
          },
          {
            id: "about",
            title: "About",
            content: <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight">{aboutTab}</div>,
          },
        ]}
      />
    </div>
  );
};

// Mount the content tree inside an error boundary to keep plugin recovery user-accessible.
const Root: React.FC = () => (
  <ErrorBoundary>
    <Content />
  </ErrorBoundary>
);

export default definePlugin(() => {
  return {
    name: "bonsAI",
    titleView: (
      <span
        style={{
          fontVariant: "small-caps",
          fontWeight: 600,
          letterSpacing: "0.06em",
        }}
      >
        bonsAI
      </span>
    ),
    content: <Root />,
    icon: (
      <span style={{ display: "inline-flex", transform: "translateX(-5px)" }}>
        <BonsaiSvgIcon size={26} />
      </span>
    ),
    onDismount() {},
  };
});
