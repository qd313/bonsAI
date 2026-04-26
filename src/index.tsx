import React, { useCallback, useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { definePlugin, toaster, call } from "@decky/api";
import { Navigation, Router, showModal, ConfirmModal, Tabs } from "@decky/ui";
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
import { CharacterPickerModal } from "./components/CharacterPickerModal";
import { DesktopNoteSaveModal } from "./components/DesktopNoteSaveModal";
import { DebugTab } from "./components/DebugTab";
import { MainTab } from "./components/MainTab";
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
  ASK_LABEL_COLOR,
  ASK_LABEL_READY_COLOR,
  ASK_READY_STATE_TRANSITION_MS,
  BONSAI_FOREST_GREEN,
  SETTINGS_SEARCH_MIN_QUERY_LENGTH,
  TAB_TITLE_DEBUG_TAB_ICON_PX,
  TAB_TITLE_ICON_PX,
  TAB_TITLE_MAIN_TAB_ICON_PX,
  TAB_TITLE_MAIN_ICON_SHIFT_X_PX,
  TAB_STRIP_BODY_GAP_PX,
  TAB_TITLE_TAB_CELL_PX,
  TAB_TITLE_TAB_GAP_PX,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_LINE_HEIGHT,
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
  strategy_guide_branches?: StrategyGuideBranchesPayload | null;
  model_policy_disclosure?: ModelPolicyDisclosurePayload | null;
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
    toaster.toast({
      title: "Session cleared",
      body: "Unified search, reply, thread, transparency, and attachments were reset.",
      duration: 3800,
    });
  }, [isAsking, invalidateRequests]);

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
          strategy_guide_branches: null,
          model_policy_disclosure: null,
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
    <div ref={bonsaiScopeRef} className="bonsai-scope" style={bonsaiScopeAccentStyle}>
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

        /* Flushes row content with PanelSection title (counters default row inset). */
        .bonsai-scope .bonsai-settings-bleed {
          box-sizing: border-box;
          width: calc(100% + 24px);
          max-width: calc(100% + 24px);
          margin-left: -12px;
          margin-right: -12px;
        }

        .bonsai-scope .bonsai-settings-section-stack {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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
           1. DECKY TAB HOST (do not kill transitions — Steam's tab carousel uses them to slide).
           ========================================================================== */

        /* Tab host: width only — do not make this a flex column with flex-grow (Deck logs showed
           tab strip ancestors blowing past hostW ~300 with negative left; content vanished). */
        .bonsai-scope .bonsai-decky-tabs-root {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          box-sizing: border-box !important;
        }

        /* Uniform tab glyph box. Icon components use an inner IconShell <span>; logo uses <img>. */
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell {
          width: ${TAB_TITLE_TAB_CELL_PX}px !important;
          height: ${TAB_TITLE_TAB_CELL_PX}px !important;
          min-width: ${TAB_TITLE_TAB_CELL_PX}px !important;
          min-height: ${TAB_TITLE_TAB_CELL_PX}px !important;
          max-width: ${TAB_TITLE_TAB_CELL_PX}px !important;
          max-height: ${TAB_TITLE_TAB_CELL_PX}px !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--main .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--main .bonsai-tab-title-icon > span,
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--main .bonsai-tab-title-icon svg {
          width: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          height: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          min-width: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          min-height: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          max-width: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
          max-height: ${TAB_TITLE_MAIN_TAB_ICON_PX}px !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--main .bonsai-tab-title-icon {
          transform: translateX(${TAB_TITLE_MAIN_ICON_SHIFT_X_PX}px) !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--debug .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--debug .bonsai-tab-title-icon > span,
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-shell--debug .bonsai-tab-title-icon svg {
          width: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          height: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          min-width: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          min-height: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          max-width: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
          max-height: ${TAB_TITLE_DEBUG_TAB_ICON_PX}px !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-icon {
          width: ${TAB_TITLE_ICON_PX}px !important;
          height: ${TAB_TITLE_ICON_PX}px !important;
          min-width: ${TAB_TITLE_ICON_PX}px !important;
          min-height: ${TAB_TITLE_ICON_PX}px !important;
          max-width: ${TAB_TITLE_ICON_PX}px !important;
          max-height: ${TAB_TITLE_ICON_PX}px !important;
          box-sizing: border-box !important;
          color: rgba(168, 182, 198, 0.62) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-icon > span {
          width: ${TAB_TITLE_ICON_PX}px !important;
          height: ${TAB_TITLE_ICON_PX}px !important;
          min-width: ${TAB_TITLE_ICON_PX}px !important;
          min-height: ${TAB_TITLE_ICON_PX}px !important;
          max-width: ${TAB_TITLE_ICON_PX}px !important;
          max-height: ${TAB_TITLE_ICON_PX}px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-icon svg {
          width: ${TAB_TITLE_ICON_PX}px !important;
          height: ${TAB_TITLE_ICON_PX}px !important;
          max-width: ${TAB_TITLE_ICON_PX}px !important;
          max-height: ${TAB_TITLE_ICON_PX}px !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-icon img {
          width: ${TAB_TITLE_ICON_PX}px !important;
          height: ${TAB_TITLE_ICON_PX}px !important;
          max-width: ${TAB_TITLE_ICON_PX}px !important;
          max-height: ${TAB_TITLE_ICON_PX}px !important;
          object-fit: contain !important;
          box-sizing: border-box !important;
        }

        /*
          Chip sizing lives on .bonsai-tab-title-leaf only (see bonsaiTabIconTitle).
          Prior :has(.bonsai-tab-title-shell) + width:40px matched intermediate carousel Panels (H2 depth-3),
          collapsing the strip so only one tab column peeked through.
        */
        .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-title-leaf {
          box-sizing: border-box !important;
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
          min-height: 44px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          margin-left: ${TAB_TITLE_TAB_GAP_PX}px !important;
          margin-right: ${TAB_TITLE_TAB_GAP_PX}px !important;
          padding: 2px !important;
          border-radius: 12px !important;
          outline: none !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable:has(.bonsai-tab-title-leaf),
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:has(.bonsai-tab-title-leaf) {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        /*
          Current tab: very dim ring while focus is in the tab body (active strip control has no :focus-within).
          Bright ring when the strip control or its descendants hold focus / gamepad focus.
        */
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:not(:focus-within) .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:not(:focus-within) .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:not(:focus-within) .bonsai-tab-title-leaf {
          box-shadow:
            0 0 0 1px var(--bonsai-ui-tab-dim-1, rgba(82, 216, 138, 0.2)),
            0 0 6px 1px var(--bonsai-ui-tab-dim-2, rgba(34, 100, 65, 0.12)) !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:focus-within .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:focus-visible .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active.gpfocus .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:focus-within .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:focus-visible .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:focus-within .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:focus-visible .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active.gpfocus .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active.gpfocus .bonsai-tab-title-leaf {
          box-shadow:
            0 0 0 2px var(--bonsai-ui-tab-bright-1, rgba(82, 216, 138, 0.95)),
            0 0 18px 6px var(--bonsai-ui-tab-bright-2, rgba(34, 100, 65, 0.55)),
            0 0 36px 12px var(--bonsai-ui-tab-bright-3, rgba(82, 216, 138, 0.32)) !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.gpfocus:has(.bonsai-tab-title-leaf),
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.gpfocus:has(.bonsai-tab-title-leaf),
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.gpfocuswithin:has(.bonsai-tab-title-leaf),
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.gpfocuswithin:has(.bonsai-tab-title-leaf) {
          border-radius: 12px !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable:focus-visible .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:focus-visible .bonsai-tab-title-leaf {
          outline: none !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable:focus-visible:not(.Active) .bonsai-tab-title-leaf,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:focus-visible:not(.Active):not(.active) .bonsai-tab-title-leaf {
          box-shadow:
            0 0 0 2px var(--bonsai-ui-tab-focus-1, rgba(82, 216, 138, 0.92)),
            0 0 0 5px var(--bonsai-ui-tab-focus-2, rgba(82, 216, 138, 0.18)) !important;
        }

        /* No green icon glow on non-active DialogButton tabs only. Avoid Panel.Focusable:not(.Active):
           Deck nests a non-Active Focusable inside the active tab DialogButton, which matched and cleared the active icon glow. */
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:not(.Active):not(.active) .bonsai-tab-title-icon {
          filter: none !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable:focus-visible:not(.Active) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton:focus-visible:not(.Active):not(.active) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.gpfocuswithin:not(.Active) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.gpfocuswithin:not(.Active):not(.active) .bonsai-tab-title-icon {
          color: rgba(252, 252, 252, 1) !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:not(:focus-within) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:not(:focus-within) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:not(:focus-within) .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .Focusable.Active:not(:focus-within) .bonsai-tab-title-icon {
          color: rgba(252, 252, 252, 1) !important;
          filter:
            drop-shadow(0 0 2px var(--bonsai-ui-tab-icon-ds-1, rgba(82, 216, 138, 0.22)))
            drop-shadow(0 0 6px var(--bonsai-ui-tab-icon-ds-2, rgba(34, 100, 65, 0.16))) !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:focus-within .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active:focus-visible .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .Panel.Focusable.Active.gpfocus .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:focus-within .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active:focus-visible .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:focus-within .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active:focus-visible .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.Active.gpfocus .bonsai-tab-title-icon,
        .bonsai-scope .bonsai-decky-tabs-root .DialogButton.active.gpfocus .bonsai-tab-title-icon {
          filter:
            drop-shadow(0 0 6px var(--bonsai-ui-tab-icon-ds-3, rgba(82, 216, 138, 0.95)))
            drop-shadow(0 0 14px var(--bonsai-ui-tab-icon-ds-4, rgba(34, 100, 65, 0.62)))
            drop-shadow(0 0 24px var(--bonsai-ui-tab-icon-ds-5, rgba(82, 216, 138, 0.45))) !important;
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
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          height: auto !important;
          text-transform: none !important;
          
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
        }
        
        .bonsai-scope .bonsai-tab-title-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 0;
          text-transform: none !important;
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

        /* After the global TabContentsScroll reset: gap under LB/RB strip + kill stray horizontal inset
           (Deck screenshots: SETTINGS body looked right-shifted vs panel edge). */
        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] {
          margin-top: ${TAB_STRIP_BODY_GAP_PX}px !important;
          padding-top: 6px !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] > div {
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          align-self: stretch !important;
          /* H5: Deck sometimes makes this a flex column with align-items:flex-end — whole body hugs the right. */
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] > div [class*="PanelSection"] {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          align-self: stretch !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        .bonsai-scope .bonsai-decky-tabs-root [class*="PanelSectionRow"] {
          justify-content: flex-start !important;
          align-self: stretch !important;
          width: 100% !important;
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
          /* Slight left pull vs symmetric -12/-12; eased from -14 so body reads a bit more to the right. */
          margin-left: -12px !important;
          margin-right: -10px !important;
          box-sizing: border-box !important;
        }

        /* Main unified search + Ask row: small right bias vs prior 0/6 (nudge body slightly right). */
        .bonsai-scope .bonsai-unified-input-host.bonsai-full-bleed-row {
          width: calc(100% - 8px) !important;
          margin-left: 3px !important;
          margin-right: 5px !important;
        }

        /* Settings search hits — same horizontal track as unified host so results line up under the textarea. */
        .bonsai-scope .bonsai-main-search-results-pane {
          width: calc(100% - 8px) !important;
          max-width: none !important;
          min-width: 0 !important;
          margin-left: 3px !important;
          margin-right: 5px !important;
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

        .bonsai-scope .bonsai-unified-input-host input::placeholder,
        .bonsai-scope .bonsai-unified-input-host textarea::placeholder {
          font-size: ${UNIFIED_TEXT_FONT_PX}px !important;
        }

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
        .bonsai-scope .bonsai-ai-response-chunk,
        .bonsai-scope .bonsai-ai-response-stack {
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

        .bonsai-scope .bonsai-unified-input-strategy-placeholder {
          font-style: italic;
          font-size: 10px;
          opacity: 0.4;
        }

        .bonsai-scope .bonsai-ai-response-stack {
          display: flex;
          flex-direction: column;
          background: rgba(18, 26, 34, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #dadde3;
          border-radius: 4px;
          overflow: hidden;
        }

        .bonsai-scope .bonsai-ai-response-stack .bonsai-ai-response-chunk {
          background: transparent !important;
          border: none !important;
          border-radius: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .bonsai-scope .bonsai-ai-response-stack .bonsai-ai-response-chunk:last-child {
          border-bottom: none;
        }

        .bonsai-scope .bonsai-ai-response-chunk {
          background: rgba(18, 26, 34, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #dadde3;
          padding: 8px;
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
          font-size: 12px;
          line-height: 1.4;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-p {
          margin: 0 0 0.5em 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-p:last-child {
          margin-bottom: 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-ul,
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-ol {
          margin: 0.35em 0 0.5em 1.1em;
          padding: 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-li {
          margin: 0.2em 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-blockquote {
          margin: 0.4em 0;
          padding-left: 0.6em;
          border-left: 2px solid rgba(255, 255, 255, 0.2);
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-a {
          color: #7eb8ff;
          text-decoration: underline;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-inline-code {
          font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
          background: rgba(0, 0, 0, 0.28);
          padding: 0.05em 0.3em;
          border-radius: 3px;
          font-size: 0.95em;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-fenced-pre {
          margin: 0.5em 0;
          padding: 8px 10px;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-x: auto;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-fenced-code {
          font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
          font-size: 11px;
          line-height: 1.35;
          display: block;
        }

        /*
          Main-tab AIM-style transcript: column shell + bubbles. Overrides broad PanelSectionRow
          child width where needed so player bubbles stay right-aligned (fit-content) without QAM bleed.
        */
        .bonsai-scope .bonsai-chat-main-column {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        .bonsai-scope .bonsai-chat-transcript {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 8px !important;
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          padding: 0 6px 0 4px !important;
        }
        .bonsai-scope .bonsai-chat-next-message-row {
          align-items: flex-end !important;
        }
        .bonsai-scope button.bonsai-chat-user-bubble {
          display: block !important;
          width: fit-content !important;
          max-width: min(88%, 260px) !important;
          min-width: 0 !important;
          margin-left: auto !important;
          margin-right: 0 !important;
          align-self: flex-end !important;
          box-sizing: border-box !important;
          text-align: right !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          padding: 8px 10px !important;
          border-radius: 10px !important;
          cursor: pointer !important;
          outline: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          color: #dce6f2 !important;
          border: 1px solid rgba(90, 130, 185, 0.42) !important;
          background: linear-gradient(
            180deg,
            rgba(28, 44, 68, 0.72) 0%,
            rgba(18, 30, 48, 0.78) 100%
          ) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
        }
        .bonsai-scope button.bonsai-chat-user-bubble--history {
          font-size: 10px !important;
          font-weight: 600 !important;
          line-height: 1.25 !important;
          padding: 5px 8px !important;
          border-radius: 8px !important;
          max-width: min(100%, 200px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          background: linear-gradient(
            180deg,
            rgba(22, 34, 48, 0.78) 0%,
            rgba(14, 22, 34, 0.82) 100%
          ) !important;
          color: #8fa8c4 !important;
        }
        .bonsai-scope button.bonsai-chat-user-bubble--history.bonsai-chat-user-bubble--selected {
          border: 1px solid rgba(120, 155, 198, 0.42) !important;
          background: linear-gradient(
            180deg,
            rgba(36, 52, 72, 0.82) 0%,
            rgba(24, 36, 52, 0.85) 100%
          ) !important;
          color: #e8eef4 !important;
        }
        .bonsai-scope button.bonsai-chat-user-bubble--latest {
          border: 1px solid rgba(100, 145, 205, 0.48) !important;
          background: linear-gradient(
            180deg,
            rgba(32, 52, 78, 0.8) 0%,
            rgba(20, 34, 54, 0.85) 100%
          ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 0 0 1px rgba(70, 120, 175, 0.1) !important;
        }
        .bonsai-scope .bonsai-chat-user-bubble-inner--faded {
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%) !important;
          mask-image: linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%) !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble.bonsai-glass-panel {
          border-radius: 10px !important;
          border: 1px solid var(--bonsai-chat-ai-bubble-border, rgba(46, 135, 83, 0.48)) !important;
          background: linear-gradient(
            180deg,
            var(--bonsai-chat-ai-bubble-bg-top, rgba(46, 135, 83, 0.12)) 0%,
            var(--bonsai-chat-ai-bubble-bg-bottom, rgba(18, 52, 34, 0.55)) 100%
          ) !important;
          color: var(--bonsai-chat-ai-bubble-text, #d4dde6) !important;
          overflow: hidden !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-stack {
          background: transparent !important;
          border: none !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-chunk {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid var(--bonsai-chat-ai-bubble-chunk-border, rgba(255, 255, 255, 0.08)) !important;
          color: var(--bonsai-chat-ai-bubble-text, #d4dde6) !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-chunk:last-child {
          border-bottom: none !important;
        }
        .bonsai-scope .bonsai-chat-ai-bubble-inner--faded {
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important;
          mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important;
        }
        .bonsai-scope button.bonsai-chat-next-message {
          display: block !important;
          width: fit-content !important;
          max-width: min(88%, 260px) !important;
          margin-left: auto !important;
          align-self: flex-end !important;
          padding: 6px 12px !important;
          border-radius: 10px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          border: 1px solid rgba(110, 150, 200, 0.38) !important;
          background: linear-gradient(
            180deg,
            rgba(26, 42, 62, 0.82) 0%,
            rgba(18, 28, 42, 0.88) 100%
          ) !important;
          color: #c8daf0 !important;
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
        /* Stronger chain beats the rule above so ask-mode menu rows keep horizontal padding (vars from MainTabAskModeMenuPopover surface). */
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

        .bonsai-scope .bonsai-settings-inline-menu-host.bonsai-settings-accent-menu-open {
          overflow: visible;
          position: relative;
          z-index: 50;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-floater {
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface,
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface .bonsai-accent-intensity-menu-item {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-item--selected {
          background-color: rgb(40, 50, 62) !important;
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
      <div className="bonsai-decky-tabs-root">
        <Tabs activeTab={currentTab} onShowTab={onTabsShowTab} tabs={deckyTabs} />
      </div>
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
          color: "rgba(236, 240, 245, 0.96)",
          WebkitTextStroke: `1.25px ${BONSAI_FOREST_GREEN}`,
          paintOrder: "stroke fill",
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
