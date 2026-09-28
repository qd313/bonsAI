/**
 * Title: Settings tab's Clear cache... / Clear all data... row: return focus and placement
 * Purpose: Pin that Clear cache... and Clear all data... arm and register themselves with the modal
 *          return-focus registry, the same way the character-picker opener already does; and that
 *          their row is inset like every other Settings button (plan 72 free play).
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

/*
 * Roadmap "Settings' "Clear cache..." sits 16 pixels left of the other buttons" (plan 72 free play,
 * docs/test-evidence/plan72-Z-FREEPLAY.json finding 14, runs/plan72-Z-settings-sweep.json): on the
 * Deck Clear cache... started at x 48, the column's own left edge, while every other Settings button
 * started at x 64 and ended at 332. The others sit inside one of Steam's panel sections, which pads
 * its rows 16 on each side (measured 15.99 by scripts/probe_deck_ask_row_width.py); this row sits
 * outside any section, so it had no inset at all. jsdom cannot measure where it lands, so this pins
 * what the code sets: the same inset, on both sides, inside the row's full width.
 */
describe("SettingsTab Clear cache... row lines up with the other buttons", () => {
  it("insets the row 16 on each side, the same as Steam's panel sections inset theirs", () => {
    const { getByText } = render(<SettingsTab {...buildProps()} />);
    const row = getByText("Clear cache...").closest(".bonsai-settings-cache-row") as HTMLElement | null;
    expect(row).not.toBeNull();
    expect(row!.style.paddingLeft).toBe("16px");
    expect(row!.style.paddingRight).toBe("16px");
    // Inside the width, not added to it: the two buttons share what is left, as before.
    expect(row!.style.boxSizing).toBe("border-box");
    expect(row!.style.width).toBe("100%");
  });

  it("keeps both buttons in that one row, Clear cache... first", () => {
    const { getByText } = render(<SettingsTab {...buildProps()} />);
    const row = getByText("Clear cache...").closest(".bonsai-settings-cache-row")!;
    expect(Array.from(row.querySelectorAll("button")).map((b) => b.textContent)).toEqual([
      "Clear cache...",
      "Clear all data...",
    ]);
  });
});
