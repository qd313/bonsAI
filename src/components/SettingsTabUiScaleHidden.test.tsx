/**
 * Title: Settings tab — UI scale section only with the Developer tab
 * Purpose: 0.6.0 (plan 72) hides the UI scale section from players; it comes back when the
 *          Developer tab is turned on. With it hidden, the screenshot-quality row becomes the top
 *          row, so it must not keep an Up handler that aims at the missing Apply button — Steam's
 *          own Up (to the tab header) takes over, the same as from the UI scale toggle before.
 * Does not: Prove the ring on the device; the move handlers never reach the DOM through the
 *           test harness's Focusable stub, which is why the Up wiring is a tested builder.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsTab, screenshotQualityRowNav, type SettingsTabProps } from "./SettingsTab";

function buildProps(overrides: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "persist_all",
    setUnifiedInputPersistenceMode: () => {},
    voiceReplyMode: "off",
    setVoiceReplyMode: () => {},
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
    // The row below it is still there.
    expect(container.textContent).toContain("Screenshot quality");
  });

  it("is drawn when the Developer tab is on", () => {
    const { container } = render(<SettingsTab {...buildProps({ showDeveloperTab: true })} />);
    expect(container.querySelector(UI_SCALE_TOGGLE)).toBeTruthy();
  });
});

describe("screenshotQualityRowNav", () => {
  it("has no Up handler when the UI scale section is hidden", () => {
    expect(screenshotQualityRowNav(null)).toEqual({});
  });

  it("sends Up to the UI scale Apply button when the section is shown", () => {
    let called = 0;
    const nav = screenshotQualityRowNav(() => {
      called += 1;
      return true;
    }) as { onMoveUp?: () => boolean };
    expect(nav.onMoveUp?.()).toBe(true);
    expect(called).toBe(1);
  });
});
