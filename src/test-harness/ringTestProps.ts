/**
 * Title: Shared props and a ring reader for the focus-ring tests
 *
 * Purpose: The two ring tests (SettingsDeveloperWrappedRing, SettingsDeveloperLeftoverRing) both
 *          render the real Settings and Developer tabs and read back a computed outline. This holds
 *          the props those tabs need and the one function that puts Steam's focus class on a single
 *          element, so the two tests do not each carry a copy.
 * Used for: The focus-ring tests under src/components, and the folded tabs' D-pad tests (the Ollama tab's walk
 *           and its lost-focus test, plan 97).
 * Does not: Render anything or assert anything itself.
 */
import { STREAM_SCRAMBLE_OFF } from "../features/answer/stream/streamScrambleContext";
import type { DeveloperTabProps } from "../features/developer/DeveloperTab";
import type { SettingsTabProps } from "../features/settings/SettingsTab";
import type { OllamaTabProps } from "../features/ai-connection/OllamaTab";

export function settingsProps(): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "persist_all",
    setUnifiedInputPersistenceMode: () => {},
    chatTextSizeSetting: { value: "normal", set: () => {} },
    spoilerTierSetting: { value: "default", set: () => {} },
    aiCharacterEnabled: true,
    setAiCharacterEnabled: () => {},
    aiCharacterRandom: false,
    aiCharacterPresetId: "",
    aiCharacterCustomText: "",
    aiCharacterAccentIntensity: "balanced",
    setAiCharacterAccentIntensity: () => {},
    showDeveloperTab: false,
    setShowDeveloperTab: () => {},
    strategySpoilerMaskingEnabled: true,
    setStrategySpoilerMaskingEnabled: () => {},
    presetSingleChip: false,
    setPresetSingleChip: () => {},
    voiceSttModel: "tiny.en",
    setVoiceSttModel: () => {},
    microphoneAccessEnabled: false,
    onOpenCharacterPicker: () => {},
    onBeforeDeckyModal: () => {},
    onCompleteDeckyModalClose: (close) => close(),
    onResetSession: () => {},
    onClearAllPluginData: () => {},
  };
}

export function developerProps(): DeveloperTabProps {
  return {
    capturedErrors: [],
    onClearErrors: () => {},
    desktopDebugNoteAutoSave: false,
    setDesktopDebugNoteAutoSave: () => {},
    desktopAskVerboseLogging: false,
    setDesktopAskVerboseLogging: () => {},
    desktopAppLogLevel: "default",
    setDesktopAppLogLevel: () => {},
    filesystemWrite: false,
    presetChipAnimation: "fade",
    setPresetChipAnimation: () => {},
    showOnscreenDebugHud: false,
    setShowOnscreenDebugHud: () => {},
    devForceSessionRagChips: false,
    setDevForceSessionRagChips: () => {},
    devPreloadAskModel: false,
    setDevPreloadAskModel: () => {},
    devFrozenTestChips: [],
    setDevFrozenTestChips: () => {},
    ragHybridRetrievalEnabled: false,
    setRagHybridRetrievalEnabled: () => {},
    tabResumeMode: "resume",
    setTabResumeMode: () => {},
    streamScramble: STREAM_SCRAMBLE_OFF,
    onStreamScrambleChange: () => {},
  };
}

/** The Ollama tab's props for the D-pad tests: AI on this Deck, the knowledge base on, nothing running. */
export function ollamaProps(): OllamaTabProps {
  return {
    ollamaIp: "",
    effectiveOllamaPcIp: "127.0.0.1",
    onOllamaIpChange: (() => {}),
    onPersistOllamaIp: (() => {}),
    ollamaLocalOnDeck: true,
    setOllamaLocalOnDeck: (() => {}),
    ollamaLocalAutostart: true,
    setOllamaLocalAutostart: (() => {}),
    namedOllamaHosts: [],
    setNamedOllamaHosts: (() => {}),
    onBeforeDeckyModal: (() => {}),
    onCompleteDeckyModalClose: (close) => close(),
    onOpenOllamaModelsHub: (() => {}),
    latencyWarningSeconds: 60,
    requestTimeoutSeconds: 180,
    latencyTimeoutsCustomEnabled: false,
    setLatencyTimeoutsCustomEnabled: (() => {}),
    setLatencyWarningSeconds: (() => {}),
    setRequestTimeoutSeconds: (() => {}),
    ollamaKeepAlive: "5m",
    setOllamaKeepAlive: (() => {}),
    modelPolicyTier: "open_source_only",
    useLocalKnowledgeBase: true,
    setUseLocalKnowledgeBase: (() => {}),
    ragCorpusVersion: "",
    replyVerbosity: "balanced",
    setReplyVerbosity: (() => {}),
    askThinkEffort: "off",
    setAskThinkEffort: (() => {}),
  };
}

/** Put Steam's focus class on `only` (and nowhere else in `all`), read each element's outline. */
export function outlines(all: HTMLElement[], only: HTMLElement | null): string[] {
  for (const el of all) el.classList.toggle("gpfocus", el === only);
  const out = all.map((el) => getComputedStyle(el).outline);
  for (const el of all) el.classList.remove("gpfocus");
  return out;
}
