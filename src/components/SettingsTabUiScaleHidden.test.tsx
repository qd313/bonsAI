/**
 * Title: Settings tab — UI scale section only with the Developer tab
 * Purpose: 0.6.0 (plan 72) hides the UI scale section from players; it comes back when the
 *          Developer tab is turned on. Folded (plan 92 T1), Screenshot quality's first control always
 *          hands Up to its own section line, so there is no hop to the missing Apply button left to guard
 *          (the old `screenshotQualityRowNav` is gone); the first section line's Up is the tab bar's.
 * Does not: Prove the ring on the device.
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";
import { openAllSettingsSections } from "../test-harness/settingsFoldOpen";

/* The tab folds (plan 91 § 2b): these checks are about the rows, so every section is open. */
beforeEach(() => openAllSettingsSections());

function buildProps(overrides: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "persist_all",
    setUnifiedInputPersistenceMode: () => {},
    chatTextSizeSetting: { value: "normal", set: () => {} },
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

const UI_SCALE_TOGGLE = '[label="Adjust UI automatically"]';

describe("SettingsTab UI scale section", () => {
  it("is not drawn for a player without the Developer tab", () => {
    const { container } = render(<SettingsTab {...buildProps({ showDeveloperTab: false })} />);
    expect(container.querySelector(UI_SCALE_TOGGLE)).toBeNull();
    expect(container.textContent).not.toContain("UI scale");
    // The row below it is still there (its choice buttons, not the section title, which the test
    // harness does not draw).
    expect(container.querySelector('[aria-label^="Set screenshot quality to"]')).toBeTruthy();
  });

  it("is drawn when the Developer tab is on", () => {
    const { container } = render(<SettingsTab {...buildProps({ showDeveloperTab: true })} />);
    expect(container.querySelector(UI_SCALE_TOGGLE)).toBeTruthy();
  });
});
