/**
 * Title: Settings tab payload
 * Purpose: Build the memoized Settings tab element for the shell's tab list.
 * Used for: index.tsx — the always-present "Settings" tab row.
 * Solves: Keeps a 22-prop element and its memo dependency list out of the composition root.
 * Does not: Own settings state or save them — usePluginSettings does, through the caller.
 */
import React, { useMemo } from "react";

import { SettingsTab } from "../../../components/SettingsTab";

export type UseSettingsTabPayloadArgs = React.ComponentProps<typeof SettingsTab>;

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
