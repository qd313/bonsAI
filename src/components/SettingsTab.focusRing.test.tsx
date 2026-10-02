/**
 * Title: Settings tab buttons show a ring when the D-pad is on them
 * Purpose: Pin the Settings half of roadmap "The highlight goes invisible on some tabs" (Deck
 *          2026-10-02, plan79-P79-M2-SETTINGS-DEV.json: no ring on the character picker button or
 *          Clear cache). Steam shows focus on its own buttons by changing their fill; these buttons
 *          set their fill inline, which always wins, so no ring appeared.
 * Used for: Screenshot quality and Voice replies choices (selected and not), the character picker
 *           button, the Accent intensity button, Clear cache and Clear all data.
 * Does not: See pixels (jsdom has no paint engine). It runs the CSS cascade: the real tab inside
 *           `.bonsai-scope` with the plugin's real stylesheet, Steam's focus class put on each
 *           button, and the computed outline read back. Clipping by a box around it is a Deck check.
 */
import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";

function props(overrides: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "persist_all",
    setUnifiedInputPersistenceMode: () => {},
    voiceReplyMode: "off",
    setVoiceReplyMode: () => {},
    aiCharacterEnabled: true,
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


function outlineWhen(el: HTMLElement, focused: boolean): string {
  el.classList.toggle("gpfocus", focused);
  const outline = getComputedStyle(el).outline;
  el.classList.remove("gpfocus");
  return outline;
}

describe("Settings tab: a focused button always shows a ring", () => {
  let sheet: HTMLStyleElement;
  beforeAll(() => {
    sheet = document.createElement("style");
    sheet.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(sheet);
  });
  afterAll(() => sheet.remove());

  function renderTab() {
    return render(
      <div className="bonsai-scope">
        <SettingsTab {...props()} />
      </div>,
    );
  }

  it("every choice, the picker, accent and Clear buttons draw a solid outline while focused", () => {
    const { container, getAllByLabelText, getByText } = renderTab();
    const buttons: [string, HTMLElement][] = [
      ...getAllByLabelText(/^Set screenshot quality to /).map((b): [string, HTMLElement] => ["screenshot " + b.textContent, b]),
      ...getAllByLabelText(/^(Off|When I asked by voice|Always): /).map((b): [string, HTMLElement] => ["voice " + b.textContent, b]),
      ["character picker", container.querySelector("button.bonsai-ai-character-picker-open") as HTMLElement],
      ["accent", container.querySelector("button.bonsai-accent-intensity-trigger") as HTMLElement],
      ["clear cache", getByText("Clear cache...").closest("button") as HTMLElement],
      ["clear all data", getByText("Clear all data...").closest("button") as HTMLElement],
    ];
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    for (const [name, el] of buttons) {
      expect(el, name).toBeTruthy();
      expect(outlineWhen(el, true), name).toMatch(/solid/);
      expect(outlineWhen(el, false), name).toBe("");
    }
  });
});
