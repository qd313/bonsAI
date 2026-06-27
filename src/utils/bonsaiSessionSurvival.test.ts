import { describe, expect, it } from "vitest";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  finalizeSessionRestoreAfterRemount,
  peekBonsaiSessionPendingRestore,
  takeRestoredSettingsSnapshot,
  type BonsaiSessionSurvivalSnapshot,
} from "./bonsaiSessionSurvival";
import { DEFAULT_CAPABILITIES, DEFAULT_DESKTOP_APP_LOG_LEVEL, DEFAULT_MODEL_POLICY_TIER } from "./settingsAndResponse";

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
      screenshotAttachmentPreset: "mid",
      desktopDebugNoteAutoSave: false,
      desktopAskVerboseLogging: false,
      desktopAppLogLevel: DEFAULT_DESKTOP_APP_LOG_LEVEL,
      attachProtonLogsWhenTroubleshooting: false,
      thinkingStatusTinyModelEnabled: false,
      presetChipFadeAnimationEnabled: true,
      presetChipAnimation: "fade",
      inputSanitizerUserDisabled: false,
      capabilities: { ...DEFAULT_CAPABILITIES },
      aiCharacterEnabled: true,
      aiCharacterRandom: false,
      aiCharacterPresetId: "coach",
      aiCharacterCustomText: "",
      aiCharacterAccentIntensity: "balanced",
      askMode: "speed",
      ollamaKeepAlive: "5m",
      showDeveloperTab: false,
      modelPolicyTier: DEFAULT_MODEL_POLICY_TIER,
      modelPolicyNonFossUnlocked: false,
      modelAllowHighVramFallbacks: false,
      ollamaLocalOnDeck: true,
      strategySpoilerMaskingEnabled: true,
      steamWebApiKey: "",
      bonsaiTokenStreamingEnabled: true,
      showOnscreenDebugHud: false,
      responseVerifyEnabled: false,
      responseVerifySecondPass: false,
      responseVerifyModel: "",
      namedOllamaHosts: [],
      voiceSttModel: "tiny.en",
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

  it("clear wipes pending restore", () => {
    captureBonsaiSessionForModal(minimalSnapshot());
    clearBonsaiSessionSurvival();
    expect(peekBonsaiSessionPendingRestore()).toBeNull();
    expect(consumeBonsaiSessionAfterRemount()).toBeNull();
  });
});
