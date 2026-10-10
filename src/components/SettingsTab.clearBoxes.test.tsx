/**
 * Title: The Settings Clear boxes open on the button that clears nothing
 *
 * Purpose: Steam opens a confirm box with the ring on its OK button. "Clear session cache?" and
 * "Clear all plugin data?" had the clearing as OK, so an A pressed by habit cleared (found in plan 79,
 * round three). OK now keeps everything, the clearing is the middle button, and Cancel and B change
 * nothing. Checked on the box each button really hands to Steam.
 *
 * Does not: open a real Steam box; the stub only records what the tab asks Steam to show.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let shown: React.ReactElement[] = [];
const close = vi.fn();

vi.mock("@decky/ui", async () => {
  const fake = await import("../test-harness/fakeDeckyUi");
  return {
    ...fake,
    showModal: (el: React.ReactElement) => {
      shown.push(el);
      return { Close: close, Update: () => undefined };
    },
  };
});

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";

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
    onCompleteDeckyModalClose: (fn) => fn(),
    onResetSession: () => {},
    onClearAllPluginData: () => {},
    ...overrides,
  };
}

type Box = Record<string, unknown>;
function openBox(label: string, overrides: Partial<SettingsTabProps>): Box {
  const { getByText } = render(<SettingsTab {...buildProps(overrides)} />);
  fireEvent.click(getByText(label));
  expect(shown).toHaveLength(1);
  return shown[0]!.props as Box;
}

beforeEach(() => {
  shown = [];
  close.mockClear();
});

describe.each([
  ["Clear cache...", "Clear", "onResetSession"],
  ["Clear all data...", "Clear all data", "onClearAllPluginData"],
] as const)("the %s box", (button, clearLabel, prop) => {
  it("opens on a button that clears nothing: OK, Cancel and B change nothing", () => {
    const clear = vi.fn();
    const box = openBox(button, { [prop]: clear });
    // Steam puts the ring on OK, so OK must be the keep-everything choice.
    expect(box.strOKButtonText).not.toBe(clearLabel);
    expect(box.strOKButtonText).toMatch(/^Keep /);
    (box.onOK as () => void)();
    (box.onCancel as () => void)();
    expect(clear).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("still clears, on its own labelled middle button", async () => {
    const clear = vi.fn();
    const box = openBox(button, { [prop]: clear });
    expect(box.strMiddleButtonText).toBe(clearLabel);
    (box.onMiddleButton as () => void)();
    await Promise.resolve();
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
