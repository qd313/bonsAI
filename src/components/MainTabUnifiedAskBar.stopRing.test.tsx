/**
 * Title: Stop and the X hand the ring to the question box, never to the microphone
 *
 * Purpose: Pin the plan 72 fix for docs/test-evidence/plan72-A2-STOP-RING-try1..3.json: Stop and
 * Voice input are the same corner button, so when an answer was stopped the ring stayed on that one
 * element as it turned back into "Voice input", and the next A turned the microphone on (3 tries of
 * 3 on the Deck). Stop now hands the ring to the question box through Steam's own transfer, the same
 * way a send does.
 *
 * Does not: Prove the transfer lands on the device -- that is the Deck row after the fix. Steam's
 * nav props (onOKButton) are stripped by the test harness, so the press is driven through onClick,
 * which runs the same handler.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";
import * as navFocusRegistry from "../utils/navFocusRegistry";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

function buildProps(overrides: Partial<MainTabUnifiedAskBarProps> = {}): MainTabUnifiedAskBarProps {
  return {
    fullBleedRowStyle: {},
    presetCarouselHostRef: { current: null },
    unifiedInputHostRef: { current: null },
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputMeasureRef: { current: null },
    attachActionHostRef: { current: null },
    askBarHostRef: { current: null },
    unifiedInputSurfacePx: 60,
    unifiedInput: "",
    usesNativeMultilineField: true,
    setIsUnifiedInputFocused: vi.fn(),
    isUnifiedInputFocused: false,
    setUnifiedInput: vi.fn(),
    setSelectedIndex: vi.fn(),
    filteredSettings: [],
    selectedIndex: -1,
    onSettingClick: vi.fn(),
    isAsking: false,
    ollamaIp: "192.168.1.50",
    onAskOllama: vi.fn(),
    onOpenScreenshotBrowser: vi.fn(),
    onTakeScreenshot: vi.fn(),
    onCancelAsk: vi.fn(),
    onMicInput: vi.fn(),
    selectedAttachment: null,
    setSelectedAttachment: vi.fn(),
    clearUnifiedInput: vi.fn(),
    showSearchClearButton: false,
    mediaError: "",
    askMode: "speed",
    onAskModeChange: vi.fn(),
    isQamSetting: vi.fn(() => false),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  navFocusRegistry.resetNavFocusRegistry();
});

describe("Stop hands the ring to the question box (plan 72: it stayed on the mic)", () => {
  it("stops the answer and hands the ring to the question box", () => {
    const spy = vi.spyOn(navFocusRegistry, "takeNavFocus");
    const onCancelAsk = vi.fn();
    const { getByLabelText } = render(<MainTabUnifiedAskBar {...buildProps({ isAsking: true, onCancelAsk })} />);
    fireEvent.click(getByLabelText("Stop generation"));
    expect(onCancelAsk).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith("unified-input");
  });

  it("leaves the microphone button's own press alone (no hand-off when it starts voice input)", () => {
    const spy = vi.spyOn(navFocusRegistry, "takeNavFocus");
    const onMicInput = vi.fn();
    const { getByLabelText } = render(<MainTabUnifiedAskBar {...buildProps({ onMicInput })} />);
    fireEvent.click(getByLabelText("Voice input"));
    expect(onMicInput).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalledWith("unified-input");
  });
});

describe("The X hands the ring to the question box (Deck 2026-10-02: after X nothing owned the ring)", () => {
  it("clears the question and hands the ring to the question box", () => {
    const spy = vi.spyOn(navFocusRegistry, "takeNavFocus");
    const clearUnifiedInput = vi.fn();
    const { getByLabelText } = render(
      <MainTabUnifiedAskBar {...buildProps({ unifiedInput: "a question", showSearchClearButton: true, clearUnifiedInput })} />,
    );
    fireEvent.click(getByLabelText("Clear"));
    expect(clearUnifiedInput).toHaveBeenCalled();
    // The X disappears the moment the box is empty; without a hand-off the ring was on a button that no longer exists.
    expect(spy).toHaveBeenCalledWith("unified-input");
  });
});
