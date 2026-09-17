import { describe, expect, it } from "vitest";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  finalizeSessionRestoreAfterRemount,
  acknowledgePluginDataClearHandled,
  markPluginDataCleared,
  patchPendingSessionSettingsSnapshot,
  patchPendingSessionSurvival,
  peekBonsaiSessionPendingRestore,
  shouldIgnoreRestoredSettingsSnapshot,
  takeRestoredSettingsSnapshot,
  type BonsaiSessionSurvivalSnapshot,
} from "./bonsaiSessionSurvival";
import { DEFAULT_CAPABILITIES, DEFAULT_DESKTOP_APP_LOG_LEVEL, DEFAULT_MODEL_POLICY_TIER } from "../data/bonsaiSettingsSchema";
function minimalSnapshot(overrides: Partial<BonsaiSessionSurvivalSnapshot> = {}): BonsaiSessionSurvivalSnapshot {
  return {
    currentTab: "settings",
    unifiedInput: "hello",
    selectedIndex: 2,
    navigationMessage: "Opened: foo",
    selectedAttachment: null,
    isScreenshotBrowserOpen: false,
    mediaError: "",
    recentScreenshots: [],
    isLoadingRecentScreenshots: false,
    pluginHelpDismissed: true,
    ollamaIp: "192.168.1.5",
    settingsSnapshot: {
      latencyWarningSeconds: 45,
      requestTimeoutSeconds: 120,
      latencyTimeoutsCustomEnabled: false,
      unifiedInputPersistenceMode: "persist_all",
      voiceReplyMode: "off",
      screenshotAttachmentPreset: "mid",
      desktopDebugNoteAutoSave: false,
      desktopAskVerboseLogging: false,
      desktopAppLogLevel: DEFAULT_DESKTOP_APP_LOG_LEVEL,
      presetChipFadeAnimationEnabled: true,
      presetChipAnimation: "fade",
      presetSingleChip: false,
      inputSanitizerUserDisabled: false,
      capabilities: { ...DEFAULT_CAPABILITIES },
      aiCharacterEnabled: true,
      aiCharacterRandom: false,
      aiCharacterPresetId: "coach",
      aiCharacterCustomText: "",
      aiCharacterAccentIntensity: "balanced",
      askMode: "speed",
      ollamaKeepAlive: "5m",
      replyVerbosity: "balanced",
      askThinkEffort: "off",
      replyLanguage: "follow_system",
      showDeveloperTab: false,
      modelPolicyTier: DEFAULT_MODEL_POLICY_TIER,
      modelPolicyNonFossUnlocked: false,
      modelAllowHighVramFallbacks: false,
      ollamaLocalOnDeck: true,
      ollamaLocalAutostart: false,
      strategySpoilerMaskingEnabled: true,
      strategySpoilerAutoRevealAfterConsent: false,
      steamWebApiKey: "",
      showOnscreenDebugHud: false, devForceSessionRagChips: false, devPreloadAskModel: false, devFrozenTestChips: [],
      tabResumeMode: "resume",
      namedOllamaHosts: [],
      voiceSttModel: "tiny.en",
      uiScaleAutoEnabled: true,
      uiScaleManualProfile: "handheld",
      useLocalKnowledgeBase: false,
      ragHybridRetrievalEnabled: true,
      ragCorpusPath: "",
      ragCorpusVersion: "",
      textModelRoutingOrder: [],
      visionModelRoutingOrder: [],
    },
    ollamaResponse: "reply text",
    ollamaContext: null,
    lastExchange: { question: "q", answer: "a" },
    askThreadCollapsed: [],
    askThreadDisplayQuestion: "q",
    expandedTurnKey: "live",
    suggestedPrompts: [],
    lastTransparency: null,
    modelPolicyDisclosure: null,
    strategyGuideBranches: null,
    strategyChecklist: null,
    elapsedSeconds: 12,
    lastApplied: null,
    shortcutSetupVariant: null,
    presetCarouselInject: null,
    showSlowWarning: false,
    lastRequestId: 7,
    thinkingSummary: null,
    liveReasoning: null,
    activeSlotId: null,
    ...overrides,
  };
}

describe("bonsaiSessionSurvival", () => {
  it("peek/consume round-trip preserves tab and settings snapshot", () => {
    clearBonsaiSessionSurvival();
    const snap = minimalSnapshot();
    captureBonsaiSessionForModal(snap);
    expect(peekBonsaiSessionPendingRestore()?.currentTab).toBe("settings");
    const consumed = consumeBonsaiSessionAfterRemount();
    expect(consumed?.unifiedInput).toBe("hello");
    expect(peekBonsaiSessionPendingRestore()?.currentTab).toBe("settings");
    finalizeSessionRestoreAfterRemount();
    expect(peekBonsaiSessionPendingRestore()).toBeNull();
    expect(takeRestoredSettingsSnapshot()?.aiCharacterPresetId).toBe("coach");
    expect(takeRestoredSettingsSnapshot()).toBeNull();
  });

  /*
   * Plan 57: closing the panel while the model is thinking and opening it again must bring back
   * the model's own lines and the seconds so far, not drop to the stock waiting phrase.
   */
  it("keeps the model's own thinking across a panel close and reopen", () => {
    clearBonsaiSessionSurvival();
    captureBonsaiSessionForModal(
      minimalSnapshot({ liveReasoning: { partial: "Flank the armour.", seconds: 12 } }),
    );
    expect(peekBonsaiSessionPendingRestore()?.liveReasoning).toEqual({
      partial: "Flank the armour.",
      seconds: 12,
    });
    const consumed = consumeBonsaiSessionAfterRemount();
    expect(consumed?.liveReasoning).toEqual({ partial: "Flank the armour.", seconds: 12 });
    finalizeSessionRestoreAfterRemount();
  });

  it("patchPendingSessionSurvival updates captured tab before remount restore", () => {
    captureBonsaiSessionForModal(minimalSnapshot({ currentTab: "developer" }));
    patchPendingSessionSurvival({ currentTab: "ollama" });
    expect(peekBonsaiSessionPendingRestore()?.currentTab).toBe("ollama");
    const consumed = consumeBonsaiSessionAfterRemount();
    expect(consumed?.currentTab).toBe("ollama");
  });

  it("patchPendingSessionSettingsSnapshot updates captured settings before remount restore", () => {
    captureBonsaiSessionForModal(minimalSnapshot());
    patchPendingSessionSettingsSnapshot({ modelPolicyTier: "open_weight" });
    const consumed = consumeBonsaiSessionAfterRemount();
    expect(consumed?.settingsSnapshot.modelPolicyTier).toBe("open_weight");
    expect(takeRestoredSettingsSnapshot()?.modelPolicyTier).toBe("open_weight");
  });

  it("clear wipes pending restore", () => {
    captureBonsaiSessionForModal(minimalSnapshot());
    clearBonsaiSessionSurvival();
    expect(peekBonsaiSessionPendingRestore()).toBeNull();
    expect(consumeBonsaiSessionAfterRemount()).toBeNull();
  });

  it("markPluginDataCleared blocks restored settings after clear", () => {
    clearBonsaiSessionSurvival();
    acknowledgePluginDataClearHandled();
    captureBonsaiSessionForModal(
      minimalSnapshot({
        settingsSnapshot: {
          ...minimalSnapshot().settingsSnapshot,
          capabilities: { ...DEFAULT_CAPABILITIES, filesystem_write: true },
        },
      })
    );
    markPluginDataCleared();
    expect(shouldIgnoreRestoredSettingsSnapshot(0)).toBe(true);
    expect(peekBonsaiSessionPendingRestore()).toBeNull();
    expect(consumeBonsaiSessionAfterRemount()).toBeNull();
    expect(takeRestoredSettingsSnapshot()).toBeNull();
  });
});
