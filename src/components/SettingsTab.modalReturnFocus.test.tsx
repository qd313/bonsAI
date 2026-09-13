/**
 * Title: Settings tab modal return-focus wiring
 * Purpose: Pin that Clear cache... and Clear all data... arm and register themselves with the modal
 *          return-focus registry, the same way the character-picker opener already does.
 * Used for: plan 32 bug 4 -- the ring landing on a hidden Steam tab button after either confirmation
 *           closed (runs/CLEAR-CACHE-01-b-after-modal-back-to-main.json,
 *           runs/CLEAR-CACHE-01-c-close-panel-for-remount.json).
 * Solves: Neither button ever called `rememberModalReturnFocus`, so Steam picked the return focus
 *         itself on close. This does not prove Steam's ring moves (jsdom has no gamepad tree); it
 *         proves the wiring the fix depends on is in place.
 * Does not: Exercise the ConfirmModal body itself -- the test harness's `showModal` stub discards its
 *           argument rather than rendering it (src/test-harness/fakeDeckyUi.tsx).
 */
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

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

describe("SettingsTab modal return focus", () => {
  beforeEach(() => {
    resetModalReturnFocusRegistry();
  });

  it("remembers settings-clear-cache when Clear cache... is pressed", () => {
    const { getByText } = render(<SettingsTab {...buildProps()} />);
    fireEvent.click(getByText("Clear cache..."));
    expect(peekModalReturnFocus()).toBe("settings-clear-cache");
  });

  it("remembers settings-clear-all-data when Clear all data... is pressed", () => {
    const { getByText } = render(<SettingsTab {...buildProps()} />);
    fireEvent.click(getByText("Clear all data..."));
    expect(peekModalReturnFocus()).toBe("settings-clear-all-data");
  });

  it("registers Clear cache... so the registry can focus it back", () => {
    const { getByText } = render(<SettingsTab {...buildProps()} />);
    const button = getByText("Clear cache...");
    const focus = vi.spyOn(button, "focus");

    fireEvent.click(button);
    restoreModalReturnFocus();

    expect(focus).toHaveBeenCalled();
  });

  it("registers Clear all data... so the registry can focus it back", () => {
    const { getByText } = render(<SettingsTab {...buildProps()} />);
    const button = getByText("Clear all data...");
    const focus = vi.spyOn(button, "focus");

    fireEvent.click(button);
    restoreModalReturnFocus();

    expect(focus).toHaveBeenCalled();
  });

  it("does not cross-wire the two buttons", () => {
    const { getByText } = render(<SettingsTab {...buildProps()} />);
    const cacheButton = getByText("Clear cache...");
    const clearAllButton = getByText("Clear all data...");
    const cacheFocus = vi.spyOn(cacheButton, "focus");
    const clearAllFocus = vi.spyOn(clearAllButton, "focus");

    fireEvent.click(clearAllButton);
    restoreModalReturnFocus();

    expect(clearAllFocus).toHaveBeenCalled();
    expect(cacheFocus).not.toHaveBeenCalled();
  });
});
