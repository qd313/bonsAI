/**
 * Title: Settings tab
 *
 * Purpose: The Settings tab — screen size, whether the Ask bar remembers
 * what you typed, story spoiler masking, how many suggestion chips show,
 * voice input settings, the AI's voice & personality
 * picker, whether the Developer tab is visible, and two buttons for
 * clearing cached data or wiping everything back to a fresh install.
 * Nothing about talking to Ollama lives here — that is the whole Ollama tab.
 *
 * Folded (plan 91 § 2b, plan 92 T1): each of the ten sections is one line (FoldedSection) showing a summary
 * of its values; A opens or closes it, several can be open at once. Inside, one line per setting; a row's
 * longer text shows in the help strip at the bottom of the panel while the ring is on it; the floating
 * Open all button opens or closes every section. UI scale is a section only while the Developer tab is on.
 *
 * Used for: The Settings tab in index.tsx.
 *
 * Solves: One tab for every general plugin setting that is not about
 * Ollama itself, each section wired into the next so the D-pad has a
 * predictable path all the way down.
 *
 * Does not: Host anything about the Ollama connection, models, or the
 * knowledge base — see OllamaTab for that.
 *
 * How it works:
 *
 *     ┌─ Settings tab ─────────────────────────────────────┐
 *     │ UI scale               <- Developer tab on only; its  │
 *     │                           own file, see               │
 *     │                           SettingsTabUiScaleSection   │
 *     │ Screenshot quality     <- Save memory / Balanced /    │
 *     │                           Best detail                 │
 *     │ Text size              <- Small / Normal / Large,     │
 *     │                           its own file, see           │
 *     │                           SettingsTabChatTextSizeRow  │
 *     │ Remember what I typed  <- one on/off switch           │
 *     │ Story spoilers         <- hide-until-tap toggle       │
 *     │ Suggestion chips       <- one chip vs two toggle      │
 *     │ Voice input            <- its own file, see           │
 *     │                           VoiceInputSettingsSection   │
 *     │ AI voice & personality <- its own file, see           │
 *     │                           SettingsTabCharacterSection │
 *     │ Data                   <- its own file, see           │
 *     │                           SettingsTabDataSection      │
 *     └───────────────────────────────────────────────────────┘
 *
 * 1. The sections and their words live in features/folded-tabs/settingsTabFolds.ts; the chain the D-pad
 *    follows between them in useSettingsTabFocus.ts. This file wraps each section's rows in a
 *    FoldedSection inside one FoldedColumn and hands each section's first control Up (to its line) and its
 *    last control Down (to the next line).
 * 2. Most rows here are a plain switch or a row of buttons built from a fixed option list, each one
 *    reading and writing a setting directly with no local state of its own.
 * 3. Clear cache and Clear all data both open a Steam ConfirmModal before doing anything (see
 *    SettingsTabDataSection); the accent menu's open state survives a remount of the tab (see
 *    SettingsTabCharacterSection).
 */
import React from "react";
import { PanelSection, PanelSectionRow } from "@decky/ui";
import {
  SCREENSHOT_ATTACHMENT_PRESET_OPTIONS,
  type ScreenshotAttachmentPreset,
  type UnifiedInputPersistenceMode,
} from "../data/bonsaiSettingsSchema";
import type { AiCharacterAccentIntensityId } from "../data/aiCharacterAccentIntensity";
import { VoiceInputSettingsSection } from "./VoiceInputSettingsSection";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { SettingsTabUiScaleSection } from "./SettingsTabUiScaleSection";
import { SettingsTabChatTextSizeRow, type ChatTextSizeSetting } from "./SettingsTabChatTextSizeRow";
import { SettingsTabChoiceRow } from "./SettingsTabChoiceRow";
import { SettingsTabCharacterSection } from "./SettingsTabCharacterSection";
import { SettingsTabDataSection } from "./SettingsTabDataSection";
import { useSettingsTabFocus } from "./useSettingsTabFocus";
import type { UiScaleProfileId } from "../data/uiScaleProfile";
import type { VoiceSttModelId } from "../data/bonsaiSettingsSchema";
import { chainIds, FoldedColumn, FoldedSection, foldLineBelow, takeFoldLine } from "../features/folded-tabs/FoldedSection";
import { FoldAllButton } from "../features/folded-tabs/FoldAllButton";
import { TabHelpStrip } from "../features/folded-tabs/TabHelpStrip";
import { DenseSwitchRow } from "../features/folded-tabs/DenseRow";
import {
  SCREENSHOT_PRESET_LABEL,
  SETTINGS_FOLD_TAB,
  SETTINGS_ROW_HELP,
  SETTINGS_SECTIONS,
  settingsSectionSummaries,
  type SettingsSectionId,
} from "../features/folded-tabs/settingsTabFolds";

export type SettingsTabProps = {
  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  setScreenshotAttachmentPreset: (v: ScreenshotAttachmentPreset) => void;

  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  setUnifiedInputPersistenceMode: (v: UnifiedInputPersistenceMode) => void;

  /** How big the words are, everywhere in the plugin: small, normal or large (plan 87 call 3, plan 89). */
  chatTextSizeSetting: ChatTextSizeSetting;

  aiCharacterEnabled: boolean;
  setAiCharacterEnabled: (v: boolean) => void;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  setAiCharacterAccentIntensity: (v: AiCharacterAccentIntensityId) => void;

  showDeveloperTab: boolean;
  setShowDeveloperTab: (v: boolean) => void;

  strategySpoilerMaskingEnabled: boolean;
  setStrategySpoilerMaskingEnabled: (v: boolean) => void;

  /** One suggestion chip with the whole column instead of two side by side. Off by default (D43). */
  presetSingleChip: boolean;
  setPresetSingleChip: (v: boolean) => void;

  voiceSttModel: VoiceSttModelId;
  setVoiceSttModel: (v: VoiceSttModelId) => void;
  microphoneAccessEnabled: boolean;
  onJumpToPermission?: (capability: BonsaiCapabilityKey) => void;

  uiScaleAutoEnabled: boolean;
  uiScaleManualProfile: UiScaleProfileId;
  appliedUiScaleProfileId: UiScaleProfileId;
  onApplyUiScale: (autoEnabled: boolean, manualProfile: UiScaleProfileId) => void | Promise<void>;

  onOpenCharacterPicker: () => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onResetSession: () => void;
  onClearAllPluginData: () => void | Promise<void>;
};

/**
 * The whole tab. See "How it works" above for the layout and flow.
 *
 * In: every setting this tab shows plus a setter for each one, the AI
 * character's current selection (to preview it on the picker button), and
 * callbacks to open the character picker, clear the session, wipe all
 * plugin data, and manage a nested Decky modal's focus handoff.
 * Out: the folded sections in the order drawn above.
 *
 * What can go wrong: nothing here talks to the backend directly except the
 * two Clear buttons — everything else is a settings read/write handed
 * straight to the caller.
 */
export const SettingsTab: React.FC<SettingsTabProps> = ({
  screenshotAttachmentPreset,
  setScreenshotAttachmentPreset,
  unifiedInputPersistenceMode,
  setUnifiedInputPersistenceMode,
  chatTextSizeSetting,
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
  presetSingleChip,
  setPresetSingleChip,
  voiceSttModel,
  setVoiceSttModel,
  microphoneAccessEnabled,
  onJumpToPermission,
  uiScaleAutoEnabled,
  uiScaleManualProfile,
  appliedUiScaleProfileId,
  onApplyUiScale,
  onOpenCharacterPicker,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onResetSession,
  onClearAllPluginData,
}) => {
  const { chain, bodyRef } = useSettingsTabFocus(showDeveloperTab);
  const summaries = settingsSectionSummaries({
    uiScaleAutoEnabled,
    screenshotAttachmentPreset,
    chatTextSize: chatTextSizeSetting.value,
    rememberTyped: unifiedInputPersistenceMode === "persist_all",
    spoilerMasking: strategySpoilerMaskingEnabled,
    singleChip: presetSingleChip,
    voiceSttModel,
    aiCharacterEnabled,
    showDeveloperTab,
  });
  /** Up from a section's first control goes to its line; Down from its last goes to the next line. */
  const up = (id: SettingsSectionId) => () => takeFoldLine(SETTINGS_FOLD_TAB, id);
  const down = (id: SettingsSectionId) => () => foldLineBelow(SETTINGS_FOLD_TAB, chain, id);
  const both = (id: SettingsSectionId) => ({ onMoveUp: up(id), onMoveDown: down(id) });
  const fold = (id: SettingsSectionId, children: React.ReactNode) => (
    <FoldedSection
      key={id}
      tab={SETTINGS_FOLD_TAB}
      chain={chain}
      id={id}
      title={SETTINGS_SECTIONS.find((x) => x.id === id)?.title ?? id}
      summary={summaries[id]}
    >
      <div ref={bodyRef(id)}>{children}</div>
    </FoldedSection>
  );

  return (
    <div
      className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack bonsai-folded-tab"
      data-bonsai-tab-panel="settings"
    >
      <FoldedColumn>
        {/* 0.6.0 (plan 72): Developer tab only, so no player lands on it. The size itself is held at
            the default on load while the Developer tab is off (normalizeSettings). */}
        {showDeveloperTab
          ? fold(
              "uiscale",
              <SettingsTabUiScaleSection
                uiScaleAutoEnabled={uiScaleAutoEnabled}
                uiScaleManualProfile={uiScaleManualProfile}
                appliedProfileId={appliedUiScaleProfileId}
                onApply={onApplyUiScale}
                onMoveUpFromFirst={up("uiscale")}
                onMoveDownFromApply={down("uiscale")}
              />,
            )
          : null}

        {fold(
          "screenshot",
          <PanelSection>
            <SettingsTabChoiceRow
              label="Screenshot quality"
              help={SETTINGS_ROW_HELP.screenshot}
              options={SCREENSHOT_ATTACHMENT_PRESET_OPTIONS.map((option) => ({
                id: option,
                label: SCREENSHOT_PRESET_LABEL[option],
                ariaLabel: `Set screenshot quality to ${SCREENSHOT_PRESET_LABEL[option]}`,
              }))}
              value={screenshotAttachmentPreset}
              onPick={setScreenshotAttachmentPreset}
              nav={both("screenshot")}
            />
          </PanelSection>,
        )}

        {fold(
          "textsize",
          <PanelSection>
            <SettingsTabChatTextSizeRow setting={chatTextSizeSetting} nav={both("textsize")} />
          </PanelSection>,
        )}

        {fold(
          "remember",
          <PanelSection>
            <PanelSectionRow>
              <DenseSwitchRow
                label="Remember what I typed"
                help={SETTINGS_ROW_HELP.remember}
                checked={unifiedInputPersistenceMode === "persist_all"}
                onChange={(checked) => setUnifiedInputPersistenceMode(checked ? "persist_all" : "no_persist")}
                nav={both("remember")}
              />
            </PanelSectionRow>
          </PanelSection>,
        )}

        {fold(
          "spoilers",
          <PanelSection>
            <PanelSectionRow>
              <DenseSwitchRow
                label="Hide spoilers until I tap"
                help={SETTINGS_ROW_HELP.spoilers}
                checked={strategySpoilerMaskingEnabled}
                onChange={(checked) => setStrategySpoilerMaskingEnabled(checked)}
                nav={both("spoilers")}
              />
            </PanelSectionRow>
          </PanelSection>,
        )}

        {fold(
          "chips",
          <PanelSection>
            <PanelSectionRow>
              <DenseSwitchRow
                label="Show one chip instead of two"
                help={SETTINGS_ROW_HELP.chips}
                checked={presetSingleChip}
                onChange={(checked) => setPresetSingleChip(checked)}
                nav={both("chips")}
              />
            </PanelSectionRow>
          </PanelSection>,
        )}

        {fold(
          "voiceinput",
          <VoiceInputSettingsSection
            voiceSttModel={voiceSttModel}
            setVoiceSttModel={setVoiceSttModel}
            microphoneAccessEnabled={microphoneAccessEnabled}
            onJumpToPermission={onJumpToPermission}
            onMoveUpFromFirst={up("voiceinput")}
            onMoveDownFromLast={down("voiceinput")}
          />,
        )}

        {fold(
          "character",
          <SettingsTabCharacterSection
            aiCharacterEnabled={aiCharacterEnabled}
            setAiCharacterEnabled={setAiCharacterEnabled}
            aiCharacterRandom={aiCharacterRandom}
            aiCharacterPresetId={aiCharacterPresetId}
            aiCharacterCustomText={aiCharacterCustomText}
            aiCharacterAccentIntensity={aiCharacterAccentIntensity}
            setAiCharacterAccentIntensity={setAiCharacterAccentIntensity}
            onOpenCharacterPicker={onOpenCharacterPicker}
            onMoveUpFromFirst={up("character")}
            onMoveDownFromLast={down("character")}
          />,
        )}

        {fold(
          "data",
          <SettingsTabDataSection
            showDeveloperTab={showDeveloperTab}
            setShowDeveloperTab={setShowDeveloperTab}
            onBeforeDeckyModal={onBeforeDeckyModal}
            onCompleteDeckyModalClose={onCompleteDeckyModalClose}
            onResetSession={onResetSession}
            onClearAllPluginData={onClearAllPluginData}
            onMoveUpFromFirst={up("data")}
            onMoveDownFromLast={down("data")}
          />,
        )}
      </FoldedColumn>

      {/* Room under the last line, so the last rows can scroll up clear of the strip and the button. */}
      <div className="bonsai-fold-tail" aria-hidden="true" />
      <TabHelpStrip tab={SETTINGS_FOLD_TAB}>
        <FoldAllButton tab={SETTINGS_FOLD_TAB} sections={chainIds(chain)} />
      </TabHelpStrip>
    </div>
  );
};
