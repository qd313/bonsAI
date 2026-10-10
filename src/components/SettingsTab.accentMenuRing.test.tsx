/**
 * Title: The ring goes back to the Accent intensity control after the menu closes
 *
 * Purpose: Pin plan 76 lane 2 follow-up, bug 1 (docs/test-evidence/plan76-S3C.json). On the Deck,
 * picking a level in the Accent intensity menu with A (or leaving it with B) removed the menu's
 * rows while the ring was on one of them, so nothing owned the ring; the first LB then put it on the
 * "Show Developer tab" switch and did not change tab. The menu now notices its own removal with the
 * ring inside it, and hands the ring to the accent control through Steam's own transfer (the nav node
 * of the wrapper around the control), with that control's own focus as the fallback.
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); that is the Deck row's job.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ takeFocus: null as unknown as ReturnType<typeof vi.fn> }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  hoisted.takeFocus = vi.fn();
  const RealFocusable = stubs.Focusable;
  // The real Focusable fills a `navRef` holder with Steam's nav node; the stub drops the prop.
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavFocusable(props, ref) {
    const holder = props.navRef as { current: unknown } | undefined;
    if (holder) holder.current = { TakeFocus: hoisted.takeFocus };
    return <RealFocusable {...props} ref={ref} />;
  });
  return { ...stubs, Focusable: NavFocusable };
});

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";

function props(overrides: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return {
    screenshotAttachmentPreset: "mid",
    setScreenshotAttachmentPreset: () => {},
    unifiedInputPersistenceMode: "persist_all",
    setUnifiedInputPersistenceMode: () => {},
    voiceReplyMode: "off",
    setVoiceReplyMode: () => {},
    chatTextSizeSetting: { value: "normal", set: () => {} },
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

const later = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));

function openMenu(container: HTMLElement) {
  const trigger = container.querySelector("button.bonsai-accent-intensity-trigger") as HTMLButtonElement;
  fireEvent.click(trigger);
  const rows = Array.from(container.querySelectorAll(".bonsai-accent-intensity-menu-item")) as HTMLElement[];
  expect(rows.length).toBeGreaterThan(1);
  return { trigger, rows };
}

beforeEach(() => {
  hoisted.takeFocus.mockReset();
  (document.activeElement as HTMLElement | null)?.blur();
});

describe("Accent intensity menu closes with the ring inside it", () => {
  it("picking a level: the ring is handed to the accent control", async () => {
    const { container } = render(<SettingsTab {...props()} />);
    const { trigger, rows } = openMenu(container);
    rows[1]!.classList.add("gpfocus"); // Steam's ring marker

    fireEvent.click(rows[1]!);
    await later(30);

    expect(container.querySelector(".bonsai-accent-intensity-menu-item")).toBeNull();
    expect(hoisted.takeFocus).toHaveBeenCalledWith(true);
    expect(document.activeElement).toBe(trigger); // the fallback, since jsdom has no Steam transfer
  });

  it("B (the menu's own cancel) does the same", async () => {
    const { container } = render(<SettingsTab {...props()} />);
    const { trigger, rows } = openMenu(container);
    rows[0]!.classList.add("gpfocus");
    await later(30); // the trigger ignores a second press inside one frame
    // The menu closes without a pick, as on B: the trigger's own toggle stands in for the cancel.
    fireEvent.click(trigger);
    await later(30);

    expect(hoisted.takeFocus).toHaveBeenCalledWith(true);
    expect(document.activeElement).toBe(trigger);
  });

  it("with the ring elsewhere when the menu closes: leaves the ring alone", async () => {
    const { container } = render(<SettingsTab {...props()} />);
    const { trigger, rows } = openMenu(container);

    fireEvent.click(rows[1]!);
    await later(30);

    expect(hoisted.takeFocus).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(trigger);
  });
});
