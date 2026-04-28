import React, { useCallback, useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { definePlugin, toaster, call } from "@decky/api";
import { Navigation, Router, showModal, ConfirmModal, Tabs } from "@decky/ui";

import { PLUGIN_VERSION } from "./pluginVersion";
import {
  buildResponseText,
  DEFAULT_LATENCY_WARNING_SECONDS,
  DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE,
  normalizeAiCharacterCustomText,
  normalizeAiCharacterPresetId,
  toBonsaiSettingsPayload,
  type AskModeId,
  type BonsaiSettings,
} from "./utils/settingsAndResponse";
import { AboutTab } from "./components/AboutTab";
import { BonsaiPluginShell } from "./components/BonsaiPluginShell";
import { CharacterPickerModal } from "./components/CharacterPickerModal";
import { DesktopNoteSaveModal } from "./components/DesktopNoteSaveModal";
import { DebugTab } from "./components/DebugTab";
import { MainTab } from "./components/MainTab";
import { PluginHelpModal } from "./components/PluginHelpModal";
import { PermissionsTab } from "./components/PermissionsTab";
import { SettingsTab } from "./components/SettingsTab";
import { getSteamInputLexiconEntry } from "./data/steam-input-lexicon";
import { jumpToSteamInputEntry } from "./utils/steamInputJump";
import type { InputTransparencyRpcResult, TransparencySnapshot } from "./utils/inputTransparency";
import {
  formatAiCharacterSelectionLine,
  resolveMainTabAvatarBadgeLetter,
  resolveMainTabAvatarPresetId,
} from "./data/characterCatalog";
import { buildBonsaiScopeAccentInlineStyle, resolveUiAccentFromCharacterSettings } from "./data/characterUiAccent";
import { detectPromptCategory, getContextualPresets, getRandomPresets, type PresetPrompt } from "./data/presets";
import {
  CUSTOM_RESOLUTION_INPUT_PREFIX,
  isStrategyCustomResolutionBranch,
  STRATEGY_FOLLOWUP_PREFIX,
} from "./data/strategyGuideFollowup";
import {
  INPUT_SANITIZER_COMMAND_DISABLE,
  INPUT_SANITIZER_COMMAND_ENABLE,
} from "./data/inputSanitizerCommands";
import {
  AboutTabTitleIcon,
  BonsaiTreeTabIcon,
  BonsaiSvgIcon,
  BugIcon,
  GearIcon,
  LockIcon,
} from "./components/icons";
import { MODEL_POLICY_README_URL, type ModelPolicyDisclosurePayload, type ModelPolicyTierId } from "./data/modelPolicy";
import { SETTINGS_DATABASE } from "./data/settingsDatabase";
import {
  ASK_LABEL_COLOR_50,
  BONSAI_FOREST_GREEN,
  SETTINGS_SEARCH_MIN_QUERY_LENGTH,
  TAB_TITLE_DEBUG_TAB_ICON_PX,
  TAB_TITLE_ICON_PX,
  TAB_TITLE_MAIN_TAB_ICON_PX,
} from "./features/unified-input/constants";
import { useUnifiedInputSurface } from "./features/unified-input/useUnifiedInputSurface";
import { normalizeStrategyGuideBranches } from "./utils/strategyGuideBranches";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "./utils/deckyCall";
import { usePluginSettings } from "./hooks/usePluginSettings";
import { getQamTab, getSteamSettingsUrl, isQamSetting } from "./data/steamSettingsNavigation";
import type {
  AppliedResult,
  AskAttachment,
  AskThreadCollapsedTurn,
  OllamaContextUi,
  ScreenshotItem,
  StrategyGuideBranchesPayload,
} from "./types/bonsaiUi";

/**
 * If Decky unmounts plugin `Content` when `showModal` closes, React state resets to defaults; this
 * outlives the component so `useLayoutEffect` can restore the tab on the next mount. Used for any
 * fullscreen modal (character picker, model policy, permissions confirm, clear session, etc.).
 */
let __bonsaiTabRestoreAfterModal: string | null = null;

/**
 * Preserves “plugin help chip dismissed” across Decky remounting `Content` when `showModal`
 * opens/closes (same lifecycle issue as {@link __bonsaiTabRestoreAfterModal}).
 */
let __bonsaiPluginHelpDismissed = false;

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

type ShortcutSetupKind = "deck" | "stadia";

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
  /** Set when the Ask was a bonsai:shortcut-setup-* keyword (no Ollama). */
  shortcut_setup?: ShortcutSetupKind;
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
  strategy_guide_branches?: StrategyGuideBranchesPayload | null;
  model_policy_disclosure?: ModelPolicyDisclosurePayload | null;
  /** Present when the completed Ask was a shortcut-setup keyword. */
  shortcut_setup?: ShortcutSetupKind | null;
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
  classSuffix: "main" | "settings" | "permissions" | "debug" | "about",
  children: React.ReactNode,
): React.ReactElement {
  return (
    <div className="bonsai-tab-title-leaf">
      <div className={`bonsai-tab-title-shell bonsai-tab-title-shell--${classSuffix}`}>
        <span className={`bonsai-tab-title-icon bonsai-tab-title-icon--${classSuffix}`}>{children}</span>
      </div>
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
    const pending = __bonsaiTabRestoreAfterModal;
    if (pending != null) {
      __bonsaiTabRestoreAfterModal = null;
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
  const [strategyGuideBranches, setStrategyGuideBranches] = useState<StrategyGuideBranchesPayload | null>(null);
  const [modelPolicyDisclosure, setModelPolicyDisclosure] = useState<ModelPolicyDisclosurePayload | null>(null);
  const [shortcutSetupVariant, setShortcutSetupVariant] = useState<ShortcutSetupKind | null>(null);
  const lastStrategyAskQuestionRef = useRef<string>("");
  const pendingArchiveTurnRef = useRef<{ question: string; answer: string } | null>(null);
  /** When set for the in-flight Ask, used for thread header / lastExchange.question instead of the full RPC prompt. */
  const pendingThreadQuestionDisplayRef = useRef<string | null>(null);
  const lastFlushedExchangeQuestionRef = useRef<string>("");
  const [askThreadCollapsed, setAskThreadCollapsed] = useState<AskThreadCollapsedTurn[]>([]);
  const askThreadCollapsedRef = useRef<AskThreadCollapsedTurn[]>([]);
  useEffect(() => {
    askThreadCollapsedRef.current = askThreadCollapsed;
  }, [askThreadCollapsed]);
  const [askThreadViewIndex, setAskThreadViewIndex] = useState<number | null>(null);
  const [askThreadDisplayQuestion, setAskThreadDisplayQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [lastApplied, setLastApplied] = useState<AppliedResult | null>(null);
  const [pluginHelpDismissed, setPluginHelpDismissed] = useState(() => __bonsaiPluginHelpDismissed);
  const [suggestedPrompts, setSuggestedPrompts] = useState<PresetPrompt[]>(() => getRandomPresets(3));
  useEffect(() => {
    __bonsaiPluginHelpDismissed = pluginHelpDismissed;
  }, [pluginHelpDismissed]);
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

  const {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    screenshotAttachmentPreset,
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
    setLatencyTimeoutsCustomEnabled,
    setUnifiedInputPersistenceMode,
    setScreenshotAttachmentPreset,
    setDesktopDebugNoteAutoSave,
    setDesktopAskVerboseLogging,
    setPresetChipFadeAnimationEnabled,
    setInputSanitizerUserDisabled,
    askMode,
    setAskMode,
    ollamaKeepAlive,
    setOllamaKeepAlive,
    showDebugTab,
    setShowDebugTab,
    modelPolicyTier,
    setModelPolicyTier,
    modelPolicyNonFossUnlocked,
    setModelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    setModelAllowHighVramFallbacks,
    hydrateFromSettings,
  } = usePluginSettings();

  const effectiveLatencyWarningSeconds = useMemo(
    () => (latencyTimeoutsCustomEnabled ? latencyWarningSeconds : DEFAULT_LATENCY_WARNING_SECONDS),
    [latencyTimeoutsCustomEnabled, latencyWarningSeconds]
  );

  const uiAccent = useMemo(
    () =>
      resolveUiAccentFromCharacterSettings({
        ai_character_enabled: aiCharacterEnabled,
        ai_character_random: aiCharacterRandom,
        ai_character_preset_id: aiCharacterPresetId,
        ai_character_custom_text: aiCharacterCustomText,
      }),
    [aiCharacterEnabled, aiCharacterRandom, aiCharacterPresetId, aiCharacterCustomText]
  );
  const bonsaiScopeAccentStyle = useMemo(() => buildBonsaiScopeAccentInlineStyle(uiAccent), [uiAccent]);

  useEffect(() => {
    if (!showDebugTab && currentTab === "debug") {
      setCurrentTab("main");
      toaster.toast({ title: "Debug tab hidden", body: "Switched to Main.", duration: 2800 });
    }
  }, [showDebugTab, currentTab]);

  useEffect(() => {
    if (askMode !== "strategy") {
      setStrategyGuideBranches(null);
    }
  }, [askMode]);

  useEffect(() => {
    if (!lastExchange?.question?.trim()) return;
    const qn = lastExchange.question.trim();
    if (lastFlushedExchangeQuestionRef.current === qn) return;
    pendingArchiveTurnRef.current = { question: lastExchange.question, answer: lastExchange.answer };
  }, [lastExchange]);

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

  const onSelectModelPolicyTier = useCallback(
    (t: ModelPolicyTierId) => {
      if (t === "non_foss" && !modelPolicyNonFossUnlocked) {
        toaster.toast({
          title: "Unlock required",
          body: "Turn on “Allow non-FOSS and unclassified tags” in Permissions → Model policy before Tier 3.",
          duration: 5000,
        });
        return;
      }
      setModelPolicyTier(t);
    },
    [modelPolicyNonFossUnlocked]
  );

  const openModelPolicyReadme = useCallback(() => {
    if (!capabilities.external_navigation) {
      toaster.toast({
        title: "Permission required",
        body: "Enable External and Steam navigation in the Permissions tab.",
        duration: 4500,
      });
      goToPermissionsTab();
      return;
    }
    try {
      Navigation.NavigateToExternalWeb(MODEL_POLICY_README_URL);
    } catch {
      toaster.toast({ title: "README", body: MODEL_POLICY_README_URL, duration: 4000 });
    }
  }, [capabilities.external_navigation, goToPermissionsTab]);

  const onOpenControllerSettingsForShortcut = useCallback(() => {
    if (!capabilities.external_navigation) {
      toaster.toast({
        title: "Permission required",
        body: "Enable External and Steam navigation in the Permissions tab to open Controller settings from bonsAI.",
        duration: 4500,
      });
      goToPermissionsTab();
      return;
    }
    try {
      const steamUrlApi = SteamClient.URL as unknown as SteamUrlApi;
      steamUrlApi.ExecuteSteamURL(getSteamSettingsUrl("Settings > Controller"));
      toaster.toast({ title: "Opening settings", body: "Controller", duration: 2000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toaster.toast({ title: "Navigation failed", body: message, duration: 3000 });
    }
  }, [capabilities.external_navigation, goToPermissionsTab]);

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

  // --- Slow-response warning timer ---
  useEffect(() => {
    if (!isAsking) {
      setShowSlowWarning(false);
      return;
    }
    const timer = setTimeout(() => setShowSlowWarning(true), effectiveLatencyWarningSeconds * 1000);
    return () => clearTimeout(timer);
  }, [isAsking, effectiveLatencyWarningSeconds]);

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
      setStrategyGuideBranches(null);
      setModelPolicyDisclosure(null);
      return;
    }

    if (status.status === "completed" || status.status === "failed") {
      const applied = status.applied ?? null;
      setOllamaContext({ app_id: appId, app_context: appContext });
      setIsAsking(false);
      setShortcutSetupVariant(
        status.status === "completed" && status.success ? status.shortcut_setup ?? null : null
      );
      setOllamaResponse(buildResponseText(status.response ?? "No response text.", applied));
      setLastApplied(applied);
      setElapsedSeconds(Number.isFinite(status.elapsed_seconds) ? status.elapsed_seconds : null);

      if (status.status === "completed" && status.success) {
        const q = (status.question || fallbackQuestion || "").trim();
        const answer = buildResponseText(status.response ?? "No response text.", applied);
        const disc = status.model_policy_disclosure;
        setModelPolicyDisclosure(
          disc && typeof disc === "object" && typeof (disc as ModelPolicyDisclosurePayload).model === "string"
            ? (disc as ModelPolicyDisclosurePayload)
            : null
        );
        if (q) {
          const category = detectPromptCategory(q);
          setSuggestedPrompts(getContextualPresets(category, 3));
          const displayQ = (pendingThreadQuestionDisplayRef.current?.trim() || q).trim();
          pendingThreadQuestionDisplayRef.current = null;
          setLastExchange({ question: displayQ, answer });
          lastStrategyAskQuestionRef.current = q;
          setStrategyGuideBranches(normalizeStrategyGuideBranches(status.strategy_guide_branches));

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
          setStrategyGuideBranches(null);
          pendingArchiveTurnRef.current = null;
          pendingThreadQuestionDisplayRef.current = null;
        }
      } else {
        setLastExchange(null);
        setStrategyGuideBranches(null);
        setModelPolicyDisclosure(null);
        pendingArchiveTurnRef.current = null;
        pendingThreadQuestionDisplayRef.current = null;
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
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setShortcutSetupVariant(null);
    pendingArchiveTurnRef.current = null;
    pendingThreadQuestionDisplayRef.current = null;
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
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setShortcutSetupVariant(null);
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
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setShortcutSetupVariant(null);
  };

  const resetPluginSession = useCallback(() => {
    if (isAsking) {
      invalidateRequests();
      setIsAsking(false);
    }
    persistSearchQuery("");
    setUnifiedInput("");
    setSelectedIndex(-1);
    setNavigationMessage("");
    setOllamaResponse("");
    setOllamaContext(null);
    setLastApplied(null);
    setLastExchange(null);
    setStrategyGuideBranches(null);
    setSelectedAttachment(null);
    setElapsedSeconds(null);
    setShowSlowWarning(false);
    setAskThreadCollapsed([]);
    setAskThreadViewIndex(null);
    setAskThreadDisplayQuestion("");
    setLastTransparency(null);
    setModelPolicyDisclosure(null);
    setShortcutSetupVariant(null);
    toaster.toast({
      title: "Session cleared",
      body: "Unified search, reply, thread, transparency, and attachments were reset.",
      duration: 3800,
    });
  }, [isAsking, invalidateRequests]);

  const onClearAllPluginData = useCallback(async () => {
    try {
      const defaults = await call<[], BonsaiSettings>("clear_plugin_data");
      hydrateFromSettings(defaults);
      try {
        window.localStorage.removeItem(IP_STORAGE_KEY);
        window.localStorage.removeItem(DISCLAIMER_STORAGE_KEY);
        window.localStorage.removeItem(UNIFIED_INPUT_STORAGE_KEY);
        window.sessionStorage.removeItem(AUTO_SAVED_RESPONSE_IDS_KEY);
      } catch {
        /* ignore */
      }
      setOllamaIp(IP_DEFAULT);
      __bonsaiPluginHelpDismissed = false;
      setPluginHelpDismissed(false);
      setSuggestedPrompts(getRandomPresets(3));
      resetPluginSession();
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
          onOK={() => {
            markDisclaimerAccepted();
          }}
        />
      );
      toaster.toast({
        title: "Plugin data cleared",
        body: "Settings and local plugin storage were reset. Re-enter your Ollama host and permissions as needed.",
        duration: 4500,
      });
    } catch (e: unknown) {
      toaster.toast({
        title: "Clear failed",
        body: formatDeckyRpcError(e),
        duration: 5000,
      });
    }
  }, [hydrateFromSettings, resetPluginSession]);

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

  const onAskOllama = async (
    overrideQuestion?: string,
    opts?: { threadQuestionDisplay?: string },
  ) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise((r) => setTimeout(r, 50));

    const q = (overrideQuestion ?? unifiedInput).trim();
    const ip = ollamaIp.trim();
    if (!q || !ip) {
      if (!ip) {
        toaster.toast({ title: "PC IP required", body: "Set your Ollama PC IP before asking.", duration: 4000 });
      } else if (!q) {
        toaster.toast({ title: "Question required", body: "Type a question in the ask field first.", duration: 3500 });
      }
      return;
    }

    const arch = pendingArchiveTurnRef.current;
    if (arch && arch.question.trim() && arch.answer.trim()) {
      setAskThreadCollapsed((prev) => [
        ...prev,
        { id: `turn-${Date.now()}-${prev.length}`, question: arch.question, answer: arch.answer },
      ]);
      lastFlushedExchangeQuestionRef.current = arch.question.trim();
    }
    pendingArchiveTurnRef.current = null;
    setAskThreadViewIndex(null);
    pendingThreadQuestionDisplayRef.current = opts?.threadQuestionDisplay?.trim() || null;
    setAskThreadDisplayQuestion(pendingThreadQuestionDisplayRef.current ?? q);

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
    setStrategyGuideBranches(null);
    setModelPolicyDisclosure(null);
    setShortcutSetupVariant(null);
    setLastTransparency(null);
    setOllamaResponse("Thinking...");
    setLastApplied(null);
    setElapsedSeconds(null);
    setOllamaContext({
      app_id: appId,
      app_context: appId ? "active" : "none",
    });
    try {
      const data = await call<
        [
          {
            question: string;
            PcIp: string;
            appId: string;
            appName: string;
            attachments: AskAttachment[];
            ask_mode: AskModeId;
          },
        ],
        BackgroundStartResponse
      >("start_background_game_ai", { question: q, PcIp: ip, appId, appName, attachments, ask_mode: askMode });

      if (!isRequestActive(seq)) return;

      if (data.status === "invalid") {
        setIsAsking(false);
        setOllamaResponse(data.response ?? "Request is invalid.");
        setLastApplied(null);
        setElapsedSeconds(null);
        pendingThreadQuestionDisplayRef.current = null;
        return;
      }

      if (data.status === "blocked") {
        setIsAsking(false);
        setOllamaResponse(data.response ?? "That input was not sent.");
        setLastApplied(null);
        setElapsedSeconds(null);
        setOllamaContext({ app_id: appId, app_context: appId ? "active" : "none" });
        void refreshInputTransparency();
        pendingThreadQuestionDisplayRef.current = null;
        toaster.toast({
          title: "Input not sent",
          body: data.response ?? "Blocked by input checks.",
          duration: 5000,
        });
        return;
      }

      setUnifiedInput("");
      setSelectedAttachment(null);

      if (data.status === "completed" && data.success) {
        if (!isRequestActive(seq)) return;
        const now = Date.now() / 1000;
        const terminal: BackgroundRequestStatus = {
          status: "completed",
          request_id: data.request_id ?? null,
          question: q,
          app_id: data.app_id ?? appId,
          app_context: (appId ? "active" : "none") as "active" | "none",
          success: true,
          response: data.response ?? "",
          applied: data.applied ?? null,
          elapsed_seconds: Number.isFinite(data.elapsed_seconds) ? Number(data.elapsed_seconds) : 0,
          error: null,
          started_at: now,
          completed_at: now,
          strategy_guide_branches: null,
          model_policy_disclosure: null,
          shortcut_setup: data.shortcut_setup ?? null,
        };
        applyBackgroundStatusToUi(terminal, "");
        saveIp(ip);
        if (unifiedInputPersistenceMode === "persist_search_only") {
          persistSearchQuery("");
        }
        if (data.meta === "shortcut_setup") {
          toaster.toast({
            title: "Quick-launch help",
            body: "In-app guide only; tune the chord in Controller settings. See full recipe in docs.",
            duration: 5000,
          });
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
      setStrategyGuideBranches(null);
      pendingThreadQuestionDisplayRef.current = null;
    }
  };

  const onStrategyBranchPick = (opt: { id: string; label: string }) => {
    if (isStrategyCustomResolutionBranch(opt)) {
      setStrategyGuideBranches(null);
      setUnifiedInput(CUSTOM_RESOLUTION_INPUT_PREFIX);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const root = unifiedInputFieldLayerRef.current ?? unifiedInputHostRef.current;
          if (!root) return;
          const field = root.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input");
          if (!field) return;
          field.focus();
          const len = field.value.length;
          try {
            field.setSelectionRange(len, len);
          } catch {
            // decky field quirks
          }
        });
      });
      return;
    }
    if (lastExchange?.question?.trim() && lastExchange?.answer?.trim()) {
      const qn = lastExchange.question.trim();
      if (lastFlushedExchangeQuestionRef.current !== qn) {
        pendingArchiveTurnRef.current = {
          question: lastExchange.question,
          answer: lastExchange.answer,
        };
      }
    }
    const prior = lastStrategyAskQuestionRef.current.trim();
    const composed = [
      `${STRATEGY_FOLLOWUP_PREFIX} I'm at: ${opt.label}.`,
      prior ? `Earlier I asked: ${prior}` : "",
      "",
      "Give controller-friendly coaching for this exact point, then end with **If you want to cheat…** as instructed.",
    ]
      .filter((line) => line.length > 0)
      .join("\n");
    setUnifiedInput(composed);
    void onAskOllama(composed, { threadQuestionDisplay: `I'm at: ${opt.label}` });
  };

  const fullBleedRowStyle: React.CSSProperties = {
    width: "calc(100% + 24px)",
    marginLeft: -12,
    marginRight: -10,
    boxSizing: "border-box",
  };

  const presetButtonSurface: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.03)",
    color: "#93a3b0",
  };
  const showSearchClearButton = Boolean(unifiedInput.trim());

  const armPostPickerTabLock = useCallback((back: string) => {
    if (back === "main") {
      postPickerTabLockRef.current = null;
      return;
    }
    postPickerTabLockRef.current = { until: Date.now() + 750, tab: back };
  }, []);

  /** Call after any `showModal` closes so the active tab is restored (Decky can reset to main on dismiss). */
  const finalizeShowModalAndRestoreActiveTab = useCallback(
    (close: () => void) => {
      const back = characterPickerReturnTabRef.current;
      __bonsaiTabRestoreAfterModal = back;
      armPostPickerTabLock(back);
      setCurrentTab(back);
      close();
      window.setTimeout(() => {
        setCurrentTab(back);
        __bonsaiTabRestoreAfterModal = null;
      }, 80);
    },
    [armPostPickerTabLock]
  );

  const openPluginHelpModal = useCallback(() => {
    __bonsaiPluginHelpDismissed = true;
    setPluginHelpDismissed(true);
    characterPickerReturnTabRef.current = currentTab;
    const handle = showModal(
      <PluginHelpModal onClose={() => finalizeShowModalAndRestoreActiveTab(() => handle.Close())} />
    );
  }, [currentTab, finalizeShowModalAndRestoreActiveTab]);

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
    characterPickerReturnTabRef.current = currentTab;
    const handle = showModal(
      <DesktopNoteSaveModal
        strDescriptionPrefix={
          "This appends to a file on your Steam Deck Desktop (not the PC running Ollama).\n\n" +
          "Folder: Desktop/BonsAI_notes/\n" +
          "Existing notes are never replaced; new entries are appended with a timestamp.\n\n" +
          "Proceed only if you want this question and answer saved there."
        }
        defaultStem="bonsai-debug"
        onCancel={() => finalizeShowModalAndRestoreActiveTab(() => handle.Close())}
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
              finalizeShowModalAndRestoreActiveTab(() => handle.Close());
            } else {
              toaster.toast({ title: "Save failed", body: result.error ?? "Unknown error.", duration: 5000 });
            }
          } catch (e: unknown) {
            toaster.toast({ title: "Save failed", body: formatDeckyRpcError(e), duration: 5000 });
          }
        }}
      />
    );
  }, [lastExchange, capabilities.filesystem_write, goToPermissionsTab, currentTab, finalizeShowModalAndRestoreActiveTab]);

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
          finalizeShowModalAndRestoreActiveTab(() => handle.Close());
        }}
        onOK={(next) => {
          const pid = normalizeAiCharacterPresetId(next.presetId);
          const ctxt = normalizeAiCharacterCustomText(next.customText);
          setAiCharacterRandom(next.random);
          setAiCharacterPresetId(pid);
          setAiCharacterCustomText(ctxt);
          // Persist immediately so a debounced save scheduled before the modal cannot overwrite with stale random/character state.
          void call<[BonsaiSettings], BonsaiSettings>(
            "save_settings",
            toBonsaiSettingsPayload(
              {
                latencyWarningSeconds,
                requestTimeoutSeconds,
                latencyTimeoutsCustomEnabled,
                unifiedInputPersistenceMode,
                screenshotAttachmentPreset,
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
                ollamaKeepAlive,
                showDebugTab,
                modelPolicyTier,
                modelPolicyNonFossUnlocked,
                modelAllowHighVramFallbacks,
              },
              {
                ai_character_random: next.random,
                ai_character_preset_id: pid,
                ai_character_custom_text: ctxt,
              }
            )
          ).catch((err) => {
            console.error("save_settings failed (character picker OK)", err);
          });
          finalizeShowModalAndRestoreActiveTab(() => handle.Close());
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
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    capabilities,
    setAiCharacterRandom,
    setAiCharacterPresetId,
    setAiCharacterCustomText,
    finalizeShowModalAndRestoreActiveTab,
    askMode,
    ollamaKeepAlive,
    showDebugTab,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
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

  const mainTabAvatarBadgeLetter = resolveMainTabAvatarBadgeLetter({
    enabled: aiCharacterEnabled,
    random: aiCharacterRandom,
    presetId: aiCharacterPresetId,
    customText: aiCharacterCustomText,
  });

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
      key="bonsai-main-tab"
      fullBleedRowStyle={fullBleedRowStyle}
      presetButtonSurface={presetButtonSurface}
      suggestedPrompts={suggestedPrompts}
      showPluginHelpChip={!pluginHelpDismissed}
      onOpenPluginHelp={openPluginHelpModal}
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
      latencyWarningSeconds={effectiveLatencyWarningSeconds}
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
      aiCharacterAvatarBadgeLetter={mainTabAvatarBadgeLetter}
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
      strategyGuideBranches={strategyGuideBranches}
      onStrategyBranchPick={onStrategyBranchPick}
      onPresetPreferAskMode={setAskMode}
      askThreadCollapsed={askThreadCollapsed}
      askThreadDisplayQuestion={askThreadDisplayQuestion}
      askThreadViewIndex={askThreadViewIndex}
      onAskThreadSelectTurn={(i) => setAskThreadViewIndex(i)}
      modelPolicyDisclosure={modelPolicyDisclosure}
      onOpenModelPolicyReadme={openModelPolicyReadme}
      shortcutSetupVariant={shortcutSetupVariant}
      onOpenControllerSettings={onOpenControllerSettingsForShortcut}
    />
  );

  const settingsTab = (
    <SettingsTab
      ollamaIp={ollamaIp}
      onOllamaIpChange={setOllamaIp}
      onPersistOllamaIp={saveIp}
      latencyWarningSeconds={latencyWarningSeconds}
      requestTimeoutSeconds={requestTimeoutSeconds}
      latencyTimeoutsCustomEnabled={latencyTimeoutsCustomEnabled}
      setLatencyTimeoutsCustomEnabled={setLatencyTimeoutsCustomEnabled}
      setLatencyWarningSeconds={setLatencyWarningSeconds}
      setRequestTimeoutSeconds={setRequestTimeoutSeconds}
      ollamaKeepAlive={ollamaKeepAlive}
      setOllamaKeepAlive={setOllamaKeepAlive}
      screenshotAttachmentPreset={screenshotAttachmentPreset}
      setScreenshotAttachmentPreset={setScreenshotAttachmentPreset}
      unifiedInputPersistenceMode={unifiedInputPersistenceMode}
      setUnifiedInputPersistenceMode={setUnifiedInputPersistenceMode}
      presetChipFadeAnimationEnabled={presetChipFadeAnimationEnabled}
      setPresetChipFadeAnimationEnabled={setPresetChipFadeAnimationEnabled}
      aiCharacterEnabled={aiCharacterEnabled}
      setAiCharacterEnabled={setAiCharacterEnabled}
      aiCharacterRandom={aiCharacterRandom}
      aiCharacterPresetId={aiCharacterPresetId}
      aiCharacterCustomText={aiCharacterCustomText}
      aiCharacterAccentIntensity={aiCharacterAccentIntensity}
      setAiCharacterAccentIntensity={setAiCharacterAccentIntensity}
      showDebugTab={showDebugTab}
      setShowDebugTab={setShowDebugTab}
      desktopDebugNoteAutoSave={desktopDebugNoteAutoSave}
      setDesktopDebugNoteAutoSave={setDesktopDebugNoteAutoSave}
      desktopAskVerboseLogging={desktopAskVerboseLogging}
      setDesktopAskVerboseLogging={setDesktopAskVerboseLogging}
      onOpenCharacterPicker={openCharacterPickerModal}
      onBeforeDeckyModal={() => {
        characterPickerReturnTabRef.current = currentTab;
      }}
      onCompleteDeckyModalClose={finalizeShowModalAndRestoreActiveTab}
      onResetSession={resetPluginSession}
      onClearAllPluginData={onClearAllPluginData}
    />
  );


  /** Persist immediately: Decky can unmount `Content` when the disclaimer modal closes, which drops in-memory state and cancels the debounced save. */
  const onConfirmEnableHardwareControl = useCallback(() => {
    setCapabilities((prev) => {
      const next = { ...prev, hardware_control: true };
      void call<[BonsaiSettings], BonsaiSettings>(
        "save_settings",
        toBonsaiSettingsPayload({
          latencyWarningSeconds,
          requestTimeoutSeconds,
          latencyTimeoutsCustomEnabled,
          unifiedInputPersistenceMode,
          screenshotAttachmentPreset,
          desktopDebugNoteAutoSave,
          desktopAskVerboseLogging,
          presetChipFadeAnimationEnabled,
          inputSanitizerUserDisabled,
          capabilities: next,
          aiCharacterEnabled,
          aiCharacterRandom,
          aiCharacterPresetId,
          aiCharacterCustomText,
          aiCharacterAccentIntensity,
          askMode,
          ollamaKeepAlive,
          showDebugTab,
          modelPolicyTier,
          modelPolicyNonFossUnlocked,
          modelAllowHighVramFallbacks,
        })
      ).catch((err) => {
        console.error("save_settings failed (hardware control confirm)", err);
      });
      return next;
    });
  }, [
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    setCapabilities,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    askMode,
    ollamaKeepAlive,
    showDebugTab,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
  ]);

  const permissionsTab = (
    <PermissionsTab
      capabilities={capabilities}
      setCapabilities={setCapabilities}
      onConfirmEnableHardwareControl={onConfirmEnableHardwareControl}
      onReadModelPolicy={openModelPolicyReadme}
      modelPolicyTier={modelPolicyTier}
      onSelectModelPolicyTier={onSelectModelPolicyTier}
      setModelPolicyNonFossUnlocked={setModelPolicyNonFossUnlocked}
      modelPolicyNonFossUnlocked={modelPolicyNonFossUnlocked}
      setModelAllowHighVramFallbacks={setModelAllowHighVramFallbacks}
      modelAllowHighVramFallbacks={modelAllowHighVramFallbacks}
      onBeforeDeckyModal={() => {
        characterPickerReturnTabRef.current = currentTab;
      }}
      onCompleteDeckyModalClose={finalizeShowModalAndRestoreActiveTab}
    />
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

  const deckyTabs = useMemo(
    () => {
      const rows: Array<{ id: string; title: React.ReactElement; content: React.ReactNode }> = [
        {
          id: "main",
          title: bonsaiTabIconTitle("main", <BonsaiTreeTabIcon size={TAB_TITLE_MAIN_TAB_ICON_PX} />),
          content: mainTab,
        },
        {
          id: "settings",
          title: bonsaiTabIconTitle("settings", <GearIcon size={TAB_TITLE_ICON_PX} />),
          content: settingsTab,
        },
        {
          id: "permissions",
          title: bonsaiTabIconTitle("permissions", <LockIcon size={TAB_TITLE_ICON_PX} />),
          content: (
            <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
              {permissionsTab}
            </div>
          ),
        },
      ];
      if (showDebugTab) {
        rows.push({
          id: "debug",
          title: bonsaiTabIconTitle("debug", <BugIcon size={TAB_TITLE_DEBUG_TAB_ICON_PX} />),
          content: <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight">{debugTab}</div>,
        });
      }
      rows.push({
        id: "about",
        title: bonsaiTabIconTitle("about", <AboutTabTitleIcon size={TAB_TITLE_ICON_PX} />),
        content: <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight">{aboutTab}</div>,
      });
      return rows;
    },
    [showDebugTab, mainTab, settingsTab, permissionsTab, debugTab, aboutTab]
  );

  return (
    <BonsaiPluginShell scopeRef={bonsaiScopeRef} scopeStyle={bonsaiScopeAccentStyle}>
      <div className="bonsai-decky-tabs-root">
        <Tabs activeTab={currentTab} onShowTab={onTabsShowTab} tabs={deckyTabs} />
      </div>
    </BonsaiPluginShell>
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
        title={`bonsAI v${PLUGIN_VERSION}`}
        style={{
          fontVariant: "small-caps",
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "rgba(236, 240, 245, 0.96)",
          WebkitTextStroke: `1.25px ${BONSAI_FOREST_GREEN}`,
          paintOrder: "stroke fill",
        }}
      >
        bonsAI
        <sub
          style={{
            fontVariant: "normal",
            fontSize: "0.46em",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: ASK_LABEL_COLOR_50,
            marginLeft: "0.38em",
            lineHeight: 1,
            verticalAlign: "baseline",
            position: "relative",
            bottom: "-0.2em",
            WebkitTextStroke: "0 transparent",
            paintOrder: "normal",
          }}
        >
          v{PLUGIN_VERSION}
        </sub>
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
