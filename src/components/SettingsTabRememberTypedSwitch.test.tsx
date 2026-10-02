/**
 * Title: Settings tab "Remember what I typed" is one on/off switch
 * Purpose: Pin what the Settings tab shows for this setting: one switch, no All / Search / None
 *          buttons; on for a saved "All", off for "None" and for an older saved "Search"; and
 *          that flipping it hands back only `persist_all` or `no_persist`.
 * Used for: roadmap Features -- "Remember what I typed" becomes one on/off switch (plan 79).
 * Does not: Prove the saved value survives a restart -- tests/test_settings_service.py and the
 *           hostile-input contract cover that. Does not walk the D-pad; the switch is a plain
 *           toggle row like its neighbours, so it adds no focus wiring of its own.
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";

function buildProps(overrides: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "no_persist",
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

const SWITCH = '[label="Remember what I typed"]';

/** ToggleField is a test-harness stub div; React sets `checked` as a DOM property, not attribute. */
function checkedOf(el: Element | null): unknown {
  return (el as unknown as { checked?: unknown } | null)?.checked;
}

/** The stub keeps the real `onChange` on the element's React props; call it like Steam would. */
function flip(el: Element, next: boolean): void {
  const key = Object.keys(el).find((k) => k.startsWith("__reactProps"));
  const props = (el as unknown as Record<string, { onChange?: (v: boolean) => void }>)[key ?? ""];
  props?.onChange?.(next);
}

describe("Settings tab: Remember what I typed is one switch", () => {
  it("shows one switch and none of the old All / Search / None buttons", () => {
    render(<SettingsTab {...buildProps({ unifiedInputPersistenceMode: "persist_all" })} />);
    expect(document.querySelectorAll(SWITCH)).toHaveLength(1);
    const buttonLabels = Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim());
    expect(buttonLabels).not.toContain("All");
    expect(buttonLabels).not.toContain("Search");
    expect(buttonLabels).not.toContain("None");
  });

  it("is on for a saved All", () => {
    render(<SettingsTab {...buildProps({ unifiedInputPersistenceMode: "persist_all" })} />);
    expect(checkedOf(document.querySelector(SWITCH))).toBe(true);
  });

  it("is off for a saved None", () => {
    render(<SettingsTab {...buildProps({ unifiedInputPersistenceMode: "no_persist" })} />);
    expect(checkedOf(document.querySelector(SWITCH))).toBe(false);
  });

  it("is off for an older saved Search", () => {
    render(<SettingsTab {...buildProps({ unifiedInputPersistenceMode: "persist_search_only" })} />);
    expect(checkedOf(document.querySelector(SWITCH))).toBe(false);
  });

  it("saves persist_all when turned on and no_persist when turned off", () => {
    const setMode = vi.fn();
    render(<SettingsTab {...buildProps({ setUnifiedInputPersistenceMode: setMode })} />);
    const el = document.querySelector(SWITCH) as Element;
    flip(el, true);
    flip(el, false);
    expect(setMode.mock.calls).toEqual([["persist_all"], ["no_persist"]]);
  });
});
