/**
 * Title: Settings tab — one suggestion chip toggle
 * Purpose: Pin that the "Show one chip instead of two" switch renders off by default (two chips
 *          stays the shipped default, D43) and reflects an on setting, and that toggling it calls
 *          the setter the settings hook expects.
 * Used for: roadmap `[chips]` ★★★ — a setting for one or two preset chips.
 * Does not: Render the preset row itself — see MainTabPresetAnimatedChips.test.tsx for the row
 *           actually showing one chip with the whole column.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";

function buildProps(overrides: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "persist_all",
    setUnifiedInputPersistenceMode: () => {},
    voiceReplyMode: "off",
    setVoiceReplyMode: () => {},
    aiCharacterEnabled: false,
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
    ...overrides,
  };
}

/** ToggleField is a test-harness stub div; React sets `checked` as a DOM property, not attribute. */
function checkedOf(el: Element | null): unknown {
  return (el as unknown as { checked?: unknown } | null)?.checked;
}

describe("SettingsTab one-suggestion-chip toggle", () => {
  it("renders unchecked when the setting is off (shipped default: two chips)", () => {
    render(<SettingsTab {...buildProps({ presetSingleChip: false })} />);
    const toggle = document.querySelector('[label="Show one chip instead of two"]');
    expect(toggle).toBeTruthy();
    expect(checkedOf(toggle)).toBe(false);
  });

  it("renders checked when the setting is on", () => {
    render(<SettingsTab {...buildProps({ presetSingleChip: true })} />);
    const toggle = document.querySelector('[label="Show one chip instead of two"]');
    expect(checkedOf(toggle)).toBe(true);
  });
});
