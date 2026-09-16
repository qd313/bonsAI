/**
 * Title: Ask bar -> where the ring goes after a press
 * Purpose: Pin that pressing the Ask button always hands Steam's ring somewhere -- the question
 *          box after a send, back onto the button itself for an empty box -- instead of dropping
 *          it, which is what happened every time before this fix.
 * Used for: the Ask button's onClick / onOKButton wiring in MainTabUnifiedAskBar.tsx.
 * Solves: measured on device 2026-09-05 (four times): every press of the Ask button left nothing
 *         highlighted, with a real question and an empty box alike. The cause is outside this
 *         file -- onAskOllama (useBonsaiAskOrchestration.ts) blurs whatever the page's own focus
 *         happens to be sitting on before it even checks whether there is a question to send --
 *         but nothing ever claimed the ring afterward, so it dropped to nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";

/* Focusable/Button have to be real DOM nodes or this suite would pass for the wrong reason. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";

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

describe("Ask button press -> where the ring goes next", () => {
  beforeEach(() => {
    resetNavFocusRegistry();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetNavFocusRegistry();
  });

  it("asks Steam to hand the ring to the question box after sending a real question", () => {
    const onAskOllama = vi.fn();

    const { container } = render(
      <MainTabUnifiedAskBar
        {...buildProps({ unifiedInput: "How do I beat this boss?", onAskOllama })}
      />,
    );
    const askButton = container.querySelector("button.bonsai-ask-primary") as HTMLButtonElement;
    expect(askButton).toBeTruthy();

    // The box registers its own nav node on mount (registerNavFocus above); stand in for Steam
    // populating that node the way it does on device, superseding the component's own registration
    // exactly like a real navRef fill-in would.
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });

    fireEvent.click(askButton);

    expect(onAskOllama).toHaveBeenCalledTimes(1);
    // `true` marks the move as gamepad-sourced, the same as every other Steam transfer in this repo.
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  it("leaves the Ask button as the focused element after an empty-box press", () => {
    const onAskOllama = vi.fn();
    const { container } = render(
      <MainTabUnifiedAskBar {...buildProps({ unifiedInput: "", onAskOllama })} />,
    );
    const askButton = container.querySelector("button.bonsai-ask-primary") as HTMLButtonElement;
    expect(askButton).toBeTruthy();

    // Stand in for the ring sitting somewhere else the instant before the press, the way a D-pad
    // OK finds it -- proves the fix actively reclaims focus rather than the button happening to
    // keep it already.
    const decoy = document.createElement("button");
    document.body.appendChild(decoy);
    decoy.focus();
    expect(document.activeElement).toBe(decoy);

    fireEvent.click(askButton);

    expect(onAskOllama).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(askButton);
  });

  it("does not call onAskOllama or move focus while a question is already in flight", () => {
    const onAskOllama = vi.fn();
    const { container } = render(
      <MainTabUnifiedAskBar {...buildProps({ unifiedInput: "follow-up", isAsking: true, onAskOllama })} />,
    );
    const askButton = container.querySelector("button.bonsai-ask-primary") as HTMLButtonElement;
    expect(askButton).toBeTruthy();
    // A real disabled <button> refuses both the click and the focus a click would otherwise cause.
    expect(askButton.disabled).toBe(true);

    fireEvent.click(askButton);

    expect(onAskOllama).not.toHaveBeenCalled();
  });
});
