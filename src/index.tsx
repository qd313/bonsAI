import React, { useCallback, useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { definePlugin, toaster, call } from "@decky/api";
import { Navigation, Router, showModal, Tabs } from "@decky/ui";

import { PLUGIN_VERSION } from "./pluginVersion";
import {
  DEFAULT_LATENCY_WARNING_SECONDS,
  OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP,
  normalizeAiCharacterCustomText,
  normalizeAiCharacterPresetId,
  toBonsaiSettingsPayload,
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
import {
  formatAiCharacterSelectionLine,
  resolveMainTabAvatarBadgeLetter,
  resolveMainTabAvatarPresetId,
} from "./data/characterCatalog";
import { buildBonsaiScopeAccentInlineStyle, resolveUiAccentFromCharacterSettings } from "./data/characterUiAccent";
import { getRandomPresets } from "./data/presets";
import {
  AboutTabTitleIcon,
  BonsaiTreeTabIcon,
  BonsaiSvgIcon,
  BugIcon,
  GearIcon,
  LockIcon,
} from "./components/icons";
import { MODEL_POLICY_README_URL, type ModelPolicyTierId } from "./data/modelPolicy";
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
import { formatDeckyRpcError } from "./utils/deckyCall";
import { usePluginSettings } from "./hooks/usePluginSettings";
import { useBonsaiAskOrchestration } from "./hooks/useBonsaiAskOrchestration";
import { useDisclaimerAndLocalRuntimeGates } from "./hooks/useDisclaimerAndLocalRuntimeGates";
import { useCapturedFrontendErrors } from "./hooks/useCapturedFrontendErrors";
import { AUTO_SAVED_RESPONSE_IDS_KEY } from "./utils/desktopChatAutosave";
import { getQamTab, getSteamSettingsUrl, isQamSetting } from "./data/steamSettingsNavigation";
import type { AskAttachment, ScreenshotItem } from "./types/bonsaiUi";

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
const PLUGIN_HELP_DISMISSED_STORAGE_KEY = "bonsai:plugin-help-dismissed";
const LOCAL_RUNTIME_BETA_DISMISSED_STORAGE_KEY = "bonsai:local-runtime-beta-dismissed-v1";
const GITHUB_ISSUES_URL = "https://github.com/cantcurecancer/bonsAI/issues";
const GITHUB_REPO_URL = GITHUB_ISSUES_URL.replace(/\/issues$/, "");
const OLLAMA_UPSTREAM_REPO_URL = "https://github.com/ollama/ollama";

function pluginHelpDismissedFromStorage(): boolean {
  try {
    return window.localStorage.getItem(PLUGIN_HELP_DISMISSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markPluginHelpDismissedPersist(): void {
  try {
    window.localStorage.setItem(PLUGIN_HELP_DISMISSED_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

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
 * Primary plugin shell: tabs plus Ask/settings wiring. Heavy logic lives in hooks under `src/hooks/`
 * (`usePluginSettings`, `useBackgroundGameAi`, `useDisclaimerAndLocalRuntimeGates`, `useBonsaiAskOrchestration`,
 * `useCapturedFrontendErrors`) and feature modules under `src/features/` so this file stays a composer.
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

  // --- Connection / misc shell state (Ask + poll state: ``useBonsaiAskOrchestration``) ---
  const [ollamaIp, setOllamaIp] = useState(loadSavedIp());
  const [strategySpoilerConsentForNextAsk, setStrategySpoilerConsentForNextAsk] = useState(false);
  const [pluginHelpDismissed, setPluginHelpDismissed] = useState(() => {
    if (pluginHelpDismissedFromStorage()) {
      __bonsaiPluginHelpDismissed = true;
      return true;
    }
    return __bonsaiPluginHelpDismissed;
  });
  useEffect(() => {
    __bonsaiPluginHelpDismissed = pluginHelpDismissed;
  }, [pluginHelpDismissed]);
  const [isScreenshotBrowserOpen, setIsScreenshotBrowserOpen] = useState(false);
  const [mediaError, setMediaError] = useState<string>("");
  const [recentScreenshots, setRecentScreenshots] = useState<ScreenshotItem[]>([]);
  const [isLoadingRecentScreenshots, setIsLoadingRecentScreenshots] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<AskAttachment | null>(null);
  const screenshotBrowserHostRef = useRef<HTMLDivElement>(null);
  const attachActionHostRef = useRef<HTMLDivElement>(null);

  const [capturedErrors, setCapturedErrors] = useCapturedFrontendErrors();

  const {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    attachProtonLogsWhenTroubleshooting,
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
    setAttachProtonLogsWhenTroubleshooting,
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
    ollamaLocalOnDeck,
    setOllamaLocalOnDeck,
    strategySpoilerMaskingEnabled,
    setStrategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    setStrategySpoilerAutoRevealAfterConsent,
    steamWebApiKey,
    setSteamWebApiKey,
    settingsLoaded,
    hydrateFromSettings,
  } = usePluginSettings();

  useEffect(() => {
    if (askMode !== "strategy") {
      setStrategySpoilerConsentForNextAsk(false);
    }
  }, [askMode]);

  const {
    showDisclaimerModalAgain,
    ollamaLocalOnDeckPrevRef,
    localRuntimeBetaPromptIssuedRef,
  } = useDisclaimerAndLocalRuntimeGates(settingsLoaded, ollamaLocalOnDeck);

  const effectiveOllamaPcIp = useMemo(
    () => (ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : ollamaIp.trim()),
    [ollamaLocalOnDeck, ollamaIp]
  );

  const {
    ollamaResponse,
    ollamaContext,
    lastExchange,
    strategyGuideBranches,
    modelPolicyDisclosure,
    presetCarouselInject,
    shortcutSetupVariant,
    suggestedPrompts,
    showSlowWarning,
    setShowSlowWarning,
    elapsedSeconds,
    lastTransparency,
    askThreadCollapsed,
    askThreadViewIndex,
    setAskThreadViewIndex,
    askThreadDisplayQuestion,
    isAsking,
    lastApplied,
    strategySpoilerDefaultExpandedForReply,
    clearUnifiedInput,
    onCancelAsk,
    onAskOllama,
    onStrategyBranchPick,
    resetAskSessionSlice,
    setStrategyGuideBranches,
    setSuggestedPrompts,
  } = useBonsaiAskOrchestration({
    desktopDebugNoteAutoSave,
    filesystemWrite: capabilities.filesystem_write,
    strategySpoilerAutoRevealAfterConsent,
    askMode,
    strategySpoilerConsentForNextAsk,
    unifiedInput,
    setUnifiedInput,
    unifiedInputPersistenceMode,
    effectiveOllamaPcIp,
    selectedAttachment,
    setSelectedAttachment,
    setInputSanitizerUserDisabled,
    unifiedInputFieldLayerRef,
    unifiedInputHostRef,
    setSelectedIndex,
    setNavigationMessage,
    saveIp,
    persistSearchQuery,
  });

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
  }, [askMode, setStrategyGuideBranches]);

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

  // --- Slow-response warning timer ---
  useEffect(() => {
    if (!isAsking) {
      setShowSlowWarning(false);
      return;
    }
    const timer = setTimeout(() => setShowSlowWarning(true), effectiveLatencyWarningSeconds * 1000);
    return () => clearTimeout(timer);
  }, [isAsking, effectiveLatencyWarningSeconds]);

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

  const resetPluginSession = useCallback(() => {
    resetAskSessionSlice();
    persistSearchQuery("");
    setUnifiedInput("");
    setSelectedIndex(-1);
    setNavigationMessage("");
    setSelectedAttachment(null);
    setStrategySpoilerConsentForNextAsk(false);
    setSuggestedPrompts(getRandomPresets(3));
    toaster.toast({
      title: "Session cleared",
      body: "Unified search, reply, thread, transparency, and attachments were reset.",
      duration: 3800,
    });
  }, [resetAskSessionSlice, setSuggestedPrompts]);

  const onClearAllPluginData = useCallback(async () => {
    try {
      const defaults = await call<[], BonsaiSettings>("clear_plugin_data");
      hydrateFromSettings(defaults);
      try {
        window.localStorage.removeItem(IP_STORAGE_KEY);
        window.localStorage.removeItem(DISCLAIMER_STORAGE_KEY);
        window.localStorage.removeItem(PLUGIN_HELP_DISMISSED_STORAGE_KEY);
        window.localStorage.removeItem(LOCAL_RUNTIME_BETA_DISMISSED_STORAGE_KEY);
        window.localStorage.removeItem(UNIFIED_INPUT_STORAGE_KEY);
        window.sessionStorage.removeItem(AUTO_SAVED_RESPONSE_IDS_KEY);
      } catch {
        /* ignore */
      }
      setOllamaIp(IP_DEFAULT);
      __bonsaiPluginHelpDismissed = false;
      localRuntimeBetaPromptIssuedRef.current = false;
      ollamaLocalOnDeckPrevRef.current = null;
      setPluginHelpDismissed(false);
      setSuggestedPrompts(getRandomPresets(3));
      resetPluginSession();
      showDisclaimerModalAgain();
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
  }, [hydrateFromSettings, resetPluginSession, showDisclaimerModalAgain]);

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
    markPluginHelpDismissedPersist();
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
                attachProtonLogsWhenTroubleshooting,
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
                ollamaLocalOnDeck,
                strategySpoilerMaskingEnabled,
                strategySpoilerAutoRevealAfterConsent,
                steamWebApiKey,
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
    attachProtonLogsWhenTroubleshooting,
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
    ollamaLocalOnDeck,
    strategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
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
      ollamaIp={effectiveOllamaPcIp}
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
      strategySpoilerMaskingEnabled={strategySpoilerMaskingEnabled}
      strategySpoilerDefaultExpandedForReply={strategySpoilerDefaultExpandedForReply}
      strategySpoilerConsentForNextAsk={strategySpoilerConsentForNextAsk}
      onStrategySpoilerConsentForNextAskChange={setStrategySpoilerConsentForNextAsk}
      presetCarouselInject={presetCarouselInject}
    />
  );

  const settingsTab = (
    <SettingsTab
      ollamaIp={ollamaIp}
      onOllamaIpChange={setOllamaIp}
      onPersistOllamaIp={saveIp}
      ollamaLocalOnDeck={ollamaLocalOnDeck}
      setOllamaLocalOnDeck={setOllamaLocalOnDeck}
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
      attachProtonLogsWhenTroubleshooting={attachProtonLogsWhenTroubleshooting}
      setAttachProtonLogsWhenTroubleshooting={setAttachProtonLogsWhenTroubleshooting}
      strategySpoilerMaskingEnabled={strategySpoilerMaskingEnabled}
      setStrategySpoilerMaskingEnabled={setStrategySpoilerMaskingEnabled}
      strategySpoilerAutoRevealAfterConsent={strategySpoilerAutoRevealAfterConsent}
      setStrategySpoilerAutoRevealAfterConsent={setStrategySpoilerAutoRevealAfterConsent}
      steamWebApiKey={steamWebApiKey}
      setSteamWebApiKey={setSteamWebApiKey}
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
          attachProtonLogsWhenTroubleshooting,
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
          ollamaLocalOnDeck,
          strategySpoilerMaskingEnabled,
          strategySpoilerAutoRevealAfterConsent,
          steamWebApiKey,
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
    attachProtonLogsWhenTroubleshooting,
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
    ollamaLocalOnDeck,
    strategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    steamWebApiKey,
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
