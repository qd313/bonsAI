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
import { getSteamInputLexiconEntry } from "./data/steam-input-lexicon";
import { jumpToSteamInputEntry } from "./utils/steamInputJump";
import { detectPromptCategory, getContextualPresets, getRandomPresets, type PresetPrompt } from "./data/presets";
import {
  AskMicIcon,
  AskStopIcon,
  AttachMediaIcon,
  BackChevronIcon,
  BonsaiLogoIcon,
  BonsaiSvgIcon,
  BugIcon,
  ClearIcon,
  GearIcon,
  ImageAttachmentIcon,
  RefreshArrowIcon,
} from "./components/icons";
import { SETTINGS_DATABASE } from "./data/settingsDatabase";

function splitResponseIntoChunks(text: string): string[] {
  // Keep responses readable in Decky by splitting dense output into panel-sized chunks.
  const byParagraph = text.split(/\n\n+/).filter(p => p.trim());
  if (byParagraph.length > 1) return byParagraph;

  const byLine = text.split(/\n/).filter(l => l.trim());
  if (byLine.length > 1) return byLine;

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 300) {
    let cut = rest.lastIndexOf(". ", 300);
    if (cut < 100) cut = rest.lastIndexOf(" ", 300);
    if (cut < 100) cut = 300;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest.trim()) chunks.push(rest.trim());
  return chunks.length > 0 ? chunks : [text];
}


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

type AppliedResult = {
  tdp_watts: number | null;
  gpu_clock_mhz: number | null;
  errors: string[];
};

type AskAttachment = {
  path: string;
  name: string;
  source: "capture" | "recent" | "picker";
  preview_data_uri?: string;
  size_bytes?: number;
  app_id?: string;
};

type ScreenshotItem = {
  path: string;
  name: string;
  mtime: number;
  size_bytes?: number;
  source: string;
  app_id?: string;
  preview_data_uri?: string;
};

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

// Convert absolute file paths to file:// URIs for image rendering contexts.
function toFileUri(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const prefixed = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `file://${encodeURI(prefixed)}`;
}

// Format screenshot mtimes into concise local timestamps for list rows.
function formatScreenshotTimestamp(epochSeconds: number): string {
  if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) return "Unknown time";
  try {
    return new Date(epochSeconds * 1000).toLocaleString();
  } catch {
    return "Unknown time";
  }
}

// Convert byte counts into human-readable units for screenshot metadata.
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

function isRightNavigationKey(key: string): boolean {
  return key === "ArrowRight" || key === "Right" || key === "DPadRight" || key === "GamepadDPadRight";
}

function isLeftNavigationKey(key: string): boolean {
  return key === "ArrowLeft" || key === "Left" || key === "DPadLeft" || key === "GamepadDPadLeft";
}

// Find a visible focusable descendant to support controller-first keyboard navigation.
function getFocusableWithin(selector: string): HTMLElement | null {
  const root = document.querySelector(selector) as HTMLElement | null;
  if (!root) return null;
  const candidate = root.matches("[tabindex],button,a,input,select,textarea")
    ? root
    : (root.querySelector("[tabindex],button,a,input,select,textarea") as HTMLElement | null);
  return candidate;
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
  const unifiedInputHostRef = useRef<HTMLDivElement>(null);

  // --- AI state ---
  const [ollamaIp, setOllamaIp] = useState(loadSavedIp());
  const [ollamaResponse, setOllamaResponse] = useState("");
  const [ollamaContext, setOllamaContext] = useState<{ app_id: string; app_context: "active" | "none" } | null>(null);
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
    <>
      <PanelSection>
        <PanelSectionRow>
          <div style={{ ...fullBleedRowStyle, display: "grid", gap: 8 }}>
            {suggestedPrompts.map((p, i) => (
              <Button
                key={`preset-${i}`}
                onClick={() => {
                  const gameName = Router.MainRunningApp?.display_name ?? "";
                  setUnifiedInput(gameName ? `${p.text} for ${gameName}` : p.text);
                }}
                style={{
                  width: "100%",
                  minHeight: 34,
                  ...presetButtonSurface,
                  fontSize: 12,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {p.text}
                {p.beta && (
                  <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.55, fontStyle: "italic" }}>
                    [beta]
                  </span>
                )}
              </Button>
            ))}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div ref={unifiedInputHostRef} className="bonsai-unified-input-host" style={fullBleedRowStyle}>
            <div style={{ position: "relative", width: "100%" }}>
              <TextField
                label=""
                value={unifiedInput}
                spellCheck={false}
                style={{ width: "100%", minHeight: 94, fontSize: 14, color: "transparent", caretColor: "white" }}
                onFocus={() => { setIsUnifiedInputFocused(true); }}
                onBlur={() => { setIsUnifiedInputFocused(false); }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setUnifiedInput(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement>) => {
                  if (ev.key === "ArrowDown") {
                    if (filteredSettings.length > 0) {
                      setSelectedIndex((prev) => Math.min(prev + 1, filteredSettings.length - 1));
                      ev.preventDefault();
                    }
                    return;
                  }
                  if (ev.key === "ArrowUp") {
                    if (filteredSettings.length > 0) {
                      setSelectedIndex((prev) => Math.max(prev - 1, 0));
                      ev.preventDefault();
                    }
                    return;
                  }
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    const hasSelectedResult = selectedIndex >= 0 && selectedIndex < filteredSettings.length;
                    if (hasSelectedResult) {
                      onSettingClick(filteredSettings[selectedIndex], selectedIndex);
                      return;
                    }
                    if (!isAsking && unifiedInput.trim() && ollamaIp.trim()) {
                      (ev.currentTarget as HTMLElement).blur();
                      onAskOllama();
                    }
                  }
                }}
              />
              <div
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  left: 12,
                  right: 12,
                  top: 10,
                  bottom: 12,
                  color: isUnifiedInputFocused ? "#1d2a38" : "#c4d3e2",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  lineHeight: "1.25",
                  fontSize: 13,
                }}
              >
                {unifiedInput}
              </div>
            </div>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div
            onKeyDownCapture={(ev: React.KeyboardEvent<HTMLDivElement>) => {
              const activeEl = document.activeElement as HTMLElement | null;
              const previewActive = Boolean(activeEl?.closest(".bonsai-attachment-preview-target"));
              const removeActive = Boolean(activeEl?.closest(".bonsai-attachment-remove-target"));
              if (isRightNavigationKey(ev.key) && previewActive) {
                const removeTarget = getFocusableWithin(".bonsai-attachment-remove-target");
                if (removeTarget) {
                  ev.preventDefault();
                  ev.stopPropagation();
                  removeTarget.focus();
                }
                return;
              }
              if (isLeftNavigationKey(ev.key) && removeActive) {
                const previewTarget = getFocusableWithin(".bonsai-attachment-preview-target");
                if (previewTarget) {
                  ev.preventDefault();
                  ev.stopPropagation();
                  previewTarget.focus();
                }
                return;
              }
            }}
            style={{ ...fullBleedRowStyle, display: "flex", flexDirection: "column", gap: 6 }}
          >
            {selectedAttachment ? (
              <Focusable
                flow-children="horizontal"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 38,
                  borderRadius: 8,
                  border: "1px solid rgba(150, 187, 223, 0.62)",
                  background: "linear-gradient(180deg, rgba(64, 93, 124, 0.42) 0%, rgba(48, 71, 95, 0.42) 100%)",
                  color: "#e3edf7",
                  padding: "5px 8px",
                }}
              >
                <Button
                  className="bonsai-attachment-preview-target"
                  aria-label={`Attached screenshot ${selectedAttachment.name}`}
                  onClick={onOpenScreenshotBrowser}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 30,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 8,
                    border: "none",
                    background: "transparent",
                    color: "#e3edf7",
                    boxShadow: "none",
                  }}
                >
                  <ImageAttachmentIcon size={17} />
                  <img
                    src={selectedAttachment.preview_data_uri || toFileUri(selectedAttachment.path)}
                    alt={selectedAttachment.name}
                    style={{
                      width: 58,
                      height: 34,
                      borderRadius: 4,
                      objectFit: "cover",
                      background: "rgba(255,255,255,0.06)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "#dbe7f3",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedAttachment.name}
                    </span>
                    <span style={{ display: "block", fontSize: 8, color: "#cfdeed", fontWeight: 600, marginTop: 2 }}>
                      {formatBytes(selectedAttachment.size_bytes ?? 0)}
                    </span>
                  </div>
                </Button>
                <Button
                  className="bonsai-attachment-remove-target"
                  onClick={() => setSelectedAttachment(null)}
                  aria-label="Remove attachment"
                  style={{
                    minWidth: 36,
                    width: 36,
                    minHeight: 34,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    background: "transparent",
                    color: "#dce8f4",
                    boxShadow: "none",
                    outline: "none",
                  }}
                >
                  <ClearIcon size={18} />
                </Button>
              </Focusable>
            ) : (
              <div style={{ fontSize: 11, color: "#8ea2b8", paddingLeft: 2 }}>
                No screenshot attached.
              </div>
            )}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <Focusable
            flow-children="horizontal"
            style={{ ...fullBleedRowStyle, display: "flex", gap: 4, alignItems: "center" }}
          >
            <div
              className="bonsai-askbar-merged"
              style={{
                flex: 1,
                minHeight: 44,
                display: "flex",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(24, 35, 46, 0.9)",
              }}
            >
              <div ref={attachActionHostRef} style={{ display: "flex" }}>
                <Button
                  className="bonsai-askbar-target"
                  onClick={onOpenScreenshotBrowser}
                  disabled={isAsking}
                  aria-label="Attach screenshot"
                  style={{
                    minWidth: 42,
                    width: 42,
                    minHeight: 44,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 0,
                    border: "none",
                    background: "transparent",
                    color: "#dbe6f3",
                  }}
                >
                  <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <AttachMediaIcon size={18} />
                    {selectedAttachment && (
                      <span
                        style={{
                          position: "absolute",
                          right: -8,
                          top: -8,
                          minWidth: 14,
                          height: 14,
                          borderRadius: 999,
                          background: "#dfeaf6",
                          color: "#1d2a38",
                          fontSize: 9,
                          lineHeight: "14px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        1
                      </span>
                    )}
                  </span>
                </Button>
              </div>
              <Button
                className="bonsai-askbar-target"
                onClick={onAskOllama}
                disabled={isAsking}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 0,
                  border: "none",
                  background: "rgba(255,255,255,0.04)",
                  color: "#eef4fb",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                  <span style={{ fontWeight: 600 }}>Ask</span>
                </span>
              </Button>
              {isAsking ? (
                <Button
                  className="bonsai-askbar-target"
                  onClick={onCancelAsk}
                  aria-label="Stop generation"
                  style={{
                    minWidth: 42,
                    width: 42,
                    minHeight: 44,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 0,
                    border: "none",
                    background: "transparent",
                  }}
                >
                  <AskStopIcon size={30} />
                </Button>
              ) : (
                <Button
                  className="bonsai-askbar-target"
                  onClick={onMicInput}
                  aria-label="Voice input"
                  style={{
                    minWidth: 42,
                    width: 42,
                    minHeight: 44,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 0,
                    border: "none",
                    background: "transparent",
                    color: "#dbe6f3",
                  }}
                >
                  <AskMicIcon size={20} />
                </Button>
              )}
            </div>
            {showSearchClearButton && (
              <Button
                onClick={clearUnifiedInput}
                aria-label="Clear"
                style={{
                  minWidth: 42,
                  width: 42,
                  minHeight: 44,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...presetButtonSurface,
                  color: "#dfe8ef",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <ClearIcon size={28} />
              </Button>
            )}
          </Focusable>
        </PanelSectionRow>
        {isScreenshotBrowserOpen && (
          <PanelSectionRow>
            <Focusable
              flow-children="vertical"
              ref={screenshotBrowserHostRef}
              onKeyDown={(ev: React.KeyboardEvent<HTMLDivElement>) => {
                if (ev.key === "Escape" || ev.key === "Backspace") {
                  onCloseScreenshotBrowser();
                  ev.preventDefault();
                }
              }}
              style={{
                ...fullBleedRowStyle,
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                background: "rgba(12, 18, 25, 0.96)",
                padding: 10,
                display: "grid",
                gap: 8,
                minHeight: 320,
                position: "relative",
              }}
            >
              <Focusable flow-children="horizontal" style={{ display: "flex", gap: 8 }}>
                <Button
                  onClick={onCloseScreenshotBrowser}
                  aria-label="Back"
                  style={{ minWidth: 52, width: 52, minHeight: 34, padding: 0, ...presetButtonSurface }}
                >
                  <BackChevronIcon size={20} />
                </Button>
                <Button
                  onClick={() => {
                    void loadRecentScreenshots(24);
                  }}
                  disabled={isLoadingRecentScreenshots}
                  aria-label="Refresh screenshots"
                  style={{ minWidth: 52, width: 52, minHeight: 34, padding: 0, ...presetButtonSurface }}
                >
                  <RefreshArrowIcon size={20} />
                </Button>
              </Focusable>

              {mediaError && (
                <div style={{ color: "#f09a8d", fontSize: 11, lineHeight: 1.35 }}>
                  {mediaError}
                </div>
              )}

              {recentScreenshots.length === 0 && !isLoadingRecentScreenshots ? (
                <div style={{ color: "#9cb0c6", fontSize: 12, lineHeight: 1.4 }}>
                  No recent screenshots found. Open Steam Media and take a screenshot, then refresh.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                    alignContent: "start",
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {recentScreenshots.map((item) => (
                    <Button
                      key={item.path}
                      onClick={() => onSelectRecentScreenshot(item)}
                      style={{
                        minHeight: 144,
                        ...presetButtonSurface,
                        padding: 6,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "flex-start",
                        gap: 4,
                        textAlign: "left",
                      }}
                    >
                      <img
                        src={item.preview_data_uri || toFileUri(item.path)}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: 94,
                          objectFit: "cover",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.04)",
                        }}
                      />
                      <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 9, color: "#8ea2b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatScreenshotTimestamp(item.mtime)}
                      </span>
                      <span style={{ fontSize: 10, color: "#d9e6f4", fontWeight: 700 }}>
                        Size: {formatBytes(item.size_bytes ?? 0)}
                      </span>
                    </Button>
                  ))}
                </div>
              )}

            </Focusable>
          </PanelSectionRow>
        )}

        {navigationMessage && (
          <PanelSectionRow>
            <div style={{ color: "#81c784", fontSize: 13 }}>{navigationMessage}</div>
          </PanelSectionRow>
        )}

        {filteredSettings.length > 0 && (
          <>
            <PanelSectionRow>
              <div style={{ color: "gray", padding: "6px 0", fontSize: 13 }}>Results</div>
            </PanelSectionRow>
            {filteredSettings.map((s, i) => {
              const isQam = isQamSetting(s);
              const isSelected = i === selectedIndex;
              const parts = s.split(">").map((part) => part.trim()).filter(Boolean);
              const title = parts[parts.length - 1] ?? s;
              const breadcrumb = parts.slice(0, -1).join(" > ");
              const compactLine = isQam ? `* QAM > ${title}` : `${title}`;
              const compactSubline = isQam ? `(${breadcrumb})` : breadcrumb;

              return (
                <PanelSectionRow key={i}>
                  <Button
                    onClick={() => onSettingClick(s, i)}
                    style={{
                      width: "100%",
                      minHeight: 28,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: `1px solid ${isQam ? "rgba(243, 197, 91, 0.3)" : "rgba(255,255,255,0.1)"}`,
                      background: isSelected
                        ? isQam
                          ? "rgba(243, 197, 91, 0.22)"
                          : "rgba(255,255,255,0.14)"
                        : isQam
                          ? "rgba(243, 197, 91, 0.08)"
                          : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? "white" : isQam ? "#f2cf84" : "#d4dbe2", lineHeight: "1.15" }}>
                        {compactLine}
                      </div>
                      {compactSubline && (
                        <div style={{ fontSize: 9, color: isSelected ? "#dfe8ef" : "#9fafbc", lineHeight: "1.1", marginTop: 1 }}>
                          {compactSubline}
                        </div>
                      )}
                    </div>
                  </Button>
                </PanelSectionRow>
              );
            })}
          </>
        )}

        {isAsking && showSlowWarning && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12, padding: "6px 0" }}>
              This is taking a while (&gt;{latencyWarningSeconds}s)... If responses are consistently slow, verify Ollama is using your GPU, not CPU. CPU inference is dramatically slower.
            </div>
          </PanelSectionRow>
        )}
        {ollamaResponse && splitResponseIntoChunks(ollamaResponse).map((chunk, i, arr) => (
          <PanelSectionRow key={`ai-chunk-${i}`}>
            <Focusable
              onActivate={() => {}}
              noFocusRing={false}
              style={{
                color: "white",
                padding: "8px",
                background: "rgba(0,0,0,0.5)",
                borderRadius: i === 0 && arr.length === 1 ? 4
                  : i === 0 ? "4px 4px 0 0"
                  : i === arr.length - 1 ? "0 0 4px 4px"
                  : 0,
                whiteSpace: "pre-wrap",
                fontSize: "12px",
                lineHeight: "1.4",
                marginTop: i > 0 ? -8 : 0,
                marginBottom: i === arr.length - 1 ? 80 : 0,
              }}
            >
              {chunk}
            </Focusable>
          </PanelSectionRow>
        ))}
        {!isAsking && elapsedSeconds != null && elapsedSeconds > latencyWarningSeconds && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12 }}>
              Response took {elapsedSeconds}s (warning threshold: {latencyWarningSeconds}s) — verify Ollama is using your GPU, not CPU. CPU inference is dramatically slower.
            </div>
          </PanelSectionRow>
        )}
        {lastApplied && (lastApplied.tdp_watts != null || lastApplied.gpu_clock_mhz != null) && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12 }}>
              Applied to system successfully. If QAM Performance sliders look stale, close and reopen the QAM Performance tab to verify reflected values.
            </div>
          </PanelSectionRow>
        )}
        {ollamaContext && (
          <PanelSectionRow>
            <div style={{ color: "#9fb7d5", fontSize: 13 }}>
              {ollamaContext.app_context === "active" && ollamaContext.app_id
                ? `Context: active game AppID ${ollamaContext.app_id}`
                : "Context: no active game detected"}
            </div>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div style={{ color: "#8b929a", fontSize: 11, fontStyle: "italic", lineHeight: "1.35" }}>
            Search Steam or QAM settings. Tap a result in the dropdown to open that setting.
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ color: "#8b929a", fontSize: 11, fontStyle: "italic", lineHeight: "1.35" }}>
            Press Enter to run action, Shift+Enter for a new line.
          </div>
        </PanelSectionRow>
      </PanelSection>
    </>
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
    <div className="bonsai-scope">
      <style>{`
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
        }
        .bonsai-scope [class*="PanelSectionRow"] > div {
          width: 100% !important;
          max-width: 100% !important;
        }
        .bonsai-scope .bonsai-unified-input-host input::placeholder {
          font-size: 12px;
        }
        .bonsai-scope .bonsai-unified-input-host input {
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
        }
        .bonsai-scope .bonsai-askbar-merged {
          transition: box-shadow 120ms ease, border-color 120ms ease;
        }
        .bonsai-scope .bonsai-askbar-merged:focus-within {
          border-color: rgba(171, 199, 232, 0.85) !important;
          box-shadow: 0 0 0 1px rgba(171, 199, 232, 0.55);
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
          { id: "main", title: <BonsaiLogoIcon size={30} zoom={1.66} offsetX={-1.1} offsetY={-0.9} />, content: mainTab },
          { id: "settings", title: <GearIcon size={26} />, content: settingsTab },
          { id: "debug", title: <BugIcon size={26} />, content: debugTab },
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
