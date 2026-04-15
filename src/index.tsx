import React, { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { definePlugin, toaster, call } from "@decky/api";
import {
  PanelSection,
  PanelSectionRow,
  TextField,
  ButtonItem,
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
  DEFAULT_SCREENSHOT_MAX_DIMENSION,
  DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE,
  LATENCY_WARNING_STEP_SECONDS,
  MAX_LATENCY_WARNING_SECONDS,
  MAX_REQUEST_TIMEOUT_SECONDS,
  MIN_LATENCY_WARNING_SECONDS,
  MIN_REQUEST_TIMEOUT_SECONDS,
  normalizeLatencyWarningSeconds,
  normalizeRequestTimeoutSeconds,
  normalizeSettings,
  REQUEST_TIMEOUT_STEP_SECONDS,
  SCREENSHOT_DIMENSION_OPTIONS,
  type BonsaiSettings,
  type ScreenshotMaxDimension,
  type UnifiedInputPersistenceMode,
} from "./utils/settingsAndResponse";
import { AboutTab } from "./components/AboutTab";
import { DebugTab } from "./components/DebugTab";
import { MainTab } from "./components/MainTab";
import { getSteamInputLexiconEntry } from "./data/steam-input-lexicon";
import { jumpToSteamInputEntry } from "./utils/steamInputJump";
import { detectPromptCategory, getContextualPresets, getRandomPresets, type PresetPrompt } from "./data/presets";
import { BonsaiLogoIcon, BonsaiSvgIcon, BugIcon, GearIcon } from "./components/icons";
import { SETTINGS_DATABASE } from "./data/settingsDatabase";
import {
  TAB_TITLE_ICON_PX_BONSAI,
  TAB_TITLE_ICON_PX_DEBUG,
  TAB_TITLE_ICON_PX_SETTINGS,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_LINE_HEIGHT,
} from "./features/unified-input/constants";
import { useUnifiedInputSurface } from "./features/unified-input/useUnifiedInputSurface";
import type { AppliedResult, AskAttachment, OllamaContextUi, ScreenshotItem } from "./types/bonsaiUi";

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
  accepted: boolean;
  status: "pending" | "busy" | "invalid";
  request_id?: number | null;
  response?: string;
  app_id?: string;
  app_context?: string;
  success?: boolean;
  applied?: AppliedResult | null;
  elapsed_seconds?: number;
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
      })
      .catch(() => {
        if (cancelled) return;
        setLatencyWarningSeconds(DEFAULT_LATENCY_WARNING_SECONDS);
        setRequestTimeoutSeconds(DEFAULT_REQUEST_TIMEOUT_SECONDS);
        setUnifiedInputPersistenceMode(DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE);
        setScreenshotMaxDimension(DEFAULT_SCREENSHOT_MAX_DIMENSION);
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
    settingsLoaded,
  ]);

  return {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    unifiedInputPersistenceMode,
    screenshotMaxDimension,
    settingsLoaded,
    setLatencyWarningSeconds,
    setRequestTimeoutSeconds,
    setUnifiedInputPersistenceMode,
    setScreenshotMaxDimension,
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

/**
 * This component is the primary plugin UI composition shell for tabs, ask flow, and settings tooling.
 * It stitches together extracted hooks/data/modules while keeping behavior parity with prior releases.
 */
const Content: React.FC = () => {
  const [currentTab, setCurrentTab] = useState("main");

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
    setLatencyWarningSeconds,
    setRequestTimeoutSeconds,
    setUnifiedInputPersistenceMode,
    setScreenshotMaxDimension,
  } = usePluginSettings();

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
    if (!unifiedInput.trim()) return [];
    return SETTINGS_DATABASE.filter((setting) =>
      setting.toLowerCase().includes(unifiedInput.toLowerCase())
    );
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
        const questionForCategory = (status.question || fallbackQuestion || "").trim();
        if (questionForCategory) {
          const category = detectPromptCategory(questionForCategory);
          setSuggestedPrompts(getContextualPresets(category, 3));
        }
      }
      return;
    }

    setOllamaContext(null);
    setIsAsking(false);
  }, []);

  const onBackgroundPollError = useCallback((e: unknown) => {
    setIsAsking(false);
    setOllamaResponse(`Error: ${formatDeckyRpcError(e)}`);
    setLastApplied(null);
    setOllamaContext(null);
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
      >("start_background_game_ai", { question: q, PcIp: ip, appId, appName, attachments });

      if (!isRequestActive(seq)) return;

      if (data.status === "invalid") {
        setIsAsking(false);
        setOllamaResponse(data.response ?? "Request is invalid.");
        setLastApplied(null);
        setElapsedSeconds(null);
        return;
      }

      if (data.status === "busy") {
        setIsAsking(true);
        setOllamaResponse(data.response ?? "A request is already in progress.");
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

  const adjustLatencyWarning = (direction: 1 | -1) => {
    setLatencyWarningSeconds((prev) =>
      normalizeLatencyWarningSeconds(prev + direction * LATENCY_WARNING_STEP_SECONDS, prev)
    );
  };

  const adjustRequestTimeout = (direction: 1 | -1) => {
    setRequestTimeoutSeconds((prev) =>
      normalizeRequestTimeoutSeconds(prev + direction * REQUEST_TIMEOUT_STEP_SECONDS, prev)
    );
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
  const fullBleedRowStyle: React.CSSProperties = {
    width: "calc(100% + 24px)",
    marginLeft: -12,
    marginRight: -12,
    boxSizing: "border-box",
  };

  const stepperButtonStyle: React.CSSProperties = {
    width: 32,
    minWidth: 32,
    height: 30,
    padding: 0,
    lineHeight: "30px",
    textAlign: "center",
    background: "linear-gradient(180deg, #283241 0%, #1b232f 100%)",
    color: "#dbe6f3",
    border: "1px solid rgba(118, 139, 166, 0.6)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  };
  const presetButtonSurface: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.03)",
    color: "#93a3b0",
  };
  const showSearchClearButton = Boolean(unifiedInput.trim());

  // =====================================================================
  // TAB CONTENT
  // =====================================================================

  const mainTab = (
    <MainTab
      fullBleedRowStyle={fullBleedRowStyle}
      presetButtonSurface={presetButtonSurface}
      suggestedPrompts={suggestedPrompts}
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
    />
  );

  const settingsTab = (
    <PanelSection title="Connection">
      <PanelSectionRow>
        <TextField
          label="PC IP Address"
          value={ollamaIp}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOllamaIp(e.target.value)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 4,
              width: "100%",
            }}
          >
            <span style={{ fontSize: 13, color: "#d9d9d9", fontWeight: 600, flex: 1, minWidth: 0, paddingRight: 8 }}>
              Latency Warning (seconds)
            </span>
            <span style={{ fontSize: 13, color: "#d9d9d9", fontWeight: 700, flexShrink: 0 }}>
              {latencyWarningSeconds}s
            </span>
          </div>
          <Focusable
            flow-children="horizontal"
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0 }}>
            <Button
              onClick={() => adjustLatencyWarning(-1)}
              style={stepperButtonStyle}
            >
              -
            </Button>
            <div style={{ flex: 1, minWidth: 0, maxWidth: "100%", display: "flex", alignItems: "center" }}>
              <input
                type="range"
                min={MIN_LATENCY_WARNING_SECONDS}
                max={MAX_LATENCY_WARNING_SECONDS}
                step={LATENCY_WARNING_STEP_SECONDS}
                value={latencyWarningSeconds}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const rawValue = Number(e.target.value);
                  const normalized = normalizeLatencyWarningSeconds(rawValue, latencyWarningSeconds);
                  setLatencyWarningSeconds(normalized);
                }}
                style={{ width: "100%", minWidth: 0 }}
              />
            </div>
            <Button
              onClick={() => adjustLatencyWarning(1)}
              style={stepperButtonStyle}
            >
              +
            </Button>
            </div>
          </Focusable>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 4,
              width: "100%",
            }}
          >
            <span style={{ fontSize: 13, color: "#d9d9d9", fontWeight: 600, flex: 1, minWidth: 0, paddingRight: 8 }}>
              Backend Timeout (seconds)
            </span>
            <span style={{ fontSize: 13, color: "#d9d9d9", fontWeight: 700, flexShrink: 0 }}>
              {requestTimeoutSeconds}s
            </span>
          </div>
          <Focusable
            flow-children="horizontal"
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0 }}>
            <Button
              onClick={() => adjustRequestTimeout(-1)}
              style={stepperButtonStyle}
            >
              -
            </Button>
            <div style={{ flex: 1, minWidth: 0, maxWidth: "100%", display: "flex", alignItems: "center" }}>
              <input
                type="range"
                min={MIN_REQUEST_TIMEOUT_SECONDS}
                max={MAX_REQUEST_TIMEOUT_SECONDS}
                step={REQUEST_TIMEOUT_STEP_SECONDS}
                value={requestTimeoutSeconds}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const rawValue = Number(e.target.value);
                  const normalized = normalizeRequestTimeoutSeconds(rawValue, requestTimeoutSeconds);
                  setRequestTimeoutSeconds(normalized);
                }}
                style={{ width: "100%", minWidth: 0 }}
              />
            </div>
            <Button
              onClick={() => adjustRequestTimeout(1)}
              style={stepperButtonStyle}
            >
              +
            </Button>
            </div>
          </Focusable>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: 12, color: "#9fb7d5", lineHeight: "1.4" }}>
          Soft warning: UI hint if a request takes longer than the warning threshold.
          <br />
          Hard timeout: backend cancels the Ollama request at this limit.
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ width: "100%" }}>
          <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            Screenshot max dimension
          </div>
          <div style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
            Long-edge clamp applied before sending image attachments to vision-capable models.
          </div>
          <Focusable
            flow-children="horizontal"
            style={{ display: "flex", gap: 6, width: "100%", alignItems: "stretch" }}
          >
            {SCREENSHOT_DIMENSION_OPTIONS.map((option) => {
              const active = option === screenshotMaxDimension;
              return (
                <Button
                  key={`dim-${option}`}
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
        <div style={{ width: "100%" }}>
          <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            Unified input persistence
          </div>
          <div
            style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}
            title={persistenceSettingsTooltip}
          >
            Whether the Ask/search box is restored when you reopen the plugin. Hover for mode details.
          </div>
          <Focusable
            flow-children="horizontal"
            style={{ display: "flex", gap: 6, width: "100%", alignItems: "stretch" }}
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
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 13 }}>
          <span style={{ color: "gray" }}>Deck IP</span>
          <span style={{ color: "#c8c8c8" }}>{deckIp}</span>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={onTestConnection}
          disabled={connectionTesting || !ollamaIp.trim()}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {connectionTesting ? "Testing..." : "Test Connection"}
          </span>
        </ButtonItem>
      </PanelSectionRow>
      {connectionStatus && (
        <PanelSectionRow>
          {connectionStatus.reachable ? (
            <div style={{ fontSize: 12, color: "#81c784" }}>
              <div>Connected — Ollama v{connectionStatus.version}</div>
              {connectionStatus.models && connectionStatus.models.length > 0 && (
                <div style={{ color: "#9fb7d5", marginTop: 4 }}>
                  Models: {connectionStatus.models.join(", ")}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "tomato" }}>
              Unreachable — {connectionStatus.error}
            </div>
          )}
        </PanelSectionRow>
      )}
    </PanelSection>
  );

  const onSteamInputPhase1Jump = () => {
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
    />
  );

  return (
    <div ref={bonsaiScopeRef} className="bonsai-scope">
      <style>{`
        .bonsai-scope [class*="Tabs"] .Panel.Focusable,
        .bonsai-scope [class*="Tabs"] .DialogButton,
        .bonsai-scope [class*="Tabs"] button {
          transition-property: none !important;
        }
        .bonsai-scope [class*="TabContentsScroll"] {
          scroll-behavior: auto !important;
        }
        .bonsai-scope .bonsai-tab-title-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
        }
        .bonsai-scope .Panel.Focusable {
          height: auto !important;
        }
        .bonsai-scope .Panel.Focusable > div {
          position: relative !important;
          top: 0 !important;
        }
        .bonsai-scope [class*="TabContentsScroll"] {
          padding-top: 0 !important;
        }
        .bonsai-scope [class*="TabContentsScroll"] > div {
          margin-top: 0 !important;
          padding-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .bonsai-scope [class*="PanelSection"] {
          margin-top: 0 !important;
          padding-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .bonsai-scope [class*="PanelSectionRow"] {
          width: 100% !important;
          max-width: 100% !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          overflow: visible !important;
          align-self: stretch !important;
        }
        .bonsai-scope [class*="PanelSectionRow"] > div {
          width: 100% !important;
          max-width: 100% !important;
        }
        /* Full-bleed: global class; PanelSectionRow direct-child width rules differ by nesting — margins restored here for every bonsai-full-bleed-row. */
        .bonsai-scope .bonsai-full-bleed-row {
          width: calc(100% + 24px) !important;
          max-width: none !important;
          min-width: calc(100% + 24px) !important;
          margin-left: -12px !important;
          margin-right: -12px !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-askbar-row-host {
          width: var(--bonsai-search-host-width, 100%) !important;
          min-width: var(--bonsai-search-host-width, 100%) !important;
          max-width: none !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary.DialogButton {
          width: 100% !important;
          max-width: none !important;
        }
        /* Ask row: same full-bleed math as unified search; width not tied to unified host measurement. */
        .bonsai-scope .bonsai-ask-bleed-wrap.bonsai-full-bleed-row {
          width: var(--bonsai-search-host-width, calc(100% + 24px)) !important;
          min-width: var(--bonsai-search-host-width, calc(100% + 24px)) !important;
          max-width: none !important;
        }
        .bonsai-scope .bonsai-ask-bleed-wrap {
          flex: 1 1 auto !important;
          align-self: stretch !important;
        }
        .bonsai-scope .bonsai-ask-bleed-wrap .bonsai-askbar-merged {
          flex: 1 1 auto !important;
          width: var(--bonsai-search-host-width, 100%) !important;
          min-width: var(--bonsai-search-host-width, 0px) !important;
        }
        .bonsai-scope .bonsai-ask-bleed-wrap .Panel.Focusable {
          width: 100% !important;
          min-width: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-host input::placeholder {
          font-size: 12px;
        }
        .bonsai-scope .bonsai-unified-input-host input,
        .bonsai-scope .bonsai-unified-input-host textarea {
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          padding: 0 !important;
          padding-inline-start: 0 !important;
          padding-inline-end: 0 !important;
          padding-bottom: 0 !important;
          margin: 0 !important;
          text-indent: 0 !important;
          box-sizing: border-box !important;
          font-size: ${UNIFIED_TEXT_FONT_PX}px !important;
          line-height: ${UNIFIED_TEXT_LINE_HEIGHT} !important;
          vertical-align: top !important;
        }
        /* Stable margin: toggling negative margin on wrap caused caret vs overlay jump on line 2. */
        .bonsai-scope .bonsai-unified-input-host textarea,
        .bonsai-scope .bonsai-unified-input-host input {
          margin-top: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-host [class*="FieldLabel"],
        .bonsai-scope .bonsai-unified-input-host [class*="fieldlabel"] {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .bonsai-scope .bonsai-unified-input-text-overlay {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          left: var(--bonsai-unified-field-left, 0px) !important;
          top: var(--bonsai-unified-field-top, 0px) !important;
          right: auto !important;
          width: var(--bonsai-unified-field-width, 100%) !important;
        }
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
        .bonsai-scope .bonsai-glass-panel {
          background: rgba(18, 26, 34, 0.25) !important;
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
          box-sizing: border-box;
        }
        .bonsai-scope .bonsai-preset-glass {
          background: rgba(18, 26, 34, 0.22) !important;
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
          box-shadow: none !important;
          box-sizing: border-box;
        }
        .bonsai-scope .bonsai-preset-glass > div {
          background: transparent !important;
          background-image: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host {
          border-radius: 8px;
          overflow: hidden;
        }
        /* Decky TextField stacks opaque divs; flatten nested paint (exclude text overlay so color stays visible) */
        .bonsai-scope .bonsai-unified-input-host div:not(.bonsai-unified-input-text-overlay) {
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host input {
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable {
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
        }
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable > div {
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
          min-width: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.15 !important;
        }
        .bonsai-scope .bonsai-unified-input-icon svg {
          opacity: 1;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .Panel.Focusable {
          width: 100% !important;
          min-height: 100% !important;
          flex-direction: row !important;
          justify-content: space-between !important;
          align-items: center !important;
          flex-wrap: nowrap !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target.DialogButton,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target {
          padding: 0 !important;
          margin: 0 !important;
          min-width: 20px !important;
          min-height: 20px !important;
          border-radius: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target > span {
          padding: 0 !important;
          margin: 0 !important;
        }
        .bonsai-scope .bonsai-askbar-corner-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.5 !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-askbar-corner-icon svg {
          opacity: 1;
        }
        .bonsai-scope .bonsai-ai-response-chunk {
          color: #e8eef4;
          padding: 8px;
          white-space: pre-wrap;
          font-size: 12px;
          line-height: 1.4;
          background: rgba(18, 26, 34, 0.28) !important;
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-sizing: border-box;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary.DialogButton,
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary {
          color: #a8b4c4 !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary span {
          color: inherit !important;
        }
        .bonsai-scope .bonsai-askbar-merged {
          transition: box-shadow 120ms ease, border-color 120ms ease;
        }
        .bonsai-scope .bonsai-askbar-merged:focus-within {
          border-color: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .bonsai-scope .bonsai-askbar-target {
          transition: background-color 120ms ease, box-shadow 120ms ease;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        .bonsai-scope .bonsai-askbar-target > div,
        .bonsai-scope .bonsai-askbar-target > span {
          background: transparent !important;
          background-image: none !important;
        }
        .bonsai-scope .bonsai-askbar-merged .DialogButton {
          background-color: transparent !important;
          background-image: none !important;
        }
        .bonsai-scope .bonsai-askbar-target:focus-visible {
          background: rgba(160, 189, 220, 0.16) !important;
          box-shadow: inset 0 0 0 1px rgba(200, 223, 245, 0.8);
        }
        .bonsai-scope .bonsai-attachment-preview-target:focus-visible,
        .bonsai-scope .bonsai-attachment-preview-target :focus-visible {
          background: rgba(176, 205, 235, 0.14) !important;
          box-shadow: inset 0 0 0 1px rgba(206, 229, 249, 0.9);
        }
        .bonsai-scope .bonsai-attachment-remove-target:focus-visible,
        .bonsai-scope .bonsai-attachment-remove-target :focus-visible {
          background: rgba(176, 205, 235, 0.22) !important;
          box-shadow: inset 0 0 0 1px rgba(206, 229, 249, 0.95);
          border-radius: 6px;
        }
        .bonsai-scope [class*="SliderControlPanelGroup"] {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .bonsai-scope [class*="SliderControlAndNotches"] {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .bonsai-scope [class*="SliderControlPanelGroup"] > div,
        .bonsai-scope [class*="SliderControlAndNotches"] > div {
          min-width: 0 !important;
        }
      `}</style>
      <Tabs
        activeTab={currentTab}
        onShowTab={(tabID: string) => { setCurrentTab(tabID); }}
        tabs={[
          {
            id: "main",
            title: (
              <span className="bonsai-tab-title-icon bonsai-tab-title-icon--main">
                <BonsaiLogoIcon size={TAB_TITLE_ICON_PX_BONSAI} zoom={1} offsetX={-4} offsetY={-4} />
              </span>
            ),
            content: mainTab,
          },
          {
            id: "settings",
            title: (
              <span className="bonsai-tab-title-icon bonsai-tab-title-icon--settings">
                <GearIcon size={TAB_TITLE_ICON_PX_SETTINGS} />
              </span>
            ),
            content: settingsTab,
          },
          {
            id: "debug",
            title: (
              <span className="bonsai-tab-title-icon bonsai-tab-title-icon--debug">
                <BugIcon size={TAB_TITLE_ICON_PX_DEBUG} />
              </span>
            ),
            content: debugTab,
          },
          { id: "about", title: "About", content: aboutTab },
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
    title: "Decky Settings Search",
    content: <Root />,
    icon: (
      <span style={{ display: "inline-flex", transform: "translateX(-5px)" }}>
        <BonsaiSvgIcon size={26} />
      </span>
    ),
    onDismount() {},
  };
});
