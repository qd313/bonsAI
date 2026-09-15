/**
 * Title: What draws the Settings tab
 *
 * Purpose: Runs while a person has the Settings tab open — screenshot
 * behavior, the AI's on-screen character, voice replies, UI scale, and
 * more. It builds that screen from the current settings it is handed.
 *
 * Used for: The tab bar's always-present Settings tab.
 *
 * Solves: Keeps this large list of values and its rebuild list out of the
 * main plugin screen's own code.
 *
 * Does not: Own any setting or save it — those live elsewhere and are
 * only passed through here to display and change.
 */
import React, { useMemo } from "react";

import { SettingsTab } from "../../../components/SettingsTab";

export type UseSettingsTabPayloadArgs = React.ComponentProps<typeof SettingsTab>;

/**
 * In: around thirty separate values and their setters — every setting
 * this tab shows or can change — bundled into one argument object.
 * Out: the finished Settings tab element, rebuilt only when one of the
 * listed values changes.
 * Can go wrong: the rebuild list at the bottom of this function is written
 * by hand; a value added above that is not also added there will not fail
 * any check, it will just quietly stop updating on screen.
 */
export function useSettingsTabPayload({
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
  microphoneAccessEnabled,
  uiScaleAutoEnabled,
  uiScaleManualProfile,
  appliedUiScaleProfileId,
  onApplyUiScale,
  onOpenCharacterPicker,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onResetSession,
  onClearAllPluginData,
  onJumpToPermission,
  presetSingleChip,
  setPresetSingleChip,
}: UseSettingsTabPayloadArgs): React.ReactElement {
  // Dependency list preserved verbatim from index.tsx: the settings setters are stable
  // identities from usePluginSettings and were deliberately left out.
  return useMemo(
    () => (
      <SettingsTab
        screenshotAttachmentPreset={screenshotAttachmentPreset}
        setScreenshotAttachmentPreset={setScreenshotAttachmentPreset}
        unifiedInputPersistenceMode={unifiedInputPersistenceMode}
        setUnifiedInputPersistenceMode={setUnifiedInputPersistenceMode}
        voiceReplyMode={voiceReplyMode}
        setVoiceReplyMode={setVoiceReplyMode}
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
        microphoneAccessEnabled={microphoneAccessEnabled}
        uiScaleAutoEnabled={uiScaleAutoEnabled}
        uiScaleManualProfile={uiScaleManualProfile}
        appliedUiScaleProfileId={appliedUiScaleProfileId}
        onApplyUiScale={onApplyUiScale}
        onOpenCharacterPicker={onOpenCharacterPicker}
        onBeforeDeckyModal={onBeforeDeckyModal}
        onCompleteDeckyModalClose={onCompleteDeckyModalClose}
        onResetSession={onResetSession}
        onClearAllPluginData={onClearAllPluginData}
        onJumpToPermission={onJumpToPermission}
        presetSingleChip={presetSingleChip}
        setPresetSingleChip={setPresetSingleChip}
      />
    ),
    [
      screenshotAttachmentPreset,
      unifiedInputPersistenceMode,
      voiceReplyMode,
      aiCharacterEnabled,
      aiCharacterRandom,
      aiCharacterPresetId,
      aiCharacterCustomText,
      aiCharacterAccentIntensity,
      showDeveloperTab,
      strategySpoilerMaskingEnabled,
      voiceSttModel,
      uiScaleAutoEnabled,
      uiScaleManualProfile,
      appliedUiScaleProfileId,
      onApplyUiScale,
      microphoneAccessEnabled,
      onBeforeDeckyModal,
      onCompleteDeckyModalClose,
      onOpenCharacterPicker,
      onResetSession,
      onClearAllPluginData,
      onJumpToPermission,
      presetSingleChip,
    ]
  );
}
