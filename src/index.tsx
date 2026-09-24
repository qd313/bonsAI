/**
 * Title: Plugin root
 *
 * Purpose: The file Decky loads to build bonsAI's whole panel — the one a
 * person opens from the Quick Access Menu. `definePlugin()` at the very
 * bottom hands Decky the plugin's name, icon, and its whole React tree;
 * everything above that builds the tree. `Content` is that tree: it wires
 * together every setting and every tab — Main, Ollama, Settings,
 * Permissions, Developer, About — and the many hooks each one needs, then
 * draws the tab strip and whichever tab is open.
 *
 *     Decky Quick Access Menu
 *          │ opens the panel
 *          ▼
 *     definePlugin()  ──►  { content: <Root/> }
 *          │
 *          ▼
 *     <Root>  (an error boundary — a crash in one tab does not take the
 *              whole panel down silently)
 *          │
 *          ▼
 *     <Content>
 *          │
 *          ├─ usePluginSettings() and friends: load settings, watch for
 *          │    changes, and save them back
 *          ├─ useBonsaiAskOrchestration(): the whole Ask flow — see its own
 *          │    header for how a question travels from press to answer
 *          ├─ useChatSlots(), useIntentPacks(), useKidsLock(), and a dozen
 *          │    more: one hook per self-contained piece of behavior
 *          │
 *          ▼
 *     one useXxxTabPayload() per tab, each turning the state above into the
 *     exact props that tab's components need
 *          │
 *          ▼
 *     <Tabs> draws the tab strip and whichever tab's props are on screen
 *
 * Used for: mounted once by Decky when the panel opens.
 *
 * Solves: One composition root, so the plugin's actual behavior — settings,
 * the Ask flow, chat slots, and the rest — lives in hooks and feature files
 * instead of being written inline in the file Decky happens to load first.
 *
 * Does not: Run the Ask flow itself — useBonsaiAskOrchestration does that,
 * and this file only wires its returned state into the Main tab's props.
 * Does not talk to the backend for anything routine either; the handful of
 * direct calls left here (clearing all plugin data, for instance) are the
 * ones too one-off to belong in any more specific hook. See main.py for the
 * backend side of everything this file wires up.
 *
 * Split note (plan 65): the empty starting snapshot moved to
 * features/plugin-shell/initialSessionSnapshot.ts; the two "clear the session" /
 * "clear everything" actions moved to features/plugin-shell/useSessionResetActions.tsx; the
 * preview test hook registration moved to preview/useDeckyPreviewTestHookRegistration.ts; the
 * post-remount session restore moved to
 * features/plugin-shell/useSessionRestoreAfterRemount.ts; the chat-slot activity refs moved to
 * features/plugin-shell/useChatSlotActivityState.ts; the accent/UI-scale scope style moved to
 * features/plugin-shell/useBonsaiScopeStyle.ts; voice input plus its read-aloud glue moved to
 * features/voice/useVoiceAskWithReadAloud.ts; the two Developer-tab actions moved to
 * features/plugin-shell/useDeveloperToolActions.ts; the slow-warning timer and the unified-input
 * persistence effects moved to features/plugin-shell/useUnifiedInputBehaviors.ts; the two
 * leave-the-panel navigation actions (and the SteamUrlApi type) moved to
 * features/plugin-shell/useExternalNavigationActions.ts.
 *
 * How it works:
 * 1. Load every hook Content depends on: settings, the one-time disclaimer
 *    and local-AI warning pop-ups, kids-lock, UI scale, chat slots, intent
 *    packs, voice input, and, centrally, useBonsaiAskOrchestration for the
 *    whole Ask flow.
 * 2. Track the handful of pieces of state that belong to Content itself
 *    rather than to any one hook: which tab is open, which chat slot is
 *    currently generating an answer, and a few refs used to survive a
 *    re-render or a remount without losing track of an in-flight question.
 * 3. Wire up session survival: a function that takes a copy of the whole
 *    screen, detailed enough to rebuild it, for when the panel closes and
 *    reopens mid-question — and, the deliberate opposite of that,
 *    resetPluginSession and onClearAllPluginData, the two ways a session can
 *    be thrown away on purpose.
 * 4. Build one useXxxTabPayload() call per tab — useMainTabPayload,
 *    useSettingsTabPayload, useOllamaTabPayload, usePermissionsTabPayload,
 *    useDeveloperTabPayload, useAboutTabPayload — each one turning the state
 *    gathered above into exactly the props that tab's own components need.
 * 5. Assemble deckyTabs, the list Steam's own Tabs component draws from, and
 *    render the tab strip above it.
 * 6. definePlugin(), at the very end, is the actual handoff to Decky: the
 *    plugin's name, its title and icon, and content: <Root />.
 *
 * Gotchas:
 * - The order these hooks are declared in matters. Several are declared
 *   after another one specifically because they need a value or a setter
 *   that earlier hook produced — useChatSlots, for instance, needs the Ask
 *   flow's own thread setters. Reordering risks a hook reading a ref that
 *   has not been filled in yet.
 * - Several refs exist purely so a stable callback can read a later render's
 *   value without changing identity itself on every render. Passing a
 *   freshly created function directly instead of going through a ref was
 *   measured, in one case documented inline, to re-arm an effect on every
 *   render and produce an update loop.
 */
import React, { useCallback, useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { definePlugin, toaster, useQuickAccessVisible } from "@decky/api";
import { Tabs } from "@decky/ui";

import { PLUGIN_VERSION } from "./pluginVersion";
import { buildInitialSessionSnapshot } from "./features/plugin-shell/initialSessionSnapshot";
import { DEFAULT_LATENCY_WARNING_SECONDS, type BonsaiSettings } from "./data/bonsaiSettingsSchema";
import { setFrozenTestChips } from "./data/presets";
import { BonsaiPluginShell } from "./components/BonsaiPluginShell";
import { BonsaiDebugOverlay } from "./components/BonsaiDebugOverlay";
import { PULL_MODEL_CATALOG } from "./data/pullModelCatalog";
import { appendAppDesktopLogWithPrefs } from "./utils/appDesktopLog";
import {
  getPluginDataClearedGeneration,
  peekBonsaiSessionPendingRestore,
  type BonsaiSessionSurvivalSnapshot,
} from "./utils/bonsaiSessionSurvival";
import { consumePendingFocusMainTab, useReplySurfaceVisibility } from "./utils/bonsaiReplySurface";
import {
  BonsaiSvgIcon,
} from "./components/icons";
import {
  ASK_LABEL_COLOR_50,
  BONSAI_FOREST_GREEN,
} from "./features/unified-input/constants";
import { useUnifiedInputSurface } from "./features/unified-input/useUnifiedInputSurface";
import { PluginErrorBoundary } from "./features/plugin-shell/PluginErrorBoundary";
import { DECKY_TAB_TITLES, type BonsaiTabId } from "./features/plugin-shell/tabTitles";
import { TabIndicatorBar } from "./features/plugin-shell/TabIndicatorBar";
import { TabBodyFocusRoot, tabBodyNavFocusId } from "./features/plugin-shell/TabBodyFocusRoot";
import { takeNavFocus } from "./utils/navFocusRegistry";
import { loadSavedSearchQuery, persistSearchQuery } from "./features/plugin-shell/pluginStorage";
import { useOllamaConnectionState } from "./features/plugin-shell/useOllamaConnectionState";
import { useDeveloperTabPayload } from "./features/plugin-shell/tabs/useDeveloperTabPayload";
import { useAboutTabPayload } from "./features/plugin-shell/tabs/useAboutTabPayload";
import { usePermissionsTabPayload } from "./features/plugin-shell/tabs/usePermissionsTabPayload";
import { useSettingsTabPayload } from "./features/plugin-shell/tabs/useSettingsTabPayload";
import { useOllamaTabPayload } from "./features/plugin-shell/tabs/useOllamaTabPayload";
import { useMainTabPayload } from "./features/plugin-shell/tabs/useMainTabPayload";
import { useUiScaleProfile } from "./hooks/useUiScaleProfile";
import { useQamPanelHeightGuard } from "./hooks/useQamPanelHeightGuard";
import { useQamPanelSideBleed } from "./hooks/useQamPanelSideBleed";
import { useTabStripBodyOffset } from "./hooks/useTabStripBodyOffset";
import { UiScaleProvider } from "./context/UiScaleContext";
import { normalizeUiScaleProfileId, type UiScaleProfileId } from "./data/uiScaleProfile";
import { callDeckyWithTimeout } from "./utils/deckyCall";
import { usePluginSettings } from "./hooks/usePluginSettings";
import { useReplyLanguage } from "./hooks/useReplyLanguage";
import { useIntentPacks } from "./hooks/useIntentPacks";
import { useScreenshotBrowser } from "./hooks/useScreenshotBrowser";
import { useSteamSettingsSearch } from "./hooks/useSteamSettingsSearch";
import { useBonsaiPluginShell } from "./hooks/useBonsaiPluginShell";
import { usePermissionJump } from "./hooks/usePermissionJump";
import { effectiveCapabilities, useKidsLock } from "./hooks/useKidsLock";
import { useVoiceAskWithReadAloud } from "./features/voice/useVoiceAskWithReadAloud";
import { useDeveloperToolActions } from "./features/plugin-shell/useDeveloperToolActions";
import { useSlowResponseWarningTimer, useUnifiedInputPersistence } from "./features/plugin-shell/useUnifiedInputBehaviors";
import { useRoutingOrderModal } from "./features/model-routing/useRoutingOrderModal";
import { useOllamaModelsHubModal } from "./features/plugin-shell/useOllamaModelsHubModal";
import { useCharacterPickerModal } from "./features/plugin-shell/useCharacterPickerModal";
import { useDesktopNoteSaveModal } from "./features/plugin-shell/useDesktopNoteSaveModal";
import { usePluginHelpModal } from "./features/plugin-shell/usePluginHelpModal";
import { useBonsaiAskOrchestration } from "./hooks/useBonsaiAskOrchestration";
import { useChatSlots } from "./hooks/useChatSlots";
import { useDisclaimerAndLocalRuntimeGates } from "./hooks/useDisclaimerAndLocalRuntimeGates";
import { useCapturedFrontendErrors } from "./hooks/useCapturedFrontendErrors";
import { useDeckyPreviewTestHookRegistration } from "./preview/useDeckyPreviewTestHookRegistration";
import { useSessionResetActions } from "./features/plugin-shell/useSessionResetActions";
import { useSessionRestoreAfterRemount } from "./features/plugin-shell/useSessionRestoreAfterRemount";
import { useChatSlotActivityState } from "./features/plugin-shell/useChatSlotActivityState";
import { useBonsaiScopeStyle } from "./features/plugin-shell/useBonsaiScopeStyle";
import { useExternalNavigationActions } from "./features/plugin-shell/useExternalNavigationActions";

/*
 * In: nothing — no props. Every value Content needs, it reads from settings,
 * from Router.MainRunningApp, or from its own hooks.
 * Out: the whole panel's JSX, as drawn in the file header above.
 * What can go wrong: heavy logic lives in the hooks under src/hooks/
 * (`usePluginSettings`, `useBackgroundGameAi`, `useDisclaimerAndLocalRuntimeGates`,
 * `useBonsaiAskOrchestration`, `useCapturedFrontendErrors`) and the feature
 * modules under src/features/, on purpose, so a fault in one of them is a
 * fault in a small, separately readable file rather than in this one — and
 * Root wraps this whole component in an error boundary, so a fault that does
 * happen here shows a recoverable error instead of a blank panel.
 *
 * See the file header's How it works for the full step order; in short:
 * 1. Load every hook this component depends on.
 * 2. Track the state that belongs to Content itself.
 * 3. Wire up session survival, and the two ways to deliberately throw one
 *    away.
 * 4. Build one useXxxTabPayload() call per tab.
 * 5. Assemble the tab list and render the tab strip.
 * 6. (Outside this function) definePlugin() hands the finished tree to
 *    Decky.
 */
const Content: React.FC = () => {
  const sessionSnapshotRef = useRef<() => BonsaiSessionSurvivalSnapshot>(buildInitialSessionSnapshot);

  const {
    activeSlotIdRef,
    generatingSlotId,
    onGeneratingSlotChange,
    isSlotGenerating,
    unreadSlotIds,
    setUnreadSlotIds,
    reloadSlotTranscriptRef,
    ensureActiveSlotForAskRef,
  } = useChatSlotActivityState();

  const {
    currentTab,
    setCurrentTab,
    characterPickerReturnTabRef,
    finalizeShowModalAndRestoreActiveTab,
    onCompleteDeckyModalClose,
    captureSessionBeforeModal,
    onTabsShowTab,
    selectTab,
  } = useBonsaiPluginShell({
    getSessionSnapshot: () => sessionSnapshotRef.current(),
  });

  const quickAccessVisible = useQuickAccessVisible();

  useReplySurfaceVisibility(quickAccessVisible && currentTab === "main");

  useLayoutEffect(() => {
    if (consumePendingFocusMainTab()) {
      setCurrentTab("main");
    }
  }, [setCurrentTab]);

  const pendingSessionRestoreFinalizeRef = useRef(false);
  const pluginDataClearSeenRef = useRef(getPluginDataClearedGeneration());
  /*
   * "The field's text came from the mic" (D99 call 3) is cleared here too, ahead of where
   * useVoiceAskWithReadAloud is called below — a ref so the clear points that run earlier in this
   * function do not have to wait on hook declaration order. Populated once useVoiceAskWithReadAloud
   * mounts (it wraps useVoiceAskInput).
   */
  const clearAskCameFromMicRef = useRef<() => void>(() => {});

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
    remeasureUnifiedInputSurface,
  } = useUnifiedInputSurface(currentTab, unifiedInput);

  const {
    pluginHelpDismissed,
    openPluginHelpModal,
    restorePluginHelpDismissed,
    resetPluginHelpDismissed,
  } = usePluginHelpModal({
    currentTab,
    captureSessionBeforeModal,
    finalizeShowModalAndRestoreActiveTab,
    returnTabRef: characterPickerReturnTabRef,
  });

  const attachActionHostRef = useRef<HTMLDivElement>(null);

  const {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    voiceReplyMode,
    setVoiceReplyMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
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
    presetChipFadeAnimationEnabled,
    presetChipAnimation,
    setPresetChipAnimation,
    setPresetChipFadeAnimationEnabled,
    presetSingleChip,
    setPresetSingleChip,
    askMode,
    setAskMode,
    ollamaKeepAlive,
    setOllamaKeepAlive,
    replyVerbosity,
    setReplyVerbosity,
    askThinkEffort,
    setAskThinkEffort,
    replyLanguage,
    setReplyLanguage,
    showDeveloperTab,
    setShowDeveloperTab,
    modelPolicyTier,
    setModelPolicyTier,
    modelPolicyNonFossUnlocked,
    setModelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    setModelAllowHighVramFallbacks,
    textModelRoutingOrder,
    setTextModelRoutingOrder,
    visionModelRoutingOrder,
    setVisionModelRoutingOrder,
    ollamaLocalOnDeck,
    setOllamaLocalOnDeck,
    ollamaLocalAutostart,
    setOllamaLocalAutostart,
    strategySpoilerMaskingEnabled,
    setStrategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    steamWebApiKey,
    setSteamWebApiKey,
    showOnscreenDebugHud,
    devForceSessionRagChips,
    devPreloadAskModel,
    devFrozenTestChips,
    setShowOnscreenDebugHud,
    setDevForceSessionRagChips,
    setDevPreloadAskModel,
    setDevFrozenTestChips,
    tabResumeMode,
    setTabResumeMode,
    namedOllamaHosts,
    setNamedOllamaHosts,
    voiceSttModel,
    setVoiceSttModel,
    uiScaleAutoEnabled,
    setUiScaleAutoEnabled,
    uiScaleManualProfile,
    setUiScaleManualProfile,
    useLocalKnowledgeBase,
    setUseLocalKnowledgeBase,
    ragHybridRetrievalEnabled,
    setRagHybridRetrievalEnabled,
    ragCorpusPath,
    ragCorpusVersion,
    settingsLoaded,
    hydrateFromSettings,
    pauseDebouncedSettingsSave,
    buildChangedSettingsPayload,
    syncSettingsFromDisk,
  } = usePluginSettings();

  // Frozen QA chips live in a module-level register in `presets.ts` because the sampler is called
  // from several places that have no access to settings. Syncing it here keeps settings the single
  // source of truth: change the list on disk (or clear it in the Developer tab) and the carousel
  // follows on the next render, with no rebuild.
  useEffect(() => {
    setFrozenTestChips(devFrozenTestChips);
  }, [devFrozenTestChips]);

  const kidsLockActive = useKidsLock();
  const gatedCapabilities = useMemo(
    () => effectiveCapabilities(capabilities, kidsLockActive),
    [capabilities, kidsLockActive]
  );

  const { effectiveLang, steamClientLanguageLabel, t: uiT } = useReplyLanguage(replyLanguage);

  const isAskingRef = useRef(false);
  const {
    screenshotBrowserHostRef,
    isScreenshotBrowserOpen,
    mediaError,
    recentScreenshots,
    isLoadingRecentScreenshots,
    isCapturingScreenshot,
    selectedAttachment,
    setSelectedAttachment,
    loadRecentScreenshots,
    onTakeScreenshot,
    onOpenScreenshotBrowser,
    onCloseScreenshotBrowser,
    onSelectRecentScreenshot,
    restoreScreenshotBrowserSnapshot,
  } = useScreenshotBrowser({
    getIsAsking: () => isAskingRef.current,
    mediaLibraryAccess: gatedCapabilities.media_library_access,
    filesystemWrite: gatedCapabilities.filesystem_write,
  });

  const [uiScaleApplyToken, setUiScaleApplyToken] = useState(0);
  const uiScale = useUiScaleProfile({
    scopeRef: bonsaiScopeRef,
    autoEnabled: uiScaleAutoEnabled,
    manualProfile: uiScaleManualProfile,
    settingsLoaded,
    applyToken: uiScaleApplyToken,
    onRemeasure: remeasureUnifiedInputSurface,
  });

  useQamPanelHeightGuard(bonsaiScopeRef);
  useQamPanelSideBleed(bonsaiScopeRef);
  useTabStripBodyOffset(bonsaiScopeRef);

  const intentPacks = useIntentPacks();

  const { filteredSettings, onSettingClick } = useSteamSettingsSearch({
    unifiedInput,
    intentPackIndex: intentPacks.index,
    setSelectedIndex,
    setNavigationMessage,
  });

  const appLogPrefs = useMemo(
    () => ({
      desktopAppLogLevel,
      capabilities: { filesystem_write: gatedCapabilities.filesystem_write },
    }),
    [desktopAppLogLevel, gatedCapabilities.filesystem_write]
  );
  const [capturedErrors, setCapturedErrors] = useCapturedFrontendErrors(appLogPrefs);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (currentTab !== "developer" && currentTab !== "settings") return;
    appendAppDesktopLogWithPrefs(appLogPrefs, "verbose", "ui.tab", `opened ${currentTab} tab`);
  }, [currentTab, settingsLoaded, appLogPrefs]);

  // --- Connection / host state (Ask + poll state: ``useBonsaiAskOrchestration``) ---
  const {
    ollamaIp,
    setOllamaIp,
    effectiveOllamaPcIp,
    persistOllamaIpIfRoutingToLan,
    lastConnectionStatus,
    setLastConnectionStatus,
    ollamaTabResetKey,
    resetOllamaTab,
  } = useOllamaConnectionState({ ollamaLocalOnDeck });

  const {
    ollamaResponse,
    ollamaContext,
    lastExchange,
    strategyGuideBranches,
    strategyChecklist,
    modelPolicyDisclosure,
    presetCarouselInject,
    shortcutSetupVariant,
    suggestedPrompts,
    showSlowWarning,
    setShowSlowWarning,
    elapsedSeconds,
    lastTransparency,
    thinkingSummary,
    liveReasoning,
    kbAttachedNotes,
    lastRequestId,
    askThreadCollapsed,
    expandedTurnKey,
    onTurnActivate,
    askThreadDisplayQuestion,
    isAsking,
    askStopped,
    isForeignPendingAsk,
    isStreamingPreview,
    isStreamSettling,
    streamDisplayText,
    lastApplied,
    clearUnifiedInput,
    onCancelAsk,
    onAskOllama,
    onRetryLastResponse,
    onReplyFeedback,
    onReplyMicroAction,
    liveReplyFeedbackRating,
    liveReplyChipUsed,
    liveReplyChipError,
    onStrategyBranchPick,
    onStrategyChecklistToggle,
    resetAskSessionSlice,
    resetLiveAskPresentation,
    setStrategyGuideBranches,
    reseedSuggestedPrompts,
    restoreSessionSnapshot,
    setAskThreadCollapsed,
    setAskThreadDisplayQuestion,
    setExpandedTurnKey,
  } = useBonsaiAskOrchestration({
    desktopDebugNoteAutoSave,
    filesystemWrite: gatedCapabilities.filesystem_write,
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
    aiCharacterEnabled,
    aiCharacterPresetId,
    useLocalKnowledgeBase,
    settingsLoaded,
    devForceSessionRagChips,
    activeSlotIdRef,
    ensureActiveSlotForAsk: (question) =>
      ensureActiveSlotForAskRef.current?.(question) ?? Promise.resolve(null),
    onSlotTurnsChanged: () => {
      void reloadSlotTranscriptRef.current?.();
    },
    onGeneratingSlotChange,
    onSlotAnswerFinished: (slotId) => {
      setUnreadSlotIds((prev) => {
        if (prev.has(slotId)) return prev;
        const next = new Set(prev);
        next.add(slotId);
        return next;
      });
    },
  });

  const chatSlots = useChatSlots({
    activeSlotIdRef,
    initialActiveSlotId: activeSlotIdRef.current,
    setAskThreadCollapsed,
    setAskThreadDisplayQuestion,
    setExpandedTurnKey,
    resetLiveAskPresentation,
    isSlotGenerating,
  });
  reloadSlotTranscriptRef.current = chatSlots.reloadActiveSlotTranscript;
  ensureActiveSlotForAskRef.current = chatSlots.ensureActiveSlotForAsk;

  useEffect(() => {
    void chatSlots.refreshSummaries();
  }, [chatSlots.refreshSummaries]);

  /* Arriving at a slot is what marks it read. */
  useEffect(() => {
    const id = chatSlots.activeSlotId;
    if (!id) return;
    setUnreadSlotIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [chatSlots.activeSlotId]);

  isAskingRef.current = isAsking;

  useSessionRestoreAfterRemount({
    pluginDataClearSeenRef,
    pendingSessionRestoreFinalizeRef,
    activeSlotIdRef,
    chatSlots,
    setCurrentTab,
    setUnifiedInput,
    setSelectedIndex,
    setNavigationMessage,
    restoreScreenshotBrowserSnapshot,
    restorePluginHelpDismissed,
    setOllamaIp,
    hydrateFromSettings,
    restoreSessionSnapshot,
  });

  const effectiveLatencyWarningSeconds = useMemo(
    () => (latencyTimeoutsCustomEnabled ? latencyWarningSeconds : DEFAULT_LATENCY_WARNING_SECONDS),
    [latencyTimeoutsCustomEnabled, latencyWarningSeconds]
  );

  const bonsaiScopeStyle = useBonsaiScopeStyle({
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    uiScaleScopeStyle: uiScale.scopeStyle,
  });

  useEffect(() => {
    if (!settingsLoaded) return;
    if (!showDeveloperTab && currentTab === "developer") {
      setCurrentTab("main");
      toaster.toast({ title: "Developer tab hidden", body: "Switched to Main.", duration: 2800 });
    }
  }, [showDeveloperTab, currentTab, settingsLoaded]);

  useEffect(() => {
    if (askMode !== "strategy") {
      setStrategyGuideBranches(null);
    }
  }, [askMode, setStrategyGuideBranches]);

  const { jumpToPermission, returnFromPermissionJump, permissionJumpReturnTab } = usePermissionJump({
    currentTab,
    setCurrentTab,
  });

  const goToOllamaTab = useCallback(() => {
    setCurrentTab("ollama");
  }, []);

  const settingsSnapshotForSave = useMemo(
    () => ({
      latencyWarningSeconds,
      requestTimeoutSeconds,
      latencyTimeoutsCustomEnabled,
      unifiedInputPersistenceMode,
      voiceReplyMode,
      screenshotAttachmentPreset,
      desktopDebugNoteAutoSave,
      desktopAskVerboseLogging,
      desktopAppLogLevel,
      presetChipFadeAnimationEnabled,
      presetChipAnimation,
      presetSingleChip,
      inputSanitizerUserDisabled,
      capabilities,
      aiCharacterEnabled,
      aiCharacterRandom,
      aiCharacterPresetId,
      aiCharacterCustomText,
      aiCharacterAccentIntensity,
      askMode,
      ollamaKeepAlive,
      replyVerbosity,
      askThinkEffort,
      replyLanguage,
      showDeveloperTab,
      modelPolicyTier,
      modelPolicyNonFossUnlocked,
      modelAllowHighVramFallbacks,
      textModelRoutingOrder,
      visionModelRoutingOrder,
      ollamaLocalOnDeck,
      ollamaLocalAutostart,
      strategySpoilerMaskingEnabled,
      strategySpoilerAutoRevealAfterConsent,
      steamWebApiKey,
      showOnscreenDebugHud,
      devForceSessionRagChips,
      devPreloadAskModel,
      devFrozenTestChips,
      tabResumeMode,
      namedOllamaHosts,
      voiceSttModel,
      uiScaleAutoEnabled,
      uiScaleManualProfile,
      useLocalKnowledgeBase,
      ragHybridRetrievalEnabled,
      ragCorpusPath,
      ragCorpusVersion,
    }),
    [
      latencyWarningSeconds,
      requestTimeoutSeconds,
      latencyTimeoutsCustomEnabled,
      unifiedInputPersistenceMode,
      voiceReplyMode,
      screenshotAttachmentPreset,
      desktopDebugNoteAutoSave,
      desktopAskVerboseLogging,
      desktopAppLogLevel,
      presetChipFadeAnimationEnabled,
      presetChipAnimation,
      presetSingleChip,
      inputSanitizerUserDisabled,
      capabilities,
      aiCharacterEnabled,
      aiCharacterRandom,
      aiCharacterPresetId,
      aiCharacterCustomText,
      aiCharacterAccentIntensity,
      askMode,
      ollamaKeepAlive,
      replyVerbosity,
      askThinkEffort,
      replyLanguage,
      showDeveloperTab,
      modelPolicyTier,
      modelPolicyNonFossUnlocked,
      modelAllowHighVramFallbacks,
      textModelRoutingOrder,
      visionModelRoutingOrder,
      ollamaLocalOnDeck,
      ollamaLocalAutostart,
      strategySpoilerMaskingEnabled,
      strategySpoilerAutoRevealAfterConsent,
      steamWebApiKey,
      showOnscreenDebugHud,
      devForceSessionRagChips,
      devPreloadAskModel,
      devFrozenTestChips,
      tabResumeMode,
      namedOllamaHosts,
      voiceSttModel,
      uiScaleAutoEnabled,
      uiScaleManualProfile,
      useLocalKnowledgeBase,
      ragHybridRetrievalEnabled,
      ragCorpusPath,
      ragCorpusVersion,
    ]
  );

  const onApplyUiScale = useCallback(
    async (autoEnabled: boolean, manualProfile: UiScaleProfileId) => {
      const normalized = normalizeUiScaleProfileId(manualProfile);
      setUiScaleAutoEnabled(autoEnabled);
      setUiScaleManualProfile(normalized);
      await pauseDebouncedSettingsSave();
      const saved = await callDeckyWithTimeout<[Partial<BonsaiSettings>], BonsaiSettings>("save_settings", [
        buildChangedSettingsPayload({
          ui_scale_auto_enabled: autoEnabled,
          ui_scale_manual_profile: normalized,
        }),
      ]);
      hydrateFromSettings(saved);
      setUiScaleApplyToken((t) => t + 1);
      toaster.toast({ title: "UI scale applied", body: "Plugin layout updated.", duration: 2800 });
    },
    [
      buildChangedSettingsPayload,
      hydrateFromSettings,
      pauseDebouncedSettingsSave,
      setUiScaleAutoEnabled,
      setUiScaleManualProfile,
    ],
  );

  /* Changed fields plus the patch, never a full copy: see buildChangedSettingsPayload. */
  const buildSettingsPayload = buildChangedSettingsPayload;

  sessionSnapshotRef.current = () => ({
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
    strategyChecklist,
    elapsedSeconds,
    lastApplied,
    shortcutSetupVariant,
    presetCarouselInject,
    showSlowWarning,
    lastRequestId,
    thinkingSummary,
    liveReasoning,
    activeSlotId: chatSlots.activeSlotId,
  });

  const {
    showDisclaimerModalAgain,
    ollamaLocalOnDeckPrevRef,
    localRuntimeBetaPromptIssuedRef,
  } = useDisclaimerAndLocalRuntimeGates(settingsLoaded, ollamaLocalOnDeck, {
    onBeforeDeckyModal: captureSessionBeforeModal,
    onCompleteDeckyModalClose,
  });

  useDeckyPreviewTestHookRegistration({
    currentTab,
    setCurrentTab,
    unifiedInput,
    setUnifiedInput,
    askMode,
    isAsking,
    ollamaResponse,
    lastExchange,
    capabilities,
    lastTransparency,
    onAskOllama,
    setSelectedAttachment,
    restoreSessionSnapshot,
    sessionSnapshotRef,
    showDisclaimerModalAgain,
  });

  const { openModelPolicyReadme, onOpenControllerSettingsForShortcut } = useExternalNavigationActions();

  // --- Ask bar timers and persistence ---
  useSlowResponseWarningTimer({
    isAsking,
    isStreamingPreview,
    effectiveLatencyWarningSeconds,
    setShowSlowWarning,
  });

  useUnifiedInputPersistence({
    unifiedInput,
    unifiedInputPersistenceMode,
    filteredSettingsCount: filteredSettings.length,
    setUnifiedInput,
    clearAskCameFromMicRef,
  });


  const { resetPluginSession, onClearAllPluginData } = useSessionResetActions({
    chatSlots,
    resetAskSessionSlice,
    reseedSuggestedPrompts,
    uiT,
    setUnifiedInput,
    clearAskCameFromMicRef,
    setSelectedIndex,
    setNavigationMessage,
    setSelectedAttachment,
    setLastConnectionStatus,
    resetOllamaTab,
    pauseDebouncedSettingsSave,
    syncSettingsFromDisk,
    setOllamaIp,
    localRuntimeBetaPromptIssuedRef,
    ollamaLocalOnDeckPrevRef,
    resetPluginHelpDismissed,
    intentPacks,
    showDisclaimerModalAgain,
  });

  const {
    voiceRecording,
    onMicInput,
    micPermissionDenied,
    dismissMicPermissionDeny,
    clearAskCameFromMic,
    onAskOllamaWithReadAloud,
  } = useVoiceAskWithReadAloud({
    setUnifiedInput,
    unifiedInput,
    microphoneAccess: gatedCapabilities.microphone_access,
    isAsking,
    uiT,
    clearAskCameFromMicRef,
    voiceReplyMode,
    strategySpoilerMaskingEnabled,
    lastRequestId,
    onAskOllama,
  });

  const showSearchClearButton = Boolean(unifiedInput.trim());

  const openDesktopNoteSaveModal = useDesktopNoteSaveModal({
    filesystemWrite: gatedCapabilities.filesystem_write,
    lastExchange,
    jumpToPermission,
    currentTab,
    finalizeShowModalAndRestoreActiveTab,
    returnTabRef: characterPickerReturnTabRef,
  });

  const openCharacterPickerModal = useCharacterPickerModal({
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    setAiCharacterRandom,
    setAiCharacterPresetId,
    setAiCharacterCustomText,
    buildSettingsPayload,
    hydrateFromSettings,
    captureSessionBeforeModal,
    finalizeShowModalAndRestoreActiveTab,
  });

  const { openOllamaModelsHub, onApplyTier2MultimodalPolicy } = useOllamaModelsHubModal({
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    setModelPolicyTier,
    setModelPolicyNonFossUnlocked,
    setModelAllowHighVramFallbacks,
    activeRoutingTag: modelPolicyDisclosure?.model ?? null,
    buildSettingsPayload,
    hydrateFromSettings,
    pauseDebouncedSettingsSave,
    goToOllamaTab,
    openModelPolicyReadme,
    captureSessionBeforeModal,
    finalizeShowModalAndRestoreActiveTab,
  });

  const catalogByTag = useMemo(() => {
    const m = new Map<string, (typeof PULL_MODEL_CATALOG)[number]>();
    for (const e of PULL_MODEL_CATALOG) m.set(e.tag, e);
    return m;
  }, []);

  const openRoutingOrderModal = useRoutingOrderModal({
    ollamaLocalOnDeck,
    ollamaIp,
    textModelRoutingOrder,
    visionModelRoutingOrder,
    setTextModelRoutingOrder,
    setVisionModelRoutingOrder,
    catalogByTag,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    setLastConnectionStatus,
    captureSessionBeforeModal,
    finalizeShowModalAndRestoreActiveTab,
    pauseDebouncedSettingsSave,
    buildSettingsPayload,
    hydrateFromSettings,
  });

  // =====================================================================
  // TAB CONTENT
  // =====================================================================

  const mainTab = useMainTabPayload({
    suggestedPrompts,
    showPluginHelpChip: !pluginHelpDismissed,
    useLocalKnowledgeBase,
    onOpenPluginHelp: openPluginHelpModal,
    presetChipFadeAnimationEnabled,
    presetChipAnimation,
    presetSingleChip,
    onRetryLastResponse,
    liveReplyFeedbackRating,
    onReplyFeedback,
    onReplyMicroAction,
    liveReplyChipUsed,
    liveReplyChipError,
    setUnifiedInput,
    unifiedInputHostRef: unifiedInputHostRef as React.Ref<HTMLDivElement>,
    unifiedInputFieldLayerRef: unifiedInputFieldLayerRef as React.Ref<HTMLDivElement>,
    unifiedInputMeasureRef: unifiedInputMeasureRef as React.Ref<HTMLDivElement>,
    attachActionHostRef: attachActionHostRef as React.Ref<HTMLDivElement>,
    askBarHostRef: askBarHostRef as React.Ref<HTMLDivElement>,
    screenshotBrowserHostRef: screenshotBrowserHostRef as React.Ref<HTMLDivElement>,
    unifiedInputSurfacePx,
    unifiedInput,
    usesNativeMultilineField,
    setIsUnifiedInputFocused,
    isUnifiedInputFocused,
    setSelectedIndex,
    filteredSettings,
    selectedIndex,
    onSettingClick,
    isAsking,
    ollamaIp: effectiveOllamaPcIp,
    onAskOllama: onAskOllamaWithReadAloud,
    onOpenScreenshotBrowser,
    onTakeScreenshot,
    onCancelAsk,
    onMicInput,
    voiceRecording,
    selectedAttachment,
    setSelectedAttachment,
    clearUnifiedInput,
    showSearchClearButton,
    isScreenshotBrowserOpen,
    onCloseScreenshotBrowser,
    loadRecentScreenshots,
    mediaError,
    isCapturingScreenshot,
    recentScreenshots,
    isLoadingRecentScreenshots,
    onSelectRecentScreenshot,
    navigationMessage,
    showSlowWarning,
    latencyWarningSeconds: effectiveLatencyWarningSeconds,
    ollamaResponse,
    elapsedSeconds,
    lastApplied,
    ollamaContext,
    canSaveDesktopNote: Boolean(lastExchange),
    onOpenDesktopNoteSave: openDesktopNoteSaveModal,
    mediaLibraryEnabled: gatedCapabilities.media_library_access,
    gameContextReadEnabled: gatedCapabilities.media_library_access && gatedCapabilities.steam_logs_read,
    onNavigateToPermissions: jumpToPermission,
    micPermissionDenied,
    onDismissMicPermissionDeny: dismissMicPermissionDeny,
    desktopNoteSaveEnabled: gatedCapabilities.filesystem_write,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    openCharacterPickerModal,
    transparencySnapshot: lastTransparency,
    onRunOriginalAsk: (text) => {
      setUnifiedInput(text);
      clearAskCameFromMic();
      if (unifiedInputPersistenceMode === "persist_all") {
        persistSearchQuery(text);
      }
    },
    askMode,
    onAskModeChange: setAskMode,
    strategyGuideBranches,
    strategyChecklist,
    onStrategyChecklistToggle,
    onStrategyBranchPick,
    onPresetPreferAskMode: setAskMode,
    askThreadCollapsed,
    askThreadDisplayQuestion,
    expandedTurnKey,
    onTurnActivate,
    modelPolicyDisclosure,
    onOpenModelPolicyReadme: openModelPolicyReadme,
    shortcutSetupVariant,
    onOpenControllerSettings: onOpenControllerSettingsForShortcut,
    strategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    presetCarouselInject,
    isStreamingPreview: isStreamingPreview || isStreamSettling,
    streamDisplayText,
    askStopped,
    isForeignPendingAsk,
    /* The waiting phrase, the model's own thinking, and (plan 58 phase 1) the "From the notes"
       block's own material all travel together while the live turn still streams — see
       LiveThinkingSnapshot. */
    liveThinking: { summary: thinkingSummary, reasoning: liveReasoning, kbAttachedNotes },
    desktopAskVerboseLogging,
    lastRequestId,
    lastExchange,
    chatSlotSummaries: chatSlots.summaries,
    activeChatSlotId: chatSlots.activeSlotId,
    onChatSlotCreate: chatSlots.createSlot,
    onChatSlotSelect: chatSlots.selectSlot,
    onChatSlotRename: chatSlots.renameSlot,
    onChatSlotDelete: chatSlots.deleteSlot,
    onBeforeNestedDeckyModal: captureSessionBeforeModal,
    onCompleteNestedDeckyModalClose: finalizeShowModalAndRestoreActiveTab,
    generatingSlotId,
    unreadSlotIds,
  });


  const settingsTab = useSettingsTabPayload({
    screenshotAttachmentPreset,
    setScreenshotAttachmentPreset,
    unifiedInputPersistenceMode,
    setUnifiedInputPersistenceMode,
    voiceReplyMode,
    setVoiceReplyMode,
    aiCharacterEnabled,
    setAiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    setAiCharacterAccentIntensity,
    showDeveloperTab,
    setShowDeveloperTab,
    strategySpoilerMaskingEnabled,
    setStrategySpoilerMaskingEnabled,
    voiceSttModel,
    setVoiceSttModel,
    microphoneAccessEnabled: gatedCapabilities.microphone_access,
    onJumpToPermission: jumpToPermission,
    uiScaleAutoEnabled,
    uiScaleManualProfile,
    appliedUiScaleProfileId: uiScale.appliedProfileId,
    onApplyUiScale,
    onOpenCharacterPicker: openCharacterPickerModal,
    onBeforeDeckyModal: captureSessionBeforeModal,
    onCompleteDeckyModalClose: finalizeShowModalAndRestoreActiveTab,
    onResetSession: resetPluginSession,
    onClearAllPluginData,
    presetSingleChip,
    setPresetSingleChip,
  });

  const ollamaTab = useOllamaTabPayload({
    ollamaTabResetKey,
    ollamaIp,
    effectiveOllamaPcIp,
    onOllamaIpChange: setOllamaIp,
    ollamaLocalOnDeck,
    setOllamaLocalOnDeck,
    ollamaLocalAutostart,
    setOllamaLocalAutostart,
    onLastConnectionStatus: setLastConnectionStatus,
    lastConnectionStatus,
    namedOllamaHosts,
    setNamedOllamaHosts,
    onBeforeDeckyModal: captureSessionBeforeModal,
    onCompleteDeckyModalClose: finalizeShowModalAndRestoreActiveTab,
    onOpenOllamaModelsHub: openOllamaModelsHub,
    onOpenRoutingOrderModal: openRoutingOrderModal,
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    setLatencyTimeoutsCustomEnabled,
    setLatencyWarningSeconds,
    setRequestTimeoutSeconds,
    ollamaKeepAlive,
    setOllamaKeepAlive,
    replyVerbosity,
    setReplyVerbosity,
    askThinkEffort,
    setAskThinkEffort,
    modelPolicyTier,
    onApplyTier2MultimodalPolicy,
    useLocalKnowledgeBase,
    setUseLocalKnowledgeBase,
    ragCorpusVersion,
  });

  const permissionsTab = usePermissionsTabPayload({
    capabilities,
    setCapabilities,
    permissionJumpReturnTab,
    onReturnFromPermissionJump: returnFromPermissionJump,
    kidsLockActive,
  });

  const { onSteamInputPhase1Jump, installSeedKnowledgeBase } = useDeveloperToolActions({
    syncSettingsFromDisk,
  });

  const developerTab = useDeveloperTabPayload({
    capturedErrors,
    setCapturedErrors,
    onSteamInputPhase1Jump,
    lastConnectionStatus,
    desktopDebugNoteAutoSave,
    setDesktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    setDesktopAskVerboseLogging,
    desktopAppLogLevel,
    setDesktopAppLogLevel,
    filesystemWrite: gatedCapabilities.filesystem_write,
    onJumpToPermission: jumpToPermission,
    presetChipFadeAnimationEnabled,
    setPresetChipFadeAnimationEnabled,
    presetChipAnimation,
    setPresetChipAnimation,
    steamWebApiKey,
    setSteamWebApiKey,
    showOnscreenDebugHud,
    setShowOnscreenDebugHud,
    devForceSessionRagChips,
    setDevForceSessionRagChips,
    devPreloadAskModel,
    setDevPreloadAskModel,
    devFrozenTestChips,
    setDevFrozenTestChips,
    ragHybridRetrievalEnabled,
    setRagHybridRetrievalEnabled,
    tabResumeMode,
    setTabResumeMode,
    installSeedKnowledgeBase,
    showDeveloperTab,
  });

  const aboutTab = useAboutTabPayload({
    replyLanguage,
    onReplyLanguageChange: setReplyLanguage,
    effectiveLang,
    steamClientLanguageLabel,
    t: uiT,
  });

  const deckyTabs = useMemo(
    () => {
      const rows: Array<{ id: string; title: React.ReactElement; content: React.ReactNode }> = [
        {
          id: "main",
          title: DECKY_TAB_TITLES.main,
          // `display: contents` rather than the panel shell the other tabs use. Main lays out
          // with `bonsai-full-bleed-row` and negative margins, and the `--tight` modifier sets
          // `overflow-x: hidden` (styles/sections/scopeBase.ts), which would clip it. A
          // contents box generates no box at all, so this is queryable with provably zero
          // layout effect — it exists only so `snapshotDom` can scope to this panel.
          content: (
            <div data-bonsai-tab-panel="main" style={{ display: "contents" }}>
              {mainTab}
            </div>
          ),
        },
        // Every body but Main sits in a TabBodyFocusRoot so the collapsing tab bar can hand the
        // ring down into it and the body can hand it back up (plan 30 W4). Main's chat-slot row
        // is already a registered stop and does both itself.
        {
          id: "ollama",
          title: DECKY_TAB_TITLES.ollama,
          content: <TabBodyFocusRoot id="ollama">{ollamaTab}</TabBodyFocusRoot>,
        },
        {
          id: "settings",
          title: DECKY_TAB_TITLES.settings,
          content: <TabBodyFocusRoot id="settings">{settingsTab}</TabBodyFocusRoot>,
        },
        {
          id: "permissions",
          title: DECKY_TAB_TITLES.permissions,
          content: (
            <TabBodyFocusRoot id="permissions">
              <div
                className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack"
                data-bonsai-tab-panel="permissions"
              >
                {permissionsTab}
              </div>
            </TabBodyFocusRoot>
          ),
        },
      ];
      if (showDeveloperTab) {
        rows.push({
          id: "developer",
          title: DECKY_TAB_TITLES.developer,
          content: <TabBodyFocusRoot id="developer">{developerTab}</TabBodyFocusRoot>,
        });
      }
      rows.push({
        id: "about",
        title: DECKY_TAB_TITLES.about,
        content: (
          <TabBodyFocusRoot id="about">
            <div
              className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight"
              data-bonsai-tab-panel="about"
            >
              {aboutTab}
            </div>
          </TabBodyFocusRoot>
        ),
      });
      return rows;
    },
    [showDeveloperTab, mainTab, ollamaTab, settingsTab, permissionsTab, developerTab, aboutTab]
  );
  /** The bar's dash count follows the mounted tabs — five without Developer, six with. */
  const tabBarIds = useMemo(() => deckyTabs.map((row) => row.id as BonsaiTabId), [deckyTabs]);
  /**
   * Down from the collapsing tab bar (plan 30 W4). Main's first stop is the chat-slot row, already a
   * registered nav target; every other body is wrapped in a TabBodyFocusRoot. False when the target
   * is not registered, and the bar lets Steam decide (the hidden-header trap covers that landing).
   */
  const tabBarExitDown = useCallback(
    () => takeNavFocus(currentTab === "main" ? "chat-slot-row" : tabBodyNavFocusId(currentTab as BonsaiTabId)),
    [currentTab],
  );
  /**
   * B inside a tab body. Steam's `Tabs` would focus its own header — hidden now, so that is the
   * ghost stop — unless `cancelSkipTabHeader` is set, in which case the press reaches this handler on
   * the page's outer Focusable (read from Steam's source 2026-09-02, plan 30 § 8). The bar takes the
   * ring and the press is consumed the way DrgGlossaryTermChip consumes B; if the bar is not
   * registered the press is left alone and Steam backs out of the panel as it always could.
   */
  const onCancelFromTabHeader = useCallback((evt: unknown) => {
    if (takeNavFocus("tab-bar")) {
      (evt as { preventDefault?: () => void } | undefined)?.preventDefault?.();
    }
  }, []);

  return (
    <BonsaiPluginShell scopeRef={bonsaiScopeRef} scopeStyle={bonsaiScopeStyle}>
      <UiScaleProvider
        value={{
          profileId: uiScale.appliedProfileId,
          scopeStyle: uiScale.scopeStyle,
          generation: uiScale.generation,
          requestApply: () => setUiScaleApplyToken((t) => t + 1),
        }}
      >
        <BonsaiDebugOverlay enabled={showOnscreenDebugHud} />
        {/*
          data-bonsai-active-tab drives the persistent active-tab marker in section-1.ts.
          Measured on device 2026-08-04: SteamOS does not put `.Active` on these tab buttons, it
          uses a build-hashed class, so the marker cannot be keyed on Steam's own classes. This
          attribute is the only thing that changes on a tab switch — DECKY_TAB_TITLES stays
          referentially identical, so the strip itself does not re-render.
        */}
        {/*
          The collapsing tab bar (plan 30) and the tabs root share one keyed fragment so a UI-scale
          Apply remounts both together, and the bar comes before the root so the scope's flex column
          puts it on top; Steam's own header inside the root is hidden by section-1.ts.
        */}
        <React.Fragment key={`bonsai-tabs-gen-${uiScale.generation}`}>
          <TabIndicatorBar
            tabIds={tabBarIds}
            currentTab={currentTab}
            selectTab={selectTab}
            exitDown={tabBarExitDown}
          />
          <div className="bonsai-decky-tabs-root" data-bonsai-active-tab={currentTab}>
            <Tabs
              activeTab={currentTab}
              onShowTab={onTabsShowTab}
              tabs={deckyTabs}
              {...({
                autoFocusContents: false,
                cancelSkipTabHeader: true,
                onCancelFromTabHeader,
              } as Record<string, unknown>)}
            />
          </div>
        </React.Fragment>
      </UiScaleProvider>
    </BonsaiPluginShell>
  );
};

// Mount the content tree inside an error boundary to keep plugin recovery user-accessible.
const Root: React.FC = () => (
  <PluginErrorBoundary>
    <Content />
  </PluginErrorBoundary>
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
