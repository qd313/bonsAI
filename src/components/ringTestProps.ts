/**
 * Title: Shared props and a ring reader for the focus-ring tests
 *
 * Purpose: The two ring tests (SettingsDeveloperWrappedRing, SettingsDeveloperLeftoverRing) both
 *          render the real Settings and Developer tabs and read back a computed outline. This holds
 *          the props those tabs need and the one function that puts Steam's focus class on a single
 *          element, so the two tests do not each carry a copy.
 * Used for: Only the focus-ring tests under src/components.
 * Does not: Render anything or assert anything itself.
 */
import { STREAM_SCRAMBLE_OFF } from "../features/stream-scramble/streamScrambleContext";
import type { DeveloperTabProps } from "./DeveloperTab";
import type { SettingsTabProps } from "./SettingsTab";

export function settingsProps(): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "persist_all",
    setUnifiedInputPersistenceMode: () => {},
    voiceReplyMode: "off",
    setVoiceReplyMode: () => {},
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
    uiScaleAutoEnabled: true,
    uiScaleManualProfile: "handheld",
    appliedUiScaleProfileId: "handheld",
    onApplyUiScale: () => {},
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
    steamWebApiKey: "",
    setSteamWebApiKey: () => {},
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

/** Put Steam's focus class on `only` (and nowhere else in `all`), read each element's outline. */
export function outlines(all: HTMLElement[], only: HTMLElement | null): string[] {
  for (const el of all) el.classList.toggle("gpfocus", el === only);
  const out = all.map((el) => getComputedStyle(el).outline);
  for (const el of all) el.classList.remove("gpfocus");
  return out;
}
