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
import { BonsaiDebugOverlay } from "./components/BonsaiDebugOverlay";
import { CharacterPickerModal } from "./components/CharacterPickerModal";
import { DesktopNoteSaveModal } from "./components/DesktopNoteSaveModal";
import { DeveloperTab, type DeveloperConnectionStatus } from "./components/DeveloperTab";
import { MainTab } from "./components/MainTab";
import { PluginHelpModal } from "./components/PluginHelpModal";
import { OllamaModelsHubModal, type OllamaModelsHubSection } from "./components/OllamaModelsHubModal";
import { OllamaTab } from "./components/OllamaTab";
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
import { appendAppDesktopLogWithPrefs } from "./utils/appDesktopLog";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  finalizeSessionRestoreAfterRemount,
  peekBonsaiSessionPendingRestore,
} from "./utils/bonsaiSessionSurvival";
import { bonsaiDebugLog, bumpContentMountCount } from "./utils/bonsaiDebugIngest";
import {
  captureSettingsTabLocalSnapshot,
  clearSettingsTabLocalSurvival,
} from "./utils/settingsTabLocalSurvival";
import {
  captureOllamaTabLocalSnapshot,
  clearOllamaTabLocalSurvival,
} from "./utils/ollamaTabLocalSurvival";
import { persistOllamaIpIfRoutingToLan as persistOllamaIpIfRoutingToLanUtil } from "./utils/persistOllamaIp";
import { shouldClearUnifiedInputForPersistenceMode } from "./utils/unifiedInputPersistenceMode";
import { getRandomPresets } from "./data/presets";
import {
  AboutTabTitleIcon,
  BonsaiTreeTabIcon,
  BonsaiSvgIcon,
  BugIcon,
  GearIcon,
  LockIcon,
  OllamaTabIcon,
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
import { useVoiceTranscription } from "./hooks/useVoiceTranscription";
import { useBonsaiAskOrchestration } from "./hooks/useBonsaiAskOrchestration";
import { useDisclaimerAndLocalRuntimeGates } from "./hooks/useDisclaimerAndLocalRuntimeGates";
import { useCapturedFrontendErrors } from "./hooks/useCapturedFrontendErrors";
import { AUTO_SAVED_RESPONSE_IDS_KEY } from "./utils/desktopChatAutosave";
import { getQamTab, getSteamSettingsUrl, isQamSetting } from "./data/steamSettingsNavigation";
import { registerPreviewTestHooks, isDeckyPreviewRuntime } from "./preview/previewTestHooks";
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
  classSuffix: "main" | "ollama" | "settings" | "permissions" | "developer" | "about",
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

const FULL_BLEED_ROW_STYLE: React.CSSProperties = {
  width: "100%",
  marginLeft: 0,
  marginRight: 0,
  boxSizing: "border-box",
};

const PRESET_BUTTON_SURFACE: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  color: "#93a3b0",
};

const DECKY_TAB_TITLES = {
  main: bonsaiTabIconTitle("main", <BonsaiTreeTabIcon size={TAB_TITLE_MAIN_TAB_ICON_PX} />),
  ollama: bonsaiTabIconTitle("ollama", <OllamaTabIcon size={TAB_TITLE_ICON_PX} />),
  settings: bonsaiTabIconTitle("settings", <GearIcon size={TAB_TITLE_ICON_PX} />),
  permissions: bonsaiTabIconTitle("permissions", <LockIcon size={TAB_TITLE_ICON_PX} />),
  developer: bonsaiTabIconTitle("developer", <BugIcon size={TAB_TITLE_DEBUG_TAB_ICON_PX} />),
  about: bonsaiTabIconTitle("about", <AboutTabTitleIcon size={TAB_TITLE_ICON_PX} />),
} as const;

function resolveInitialTab(): string {
  const snap = peekBonsaiSessionPendingRestore();
  if (snap?.currentTab) return snap.currentTab;
  if (__bonsaiTabRestoreAfterModal != null) return __bonsaiTabRestoreAfterModal;
  return "main";
}

/**
 * Primary plugin shell: tabs plus Ask/settings wiring. Heavy logic lives in hooks under `src/hooks/`
 * (`usePluginSettings`, `useBackgroundGameAi`, `useDisclaimerAndLocalRuntimeGates`, `useBonsaiAskOrchestration`,
 * `useCapturedFrontendErrors`) and feature modules under `src/features/` so this file stays a composer.
 */
const Content: React.FC = () => {
  useLayoutEffect(() => {
    const mount = bumpContentMountCount();
    bonsaiDebugLog("index.tsx:Content", "content mounted", "H1", {
      mount,
      pendingPeek: !!peekBonsaiSessionPendingRestore(),
      tab: resolveInitialTab(),
    });
  }, []);

  const [currentTab, setCurrentTab] = useState(resolveInitialTab);
  const [lastConnectionStatus, setLastConnectionStatus] = useState<DeveloperConnectionStatus | null>(null);
  /** Remember tab when opening character picker so we restore after `showModal` closes. */
  const characterPickerReturnTabRef = useRef<string>("main");
  /**
   * After closing the character picker from a non-main tab, Decky sometimes fires `onShowTab("main")`
   * when focus returns. While this ref is within `until`, treat that as spurious and keep `tab` instead.
   */
  const postPickerTabLockRef = useRef<{ until: number; tab: string } | null>(null);
  /** Assigned after `finalizeShowModalAndRestoreActiveTab` is created (disclaimer hook runs earlier). */
  const finalizeModalCloseRef = useRef<(close: () => void) => void>((close) => close());
  const pendingSessionRestoreFinalizeRef = useRef(false);

  useLayoutEffect(() => {
    const pending = __bonsaiTabRestoreAfterModal;
    if (pending != null) {
      __bonsaiTabRestoreAfterModal = null;
      setCurrentTab(pending);
    }
  }, []);

  // --- Unified input/search state ---
  const [unifiedInput, setUnifiedInput] = useState(() => {
    const snap = peekBonsaiSessionPendingRestore();
    if (snap?.unifiedInput != null) return snap.unifiedInput;
    return loadSavedSearchQuery();
  });
  const [selectedIndex, setSelectedIndex] = useState(() => peekBonsaiSessionPendingRestore()?.selectedIndex ?? -1);
  const [isUnifiedInputFocused, setIsUnifiedInputFocused] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState(
    () => peekBonsaiSessionPendingRestore()?.navigationMessage ?? ""
  );
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
  const [ollamaIp, setOllamaIp] = useState(
    () => peekBonsaiSessionPendingRestore()?.ollamaIp ?? loadSavedIp()
  );
  const [pluginHelpDismissed, setPluginHelpDismissed] = useState(() => {
    const snap = peekBonsaiSessionPendingRestore();
    if (snap?.pluginHelpDismissed != null) {
      __bonsaiPluginHelpDismissed = snap.pluginHelpDismissed;
      return snap.pluginHelpDismissed;
    }
    if (pluginHelpDismissedFromStorage()) {
      __bonsaiPluginHelpDismissed = true;
      return true;
    }
    return __bonsaiPluginHelpDismissed;
  });
  useEffect(() => {
    __bonsaiPluginHelpDismissed = pluginHelpDismissed;
  }, [pluginHelpDismissed]);
  const [isScreenshotBrowserOpen, setIsScreenshotBrowserOpen] = useState(
    () => peekBonsaiSessionPendingRestore()?.isScreenshotBrowserOpen ?? false
  );
  const [mediaError, setMediaError] = useState(
    () => peekBonsaiSessionPendingRestore()?.mediaError ?? ""
  );
  const [recentScreenshots, setRecentScreenshots] = useState<ScreenshotItem[]>(
    () => peekBonsaiSessionPendingRestore()?.recentScreenshots ?? []
  );
  const [isLoadingRecentScreenshots, setIsLoadingRecentScreenshots] = useState(
    () => peekBonsaiSessionPendingRestore()?.isLoadingRecentScreenshots ?? false
  );
  const [selectedAttachment, setSelectedAttachment] = useState<AskAttachment | null>(
    () => peekBonsaiSessionPendingRestore()?.selectedAttachment ?? null
  );
  const screenshotBrowserHostRef = useRef<HTMLDivElement>(null);
  const attachActionHostRef = useRef<HTMLDivElement>(null);

  const {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    attachProtonLogsWhenTroubleshooting,
    thinkingStatusTinyModelEnabled,
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
    desktopAppLogLevel,
    setDesktopAppLogLevel,
    setAttachProtonLogsWhenTroubleshooting,
    setThinkingStatusTinyModelEnabled,
    presetChipFadeAnimationEnabled,
    presetChipAnimation,
    setPresetChipAnimation,
    setPresetChipFadeAnimationEnabled,
    askMode,
    setAskMode,
    ollamaKeepAlive,
    setOllamaKeepAlive,
    showDeveloperTab,
    setShowDeveloperTab,
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
    steamWebApiKey,
    setSteamWebApiKey,
    bonsaiTokenStreamingEnabled,
    setBonsaiTokenStreamingEnabled,
    showOnscreenDebugHud,
    setShowOnscreenDebugHud,
    responseVerifyEnabled,
    setResponseVerifyEnabled,
    responseVerifySecondPass,
    setResponseVerifySecondPass,
    responseVerifyModel,
    setResponseVerifyModel,
    namedOllamaHosts,
    setNamedOllamaHosts,
    voiceSttModel,
    setVoiceSttModel,
    settingsLoaded,
    hydrateFromSettings,
    pauseDebouncedSettingsSave,
    flushSettingsSnapshotNow,
    syncSettingsFromDisk,
  } = usePluginSettings();

  const [voiceRecording, setVoiceRecording] = useState(false);

  const onVoiceError = useCallback((e: unknown) => {
    setVoiceRecording(false);
    toaster.toast({
      title: "Voice input error",
      body: formatDeckyRpcError(e),
      duration: 5000,
    });
  }, []);

  const {
    startVoiceTranscription,
    stopVoiceTranscription,
    invalidateVoice,
  } = useVoiceTranscription(setUnifiedInput, onVoiceError);

  useEffect(() => {
    if (!capabilities.microphone_access && voiceRecording) {
      void stopVoiceTranscription();
      invalidateVoice();
      setVoiceRecording(false);
    }
  }, [capabilities.microphone_access, voiceRecording, stopVoiceTranscription, invalidateVoice]);

  const appLogPrefs = useMemo(
    () => ({
      desktopAppLogLevel,
      capabilities: { filesystem_write: capabilities.filesystem_write },
    }),
    [desktopAppLogLevel, capabilities.filesystem_write]
  );
  const [capturedErrors, setCapturedErrors] = useCapturedFrontendErrors(appLogPrefs);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (currentTab !== "developer" && currentTab !== "settings") return;
    appendAppDesktopLogWithPrefs(appLogPrefs, "verbose", "ui.tab", `opened ${currentTab} tab`);
  }, [currentTab, settingsLoaded, appLogPrefs]);

  const effectiveOllamaPcIp = useMemo(
    () => (ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : ollamaIp.trim()),
    [ollamaLocalOnDeck, ollamaIp]
  );

  const persistOllamaIpIfRoutingToLan = useCallback(
    (ip: string) => {
      persistOllamaIpIfRoutingToLanUtil(ollamaLocalOnDeck, saveIp, ip);
    },
    [ollamaLocalOnDeck]
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
    thinkingSummary,
    lastRequestId,
    askThreadCollapsed,
    expandedTurnKey,
    onTurnActivate,
    askThreadDisplayQuestion,
    isAsking,
    isStreamingPreview,
    streamDisplayText,
    lastApplied,
    clearUnifiedInput,
    onCancelAsk,
    onAskOllama,
    onRetryLastResponse,
    onStrategyBranchPick,
    resetAskSessionSlice,
    setStrategyGuideBranches,
    setSuggestedPrompts,
    restoreSessionSnapshot,
  } = useBonsaiAskOrchestration({
    desktopDebugNoteAutoSave,
    filesystemWrite: capabilities.filesystem_write,
    strategySpoilerMaskingEnabled,
    askMode,
    unifiedInput,
    setUnifiedInput,
    unifiedInputPersistenceMode,
    effectiveOllamaPcIp,
    selectedAttachment,
    setSelectedAttachment,
    syncSettingsFromDisk,
    unifiedInputFieldLayerRef,
    unifiedInputHostRef,
    setSelectedIndex,
    setNavigationMessage,
    saveIp: persistOllamaIpIfRoutingToLan,
    persistSearchQuery,
    onExternalFailure: (source, message, detail) => {
      appendAppDesktopLogWithPrefs(appLogPrefs, "verbose", "external.failure", message, {
        source,
        ...detail,
      });
    },
  });

  useLayoutEffect(() => {
    const survived = consumeBonsaiSessionAfterRemount();
    bonsaiDebugLog("index.tsx:consume", survived ? "restored snapshot" : "no snapshot", "H1", {
      tab: survived?.currentTab,
      inputLen: survived?.unifiedInput?.length ?? 0,
      hasExchange: !!survived?.lastExchange,
    });
    if (!survived) return;
    if (survived.currentTab) setCurrentTab(survived.currentTab);
    setUnifiedInput(survived.unifiedInput);
    setSelectedIndex(survived.selectedIndex);
    setNavigationMessage(survived.navigationMessage);
    setSelectedAttachment(survived.selectedAttachment);
    setIsScreenshotBrowserOpen(survived.isScreenshotBrowserOpen);
    setMediaError(survived.mediaError);
    setRecentScreenshots(survived.recentScreenshots);
    setIsLoadingRecentScreenshots(survived.isLoadingRecentScreenshots);
    setPluginHelpDismissed(survived.pluginHelpDismissed);
    __bonsaiPluginHelpDismissed = survived.pluginHelpDismissed;
    setOllamaIp(survived.ollamaIp);
    hydrateFromSettings(toBonsaiSettingsPayload(survived.settingsSnapshot));
    restoreSessionSnapshot(survived);
    pendingSessionRestoreFinalizeRef.current = true;
  }, [restoreSessionSnapshot, hydrateFromSettings]);

  useEffect(() => {
    if (!pendingSessionRestoreFinalizeRef.current) return;
    pendingSessionRestoreFinalizeRef.current = false;
    finalizeSessionRestoreAfterRemount();
    bonsaiDebugLog("index.tsx:finalizeRestore", "cleared pending snapshot", "H1", {});
  }, []);

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
    if (!showDeveloperTab && currentTab === "developer") {
      setCurrentTab("main");
      toaster.toast({ title: "Developer tab hidden", body: "Switched to Main.", duration: 2800 });
    }
  }, [showDeveloperTab, currentTab]);

  useEffect(() => {
    if (askMode !== "strategy") {
      setStrategyGuideBranches(null);
    }
  }, [askMode, setStrategyGuideBranches]);

  const goToPermissionsTab = useCallback(() => {
    setCurrentTab("permissions");
  }, []);

  const goToOllamaTab = useCallback(() => {
    setCurrentTab("ollama");
  }, []);

  const settingsSnapshotForSave = useMemo(
    () => ({
      latencyWarningSeconds,
      requestTimeoutSeconds,
      latencyTimeoutsCustomEnabled,
      unifiedInputPersistenceMode,
      screenshotAttachmentPreset,
      desktopDebugNoteAutoSave,
      desktopAskVerboseLogging,
      desktopAppLogLevel,
      attachProtonLogsWhenTroubleshooting,
      thinkingStatusTinyModelEnabled,
      presetChipFadeAnimationEnabled,
      presetChipAnimation,
      inputSanitizerUserDisabled,
      capabilities,
      aiCharacterEnabled,
      aiCharacterRandom,
      aiCharacterPresetId,
      aiCharacterCustomText,
      aiCharacterAccentIntensity,
      askMode,
      ollamaKeepAlive,
      showDeveloperTab,
      modelPolicyTier,
      modelPolicyNonFossUnlocked,
      modelAllowHighVramFallbacks,
      ollamaLocalOnDeck,
      strategySpoilerMaskingEnabled,
      steamWebApiKey,
      bonsaiTokenStreamingEnabled,
      showOnscreenDebugHud,
      responseVerifyEnabled,
      responseVerifySecondPass,
      responseVerifyModel,
      namedOllamaHosts,
      voiceSttModel,
    }),
    [
      latencyWarningSeconds,
      requestTimeoutSeconds,
      latencyTimeoutsCustomEnabled,
      unifiedInputPersistenceMode,
      screenshotAttachmentPreset,
      desktopDebugNoteAutoSave,
      desktopAskVerboseLogging,
      desktopAppLogLevel,
      attachProtonLogsWhenTroubleshooting,
      thinkingStatusTinyModelEnabled,
      presetChipFadeAnimationEnabled,
      presetChipAnimation,
      inputSanitizerUserDisabled,
      capabilities,
      aiCharacterEnabled,
      aiCharacterRandom,
      aiCharacterPresetId,
      aiCharacterCustomText,
      aiCharacterAccentIntensity,
      askMode,
      ollamaKeepAlive,
      showDeveloperTab,
      modelPolicyTier,
      modelPolicyNonFossUnlocked,
      modelAllowHighVramFallbacks,
      ollamaLocalOnDeck,
      strategySpoilerMaskingEnabled,
      steamWebApiKey,
      bonsaiTokenStreamingEnabled,
      showOnscreenDebugHud,
      responseVerifyEnabled,
      responseVerifySecondPass,
      responseVerifyModel,
      namedOllamaHosts,
      voiceSttModel,
    ]
  );

  const buildSettingsPayload = useCallback(
    (patch?: Partial<BonsaiSettings>) => toBonsaiSettingsPayload(settingsSnapshotForSave, patch),
    [settingsSnapshotForSave]
  );

  const captureSessionBeforeModal = useCallback(() => {
    characterPickerReturnTabRef.current = currentTab;
    const settingsLocal = captureSettingsTabLocalSnapshot();
    const ollamaLocal = captureOllamaTabLocalSnapshot();
    captureBonsaiSessionForModal({
      currentTab,
      unifiedInput,
      selectedIndex,
      navigationMessage,
      selectedAttachment,
      isScreenshotBrowserOpen,
      mediaError,
      recentScreenshots,
      isLoadingRecentScreenshots,
      pluginHelpDismissed,
      ollamaIp,
      settingsSnapshot: settingsSnapshotForSave,
      ollamaResponse,
      ollamaContext,
      lastExchange,
      askThreadCollapsed,
      askThreadDisplayQuestion,
      expandedTurnKey,
      suggestedPrompts,
      lastTransparency,
      modelPolicyDisclosure,
      strategyGuideBranches,
      elapsedSeconds,
      lastApplied,
      shortcutSetupVariant,
      presetCarouselInject,
      showSlowWarning,
      lastRequestId,
      thinkingSummary,
    });
    bonsaiDebugLog("index.tsx:captureSessionBeforeModal", "captured", "H4", {
      tab: currentTab,
      inputLen: unifiedInput.length,
      hasExchange: !!lastExchange,
      settingsLocal: !!settingsLocal,
      ollamaLocal: !!ollamaLocal,
    });
  }, [
    currentTab,
    unifiedInput,
    selectedIndex,
    navigationMessage,
    selectedAttachment,
    isScreenshotBrowserOpen,
    mediaError,
    recentScreenshots,
    isLoadingRecentScreenshots,
    pluginHelpDismissed,
    ollamaIp,
    settingsSnapshotForSave,
    ollamaResponse,
    ollamaContext,
    lastExchange,
    askThreadCollapsed,
    askThreadDisplayQuestion,
    expandedTurnKey,
    suggestedPrompts,
    lastTransparency,
    modelPolicyDisclosure,
    strategyGuideBranches,
    elapsedSeconds,
    lastApplied,
    shortcutSetupVariant,
    presetCarouselInject,
    showSlowWarning,
    lastRequestId,
    thinkingSummary,
  ]);

  const {
    showDisclaimerModalAgain,
    ollamaLocalOnDeckPrevRef,
    localRuntimeBetaPromptIssuedRef,
  } = useDisclaimerAndLocalRuntimeGates(settingsLoaded, ollamaLocalOnDeck, {
    onBeforeDeckyModal: captureSessionBeforeModal,
    onCompleteDeckyModalClose: (close) => finalizeModalCloseRef.current(close),
  });

  useEffect(() => {
    if (!isDeckyPreviewRuntime()) return;
    registerPreviewTestHooks({
      getState: () => ({
        currentTab,
        unifiedInput,
        askMode,
        isAsking,
        ollamaResponseLen: ollamaResponse.length,
        hasLastExchange: !!lastExchange,
        capabilities,
      }),
      setGame: (title: string, appId?: string) => {
        const app = { display_name: title, appid: Number(appId) || 0 };
        (Router as { setMainRunningApp?: (a: typeof app | null) => void }).setMainRunningApp?.(app);
      },
      triggerAsk: async (text: string) => {
        setUnifiedInput(text);
        await onAskOllama(text);
      },
      attachScreenshot: (base64: string, name = "preview.png") => {
        setSelectedAttachment({
          path: name,
          name,
          source: "picker",
          preview_data_uri: base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`,
        });
      },
      getTransparencyJson: () => lastTransparency,
      getSysfsWrites: async () => {
        try {
          const res = (await call("get_input_transparency")) as { sysfs_writes?: unknown };
          return res?.sysfs_writes ?? [];
        } catch {
          return [];
        }
      },
      setTab: (tabId: string) => setCurrentTab(tabId),
      resetDisclaimer: () => {
        try {
          window.localStorage.removeItem("bonsai:disclaimer-accepted");
        } catch {
          /* ignore */
        }
        showDisclaimerModalAgain();
      },
    });
  }, [
    currentTab,
    unifiedInput,
    askMode,
    isAsking,
    ollamaResponse,
    lastExchange,
    capabilities,
    lastTransparency,
    onAskOllama,
    setUnifiedInput,
    setSelectedAttachment,
    setCurrentTab,
    showDisclaimerModalAgain,
  ]);

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

  // --- Slow-response warning timer (suppress once token streaming begins) ---
  useEffect(() => {
    if (!isAsking) {
      setShowSlowWarning(false);
      return;
    }
    if (isStreamingPreview) {
      setShowSlowWarning(false);
      return;
    }
    const timer = setTimeout(() => setShowSlowWarning(true), effectiveLatencyWarningSeconds * 1000);
    return () => clearTimeout(timer);
  }, [isAsking, isStreamingPreview, effectiveLatencyWarningSeconds]);

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

  const unifiedInputPersistenceModePrevRef = useRef<typeof unifiedInputPersistenceMode | null>(null);
  useEffect(() => {
    const prev = unifiedInputPersistenceModePrevRef.current;
    unifiedInputPersistenceModePrevRef.current = unifiedInputPersistenceMode;
    if (shouldClearUnifiedInputForPersistenceMode(prev, unifiedInputPersistenceMode)) {
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
    setSuggestedPrompts(getRandomPresets(3));
    toaster.toast({
      title: "Session cleared",
      body: "Unified search, reply, thread, transparency, and attachments were reset.",
      duration: 3800,
    });
  }, [resetAskSessionSlice, setSuggestedPrompts]);

  const onClearAllPluginData = useCallback(async () => {
    try {
      await pauseDebouncedSettingsSave();
      const defaults = await call<[], BonsaiSettings>("clear_plugin_data");
      hydrateFromSettings(defaults);
      await flushSettingsSnapshotNow();
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
      clearBonsaiSessionSurvival();
      clearSettingsTabLocalSurvival();
      clearOllamaTabLocalSurvival();
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
  }, [
    flushSettingsSnapshotNow,
    hydrateFromSettings,
    pauseDebouncedSettingsSave,
    resetPluginSession,
    showDisclaimerModalAgain,
  ]);

  const onMicInput = useCallback(() => {
    if (isAsking) return;
    if (voiceRecording) {
      void stopVoiceTranscription().finally(() => setVoiceRecording(false));
      return;
    }
    if (!capabilities.microphone_access) {
      toaster.toast({
        title: "Permission required",
        body: "Enable Voice input (microphone) in the Permissions tab to use speech-to-text.",
        duration: 4500,
      });
      goToPermissionsTab();
      return;
    }
    void startVoiceTranscription(unifiedInput)
      .then(() => setVoiceRecording(true))
      .catch((e: unknown) => {
        setVoiceRecording(false);
        toaster.toast({
          title: "Voice input unavailable",
          body: e instanceof Error ? e.message : formatDeckyRpcError(e),
          duration: 5500,
        });
      });
  }, [
    isAsking,
    voiceRecording,
    capabilities.microphone_access,
    goToPermissionsTab,
    startVoiceTranscription,
    stopVoiceTranscription,
    unifiedInput,
  ]);

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

  const onTakeScreenshot = async () => {
    if (isAsking) return;
    setMediaError("");
    if (!capabilities.media_library_access && !capabilities.filesystem_write) {
      setMediaError(
        "Enable Read game & screenshot context in Permissions to take or attach screenshots.",
      );
      return;
    }
    try {
      const response = await call<
        [{ include_overlay: boolean }],
        { success?: boolean; item?: ScreenshotItem; error?: string }
      >("capture_screenshot", { include_overlay: false });
      if (!response?.success || !response.item?.path) {
        setMediaError(response?.error ?? "Screenshot capture failed.");
        return;
      }
      const item = response.item;
      setSelectedAttachment({
        path: item.path,
        name: item.name || "capture.png",
        source: "capture",
        preview_data_uri: item.preview_data_uri,
        size_bytes: item.size_bytes,
        app_id: item.app_id,
      });
      toaster.toast({ title: "Screenshot captured", body: "Attached for your next Ask.", duration: 1800 });
    } catch (e: unknown) {
      setMediaError(formatDeckyRpcError(e));
    }
  };

  const onOpenScreenshotBrowser = async () => {
    if (isAsking) return;
    setIsScreenshotBrowserOpen(true);
    setMediaError("");
    if (!capabilities.media_library_access) {
      setMediaError("Enable Media library access in Permissions to attach screenshots.");
      return;
    }
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
      bonsaiDebugLog("index.tsx:finalizeModal", "modal close", "H4", { backTab: back });
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

  useEffect(() => {
    finalizeModalCloseRef.current = finalizeShowModalAndRestoreActiveTab;
  }, [finalizeShowModalAndRestoreActiveTab]);

  const openPluginHelpModal = useCallback(() => {
    captureSessionBeforeModal();
    markPluginHelpDismissedPersist();
    __bonsaiPluginHelpDismissed = true;
    setPluginHelpDismissed(true);
    characterPickerReturnTabRef.current = currentTab;
    const handle = showModal(
      <PluginHelpModal onClose={() => finalizeShowModalAndRestoreActiveTab(() => handle.Close())} />
    );
  }, [currentTab, captureSessionBeforeModal, finalizeShowModalAndRestoreActiveTab]);

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
          "Folder: Desktop/bonsAI_logs/\n" +
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
    bonsaiDebugLog("index.tsx:onTabsShowTab", "bumper tab", "H3", { from: currentTab, to: tabID });
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
  }, [currentTab]);

  const openCharacterPickerModal = useCallback(() => {
    captureSessionBeforeModal();
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
        onOK={async (next) => {
          const pid = normalizeAiCharacterPresetId(next.presetId);
          const ctxt = normalizeAiCharacterCustomText(next.customText);
          setAiCharacterRandom(next.random);
          setAiCharacterPresetId(pid);
          setAiCharacterCustomText(ctxt);
          try {
            const saved = await call<[BonsaiSettings], BonsaiSettings>(
              "save_settings",
              buildSettingsPayload({
                ai_character_random: next.random,
                ai_character_preset_id: pid,
                ai_character_custom_text: ctxt,
              })
            );
            hydrateFromSettings(saved);
            finalizeShowModalAndRestoreActiveTab(() => handle.Close());
          } catch (err: unknown) {
            console.error("save_settings failed (character picker OK)", err);
            toaster.toast({
              title: "Character not saved",
              body: formatDeckyRpcError(err),
              duration: 5000,
            });
          }
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
    desktopAppLogLevel,
    attachProtonLogsWhenTroubleshooting,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    capabilities,
    setAiCharacterRandom,
    setAiCharacterPresetId,
    setAiCharacterCustomText,
    buildSettingsPayload,
    hydrateFromSettings,
    finalizeShowModalAndRestoreActiveTab,
    askMode,
    ollamaKeepAlive,
    showDeveloperTab,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    ollamaLocalOnDeck,
    strategySpoilerMaskingEnabled,
  ]);

  const onCommitOllamaModelsHub = useCallback(
    async (patch: {
      modelPolicyTier: ModelPolicyTierId;
      modelPolicyNonFossUnlocked: boolean;
      modelAllowHighVramFallbacks: boolean;
    }) => {
      if (patch.modelPolicyTier === "non_foss" && !patch.modelPolicyNonFossUnlocked) {
        toaster.toast({
          title: "Unlock required",
          body: "Turn on Tier 3 unlock under Advanced before Any installed model.",
          duration: 5000,
        });
        goToOllamaTab();
        return;
      }
      setModelPolicyTier(patch.modelPolicyTier);
      setModelPolicyNonFossUnlocked(patch.modelPolicyNonFossUnlocked);
      setModelAllowHighVramFallbacks(patch.modelAllowHighVramFallbacks);
      const saved = await call<[BonsaiSettings], BonsaiSettings>(
        "save_settings",
        buildSettingsPayload({
          model_policy_tier: patch.modelPolicyTier,
          model_policy_non_foss_unlocked: patch.modelPolicyNonFossUnlocked,
          model_allow_high_vram_fallbacks: patch.modelAllowHighVramFallbacks,
        })
      );
      hydrateFromSettings(saved);
    },
    [buildSettingsPayload, hydrateFromSettings, setModelPolicyTier, setModelPolicyNonFossUnlocked, setModelAllowHighVramFallbacks, goToOllamaTab]
  );

  const openOllamaModelsHub = useCallback(
    (opts?: { initialSection?: OllamaModelsHubSection }) => {
      captureSessionBeforeModal();
      const handle = showModal(
        <OllamaModelsHubModal
          initialSection={opts?.initialSection}
          activeRoutingTag={modelPolicyDisclosure?.model ?? null}
          modelPolicyTier={modelPolicyTier}
          modelPolicyNonFossUnlocked={modelPolicyNonFossUnlocked}
          modelAllowHighVramFallbacks={modelAllowHighVramFallbacks}
          onCommitOllamaModelsHub={onCommitOllamaModelsHub}
          onReadModelPolicy={openModelPolicyReadme}
          onBeforeNestedDeckyModal={captureSessionBeforeModal}
          onCompleteNestedDeckyModalClose={finalizeShowModalAndRestoreActiveTab}
          onClose={() => {
            finalizeShowModalAndRestoreActiveTab(() => handle.Close());
          }}
        />
      );
    },
    [
      captureSessionBeforeModal,
      finalizeShowModalAndRestoreActiveTab,
      modelPolicyDisclosure?.model,
      modelPolicyTier,
      modelPolicyNonFossUnlocked,
      modelAllowHighVramFallbacks,
      onCommitOllamaModelsHub,
      openModelPolicyReadme,
    ]
  );

  const fullBleedRowStyle = FULL_BLEED_ROW_STYLE;
  const presetButtonSurface = PRESET_BUTTON_SURFACE;
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

  const mainTab = useMemo(
    () => (
    <MainTab
      key="bonsai-main-tab"
      fullBleedRowStyle={fullBleedRowStyle}
      presetButtonSurface={presetButtonSurface}
      suggestedPrompts={suggestedPrompts}
      showPluginHelpChip={!pluginHelpDismissed}
      onOpenPluginHelp={openPluginHelpModal}
      presetChipFadeAnimationEnabled={presetChipFadeAnimationEnabled}
      presetChipAnimation={presetChipAnimation}
      onRetryLastResponse={onRetryLastResponse}
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
      onTakeScreenshot={onTakeScreenshot}
      onCancelAsk={onCancelAsk}
      onMicInput={onMicInput}
      voiceRecording={voiceRecording}
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
      expandedTurnKey={expandedTurnKey}
      onTurnActivate={onTurnActivate}
      modelPolicyDisclosure={modelPolicyDisclosure}
      onOpenModelPolicyReadme={openModelPolicyReadme}
      shortcutSetupVariant={shortcutSetupVariant}
      onOpenControllerSettings={onOpenControllerSettingsForShortcut}
      strategySpoilerMaskingEnabled={strategySpoilerMaskingEnabled}
      presetCarouselInject={presetCarouselInject}
      isStreamingPreview={isStreamingPreview}
      streamDisplayText={streamDisplayText}
      thinkingSummary={thinkingSummary}
      desktopAskVerboseLogging={desktopAskVerboseLogging}
      lastRequestId={lastRequestId}
      lastExchange={lastExchange}
    />
  ),
    [
      fullBleedRowStyle,
      presetButtonSurface,
      suggestedPrompts,
      pluginHelpDismissed,
      presetChipFadeAnimationEnabled,
      presetChipAnimation,
      unifiedInput,
      unifiedInputSurfacePx,
      usesNativeMultilineField,
      isUnifiedInputFocused,
      filteredSettings,
      selectedIndex,
      isAsking,
      effectiveOllamaPcIp,
      selectedAttachment,
      showSearchClearButton,
      isScreenshotBrowserOpen,
      mediaError,
      recentScreenshots,
      isLoadingRecentScreenshots,
      navigationMessage,
      showSlowWarning,
      effectiveLatencyWarningSeconds,
      ollamaResponse,
      elapsedSeconds,
      lastApplied,
      ollamaContext,
      lastExchange,
      aiCharacterEnabled,
      mainTabAvatarPresetId,
      mainTabAvatarBadgeLetter,
      aiCharacterDebugLineForMainTab,
      lastTransparency,
      askMode,
      strategyGuideBranches,
      askThreadCollapsed,
      askThreadDisplayQuestion,
      expandedTurnKey,
      modelPolicyDisclosure,
      shortcutSetupVariant,
      strategySpoilerMaskingEnabled,
      presetCarouselInject,
      onRetryLastResponse,
      voiceRecording,
      onMicInput,
      onOpenScreenshotBrowser,
      onTakeScreenshot,
    ]
  );

  const settingsTab = useMemo(
    () => (
    <SettingsTab
      screenshotAttachmentPreset={screenshotAttachmentPreset}
      setScreenshotAttachmentPreset={setScreenshotAttachmentPreset}
      unifiedInputPersistenceMode={unifiedInputPersistenceMode}
      setUnifiedInputPersistenceMode={setUnifiedInputPersistenceMode}
      aiCharacterEnabled={aiCharacterEnabled}
      setAiCharacterEnabled={setAiCharacterEnabled}
      aiCharacterRandom={aiCharacterRandom}
      aiCharacterPresetId={aiCharacterPresetId}
      aiCharacterCustomText={aiCharacterCustomText}
      aiCharacterAccentIntensity={aiCharacterAccentIntensity}
      setAiCharacterAccentIntensity={setAiCharacterAccentIntensity}
      showDeveloperTab={showDeveloperTab}
      setShowDeveloperTab={setShowDeveloperTab}
      strategySpoilerMaskingEnabled={strategySpoilerMaskingEnabled}
      setStrategySpoilerMaskingEnabled={setStrategySpoilerMaskingEnabled}
      voiceSttModel={voiceSttModel}
      setVoiceSttModel={setVoiceSttModel}
      microphoneAccessEnabled={capabilities.microphone_access}
      onOpenCharacterPicker={openCharacterPickerModal}
      onBeforeDeckyModal={captureSessionBeforeModal}
      onCompleteDeckyModalClose={finalizeShowModalAndRestoreActiveTab}
      onResetSession={resetPluginSession}
      onClearAllPluginData={onClearAllPluginData}
    />
  ),
    [
      screenshotAttachmentPreset,
      unifiedInputPersistenceMode,
      aiCharacterEnabled,
      aiCharacterRandom,
      aiCharacterPresetId,
      aiCharacterCustomText,
      aiCharacterAccentIntensity,
      showDeveloperTab,
      strategySpoilerMaskingEnabled,
      voiceSttModel,
      capabilities.microphone_access,
    ]
  );

  const onApplyTier2MultimodalPolicy = useCallback(async () => {
    setModelPolicyTier("open_weight");
    const saved = await call<[BonsaiSettings], BonsaiSettings>(
      "save_settings",
      buildSettingsPayload({ model_policy_tier: "open_weight" })
    );
    hydrateFromSettings(saved);
  }, [buildSettingsPayload, hydrateFromSettings, setModelPolicyTier]);

  const ollamaTab = useMemo(
    () => (
      <OllamaTab
        ollamaIp={ollamaIp}
        onOllamaIpChange={setOllamaIp}
        onPersistOllamaIp={saveIp}
        ollamaLocalOnDeck={ollamaLocalOnDeck}
        setOllamaLocalOnDeck={setOllamaLocalOnDeck}
        onLastConnectionStatus={setLastConnectionStatus}
        lastConnectionStatus={lastConnectionStatus}
        namedOllamaHosts={namedOllamaHosts}
        setNamedOllamaHosts={setNamedOllamaHosts}
        onBeforeDeckyModal={captureSessionBeforeModal}
        onCompleteDeckyModalClose={finalizeShowModalAndRestoreActiveTab}
        onOpenOllamaModelsHub={openOllamaModelsHub}
        responseVerifyEnabled={responseVerifyEnabled}
        setResponseVerifyEnabled={setResponseVerifyEnabled}
        responseVerifySecondPass={responseVerifySecondPass}
        setResponseVerifySecondPass={setResponseVerifySecondPass}
        responseVerifyModel={responseVerifyModel}
        setResponseVerifyModel={setResponseVerifyModel}
        latencyWarningSeconds={latencyWarningSeconds}
        requestTimeoutSeconds={requestTimeoutSeconds}
        latencyTimeoutsCustomEnabled={latencyTimeoutsCustomEnabled}
        setLatencyTimeoutsCustomEnabled={setLatencyTimeoutsCustomEnabled}
        setLatencyWarningSeconds={setLatencyWarningSeconds}
        setRequestTimeoutSeconds={setRequestTimeoutSeconds}
        ollamaKeepAlive={ollamaKeepAlive}
        setOllamaKeepAlive={setOllamaKeepAlive}
        modelPolicyTier={modelPolicyTier}
        onApplyTier2MultimodalPolicy={onApplyTier2MultimodalPolicy}
      />
    ),
    [
      ollamaIp,
      ollamaLocalOnDeck,
      lastConnectionStatus,
      namedOllamaHosts,
      responseVerifyEnabled,
      responseVerifySecondPass,
      responseVerifyModel,
      latencyWarningSeconds,
      requestTimeoutSeconds,
      latencyTimeoutsCustomEnabled,
      ollamaKeepAlive,
      modelPolicyTier,
      onApplyTier2MultimodalPolicy,
      captureSessionBeforeModal,
      finalizeShowModalAndRestoreActiveTab,
      openOllamaModelsHub,
    ]
  );

  /** Persist immediately: Decky can unmount `Content` when the disclaimer modal closes, which drops in-memory state and cancels the debounced save. */
  const onConfirmEnableHardwareControl = useCallback(() => {
    setCapabilities((prev) => {
      const next = { ...prev, hardware_control: true };
      void call<[BonsaiSettings], BonsaiSettings>("save_settings", buildSettingsPayload({ capabilities: next }))
        .then((saved) => hydrateFromSettings(saved))
        .catch((err) => {
          console.error("save_settings failed (hardware control confirm)", err);
        });
      return next;
    });
  }, [buildSettingsPayload, hydrateFromSettings, setCapabilities]);

  const permissionsTab = useMemo(
    () => (
      <PermissionsTab
        capabilities={capabilities}
        setCapabilities={setCapabilities}
        onConfirmEnableHardwareControl={onConfirmEnableHardwareControl}
        onBeforeDeckyModal={captureSessionBeforeModal}
        onCompleteDeckyModalClose={finalizeShowModalAndRestoreActiveTab}
      />
    ),
    [
      capabilities,
      onConfirmEnableHardwareControl,
      captureSessionBeforeModal,
      finalizeShowModalAndRestoreActiveTab,
    ]
  );

  const onSteamInputPhase1Jump = useCallback(() => {
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
  }, [capabilities.external_navigation, goToPermissionsTab]);

  const developerTab = useMemo(
    () => (
      <DeveloperTab
      capturedErrors={capturedErrors}
      onClearErrors={() => setCapturedErrors([])}
      onSteamInputPhase1Jump={onSteamInputPhase1Jump}
      lastConnectionStatus={lastConnectionStatus}
      desktopDebugNoteAutoSave={desktopDebugNoteAutoSave}
      setDesktopDebugNoteAutoSave={setDesktopDebugNoteAutoSave}
      desktopAskVerboseLogging={desktopAskVerboseLogging}
      setDesktopAskVerboseLogging={setDesktopAskVerboseLogging}
      desktopAppLogLevel={desktopAppLogLevel}
      setDesktopAppLogLevel={setDesktopAppLogLevel}
      filesystemWrite={capabilities.filesystem_write}
      attachProtonLogsWhenTroubleshooting={attachProtonLogsWhenTroubleshooting}
      setAttachProtonLogsWhenTroubleshooting={setAttachProtonLogsWhenTroubleshooting}
      presetChipFadeAnimationEnabled={presetChipFadeAnimationEnabled}
      setPresetChipFadeAnimationEnabled={setPresetChipFadeAnimationEnabled}
      presetChipAnimation={presetChipAnimation}
      setPresetChipAnimation={setPresetChipAnimation}
      steamWebApiKey={steamWebApiKey}
      setSteamWebApiKey={setSteamWebApiKey}
      bonsaiTokenStreamingEnabled={bonsaiTokenStreamingEnabled}
      setBonsaiTokenStreamingEnabled={setBonsaiTokenStreamingEnabled}
      thinkingStatusTinyModelEnabled={thinkingStatusTinyModelEnabled}
      setThinkingStatusTinyModelEnabled={setThinkingStatusTinyModelEnabled}
      showOnscreenDebugHud={showOnscreenDebugHud}
      setShowOnscreenDebugHud={setShowOnscreenDebugHud}
      />
    ),
    [
      capturedErrors,
      onSteamInputPhase1Jump,
      lastConnectionStatus,
      desktopDebugNoteAutoSave,
      desktopAskVerboseLogging,
      desktopAppLogLevel,
      capabilities.filesystem_write,
      attachProtonLogsWhenTroubleshooting,
      thinkingStatusTinyModelEnabled,
      presetChipFadeAnimationEnabled,
      presetChipAnimation,
      steamWebApiKey,
      bonsaiTokenStreamingEnabled,
      thinkingStatusTinyModelEnabled,
      showOnscreenDebugHud,
    ]
  );

  const aboutTab = useMemo(
    () => (
      <AboutTab
        githubRepoUrl={GITHUB_REPO_URL}
        ollamaRepoUrl={OLLAMA_UPSTREAM_REPO_URL}
        githubIssuesUrl={GITHUB_ISSUES_URL}
        allowExternalNavigation={capabilities.external_navigation}
        onNavigateToPermissions={goToPermissionsTab}
      />
    ),
    [capabilities.external_navigation, goToPermissionsTab]
  );

  const deckyTabs = useMemo(
    () => {
      const rows: Array<{ id: string; title: React.ReactElement; content: React.ReactNode }> = [
        {
          id: "main",
          title: DECKY_TAB_TITLES.main,
          content: mainTab,
        },
        {
          id: "ollama",
          title: DECKY_TAB_TITLES.ollama,
          content: ollamaTab,
        },
        {
          id: "settings",
          title: DECKY_TAB_TITLES.settings,
          content: settingsTab,
        },
        {
          id: "permissions",
          title: DECKY_TAB_TITLES.permissions,
          content: (
            <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
              {permissionsTab}
            </div>
          ),
        },
      ];
      if (showDeveloperTab) {
        rows.push({
          id: "developer",
          title: DECKY_TAB_TITLES.developer,
          content: developerTab,
        });
      }
      rows.push({
        id: "about",
        title: DECKY_TAB_TITLES.about,
        content: <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight">{aboutTab}</div>,
      });
      return rows;
    },
    [showDeveloperTab, mainTab, ollamaTab, settingsTab, permissionsTab, developerTab, aboutTab]
  );

  return (
    <BonsaiPluginShell scopeRef={bonsaiScopeRef} scopeStyle={bonsaiScopeAccentStyle}>
      <BonsaiDebugOverlay enabled={showOnscreenDebugHud} />
      <div className="bonsai-decky-tabs-root">
        <Tabs
          activeTab={currentTab}
          onShowTab={onTabsShowTab}
          tabs={deckyTabs}
          {...({ autoFocusContents: false } as Record<string, unknown>)}
        />
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
