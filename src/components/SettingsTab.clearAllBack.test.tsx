/**
 * Title: B on the "Clear all plugin data?" box leaves the panel on Settings
 *
 * Purpose: On the Deck, closing the "Clear all plugin data?" box with B (or Cancel, or "Keep my data")
 * put the panel on the Main tab with the ring on "Main tab". The "Clear cache..." button tells the
 * plugin shell which tab to come back to before it opens its box; "Clear all data..." did not, so the
 * shell came back to its default, Main. Checked here with the real shell hook and the real Settings
 * tab, at the level the Deck check looks at: after the box closes, which tab is showing and which
 * button has the ring.
 *
 * Does not: open a real Steam box (the stub records the box and the test presses its buttons), or
 * model Steam's own tab strip.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { useBonsaiPluginShell } from "../hooks/useBonsaiPluginShell";
import { resetModalReturnFocusRegistry } from "../features/plugin-shell/modalReturnFocusRegistry";
import type { BonsaiSessionSurvivalSnapshot } from "../utils/bonsaiSessionSurvival";

const emptySnapshot = () => ({ currentTab: "main", unifiedInput: "" }) as unknown as BonsaiSessionSurvivalSnapshot;

function buildProps(shell: ReturnType<typeof useBonsaiPluginShell>, clearAll: () => void): SettingsTabProps {
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
    // The two the plugin's own index.tsx hands the Settings tab.
    onBeforeDeckyModal: shell.captureSessionBeforeModal,
    onCompleteDeckyModalClose: shell.onCompleteDeckyModalClose,
    onResetSession: () => {},
    onClearAllPluginData: clearAll,
  };
}

/** The panel: the real shell hook decides which tab shows; only the Settings tab is drawn for real. */
function Panel({ clearAll }: { clearAll: () => void }) {
  const shell = useBonsaiPluginShell({ getSessionSnapshot: emptySnapshot });
  const { currentTab, setCurrentTab } = shell;
  React.useEffect(() => {
    // The person is on Settings when the test starts.
    setCurrentTab("settings");
  }, [setCurrentTab]);
  return (
    <div>
      <div data-testid="tab">{currentTab}</div>
      {currentTab === "settings" ? <SettingsTab {...buildProps(shell, clearAll)} /> : <div>MAIN TAB</div>}
    </div>
  );
}

type Box = Record<string, unknown>;

beforeEach(() => {
  vi.useFakeTimers();
  shown = [];
  close.mockClear();
  window.localStorage.clear();
  resetModalReturnFocusRegistry();
});

afterEach(() => {
  vi.useRealTimers();
});

async function openAndClose(button: string, how: "onCancel" | "onOK" | "onMiddleButton", clearAll = vi.fn()) {
  const view = render(<Panel clearAll={clearAll} />);
  const btn = view.getByText(button);
  const focus = vi.spyOn(btn, "focus");
  fireEvent.click(btn);
  expect(shown).toHaveLength(1);
  const box = shown[0]!.props as Box;
  await act(async () => {
    (box[how] as () => void)();
    await Promise.resolve();
    // The shell puts the tab back after a short pause, then hands the ring back.
    await vi.advanceTimersByTimeAsync(1000);
  });
  return { view, focus, clearAll };
}

describe.each([
  ["Clear all data...", "onCancel (B and the Cancel button)"],
  ["Clear all data...", "onOK (Keep my data)"],
  ["Clear all data...", "onMiddleButton (the wipe)"],
  ["Clear cache...", "onCancel (B and the Cancel button)"],
] as const)("%s, closing with %s", (button, how) => {
  const key = how.split(" ")[0] as "onCancel" | "onOK" | "onMiddleButton";

  it("leaves the panel on Settings, not Main, with the ring back on the button", async () => {
    const { view, focus } = await openAndClose(button, key);
    expect(view.getByTestId("tab").textContent).toBe("settings");
    expect(view.queryByText("MAIN TAB")).toBeNull();
    expect(close).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });
});

it("B on the clear-all box clears nothing", async () => {
  const { clearAll } = await openAndClose("Clear all data...", "onCancel");
  expect(clearAll).not.toHaveBeenCalled();
});
