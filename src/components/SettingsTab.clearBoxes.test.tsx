/**
 * Title: The Settings Clear boxes show Cancel and the action, and nothing else
 *
 * Purpose: The "Clear session cache?" and "Clear all plugin data?" boxes used to be Steam's ConfirmModal with
 * a safe choice first, and Steam adds its own Cancel, so a person saw three buttons (Keep cache / Clear /
 * Cancel). Each is now the shared two-button box: Cancel first (where Steam puts the ring) and the clearing
 * beside it, and B is Cancel. Checked on the box each button really hands to Steam, drawn the way Steam draws
 * it: the buttons read off the page, each one pressed, and B.
 *
 * Does not: open a real Steam box; the stub only records what the tab asks Steam to show.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let shown: React.ReactElement[] = [];
let modalRootCancel: (() => void) | undefined;
const close = vi.fn();

vi.mock("@decky/ui", async () => {
  const fake = await import("../test-harness/fakeDeckyUi");
  const ModalRoot = React.forwardRef<HTMLDivElement, Record<string, unknown> & { children?: React.ReactNode }>(
    function CapturingModalRoot(props, ref) {
      modalRootCancel = props.onCancel as (() => void) | undefined;
      return <fake.ModalRoot {...props} ref={ref} />;
    },
  );
  return {
    ...fake,
    ModalRoot,
    showModal: (el: React.ReactElement) => {
      shown.push(el);
      return { Close: close, Update: () => undefined };
    },
  };
});

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

/** Open the box a Clear button asks Steam for, then draw it and hand back its buttons. */
function openBox(label: string, overrides: Partial<SettingsTabProps>) {
  const { getByText } = render(<SettingsTab {...buildProps(overrides)} />);
  fireEvent.click(getByText(label));
  expect(shown).toHaveLength(1);
  const box = render(shown[0]!);
  const buttons = Array.from(box.container.querySelectorAll("button"));
  return { box, buttons, labels: buttons.map((b) => b.textContent ?? "") };
}

beforeEach(() => {
  shown = [];
  modalRootCancel = undefined;
  close.mockClear();
});

describe.each([
  ["Clear cache...", "Clear", "onResetSession"],
  ["Clear all data...", "Clear all data", "onClearAllPluginData"],
] as const)("the %s box", (button, clearLabel, prop) => {
  it("shows the action and Cancel only: two buttons, Cancel first where the ring opens", () => {
    const { labels } = openBox(button, { [prop]: vi.fn() });
    expect(labels).toEqual(["Cancel", clearLabel]);
  });

  it("opens on a button that clears nothing: A on the first button and B change nothing", () => {
    const clear = vi.fn();
    const { buttons } = openBox(button, { [prop]: clear });
    fireEvent.click(buttons[0]!);
    expect(clear).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("B is Cancel: it closes the box and clears nothing", () => {
    const clear = vi.fn();
    openBox(button, { [prop]: clear });
    expect(modalRootCancel).toBeTypeOf("function");
    modalRootCancel!();
    expect(clear).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("still clears, on its own labelled action button, once", async () => {
    const clear = vi.fn();
    const { buttons } = openBox(button, { [prop]: clear });
    fireEvent.click(buttons[1]!);
    await Promise.resolve();
    expect(clear).toHaveBeenCalledTimes(1);
  });
});

/** Plan 93 lane B9: the words under the title, as drawn (the box is title, words, then the two buttons). */
function bodyWords(container: HTMLElement): string {
  const prose = container.querySelector(".bonsai-prose");
  return prose?.children[1]?.textContent ?? "";
}

describe("the Clear all data box words stay short", () => {
  it("says what is deleted and what stays in at most 40 words", () => {
    const { box } = openBox("Clear all data...", { onClearAllPluginData: vi.fn() });
    const words = bodyWords(box.container);
    expect(words.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(40);
    expect(words).toMatch(/fresh install/);
    expect(words).toMatch(/settings, permissions, chats, notes, cache and logs are deleted/);
    expect(words).toMatch(/downloaded models and the Ollama install/);
    expect(words).toMatch(/Desktop logs stay/);
  });
});
