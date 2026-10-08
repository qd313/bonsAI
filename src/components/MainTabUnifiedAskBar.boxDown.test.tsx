/**
 * Title: Down from the question box lands on the mode button, the next Down on Ask
 *
 * Purpose: Pin the maintainer's call of 2026-10-06 (docs/test-evidence/
 * maintainer-2026-10-06-question-box-down.png). Down from the question box used to jump straight to
 * the big Ask button and skip the row under the box (paperclip, Strategy / Speed mode button,
 * microphone). Now the box's Down goes to the mode button; Down from the row goes to Ask.
 *
 * The test presses the handlers Steam really invokes on the device (the box's own onMoveDown, and
 * the row's, because a Decky Button does not forward move props) and then reads which button holds
 * the ring, so it fails without the fix at the level the Deck check looks at: "the ring is on the
 * mode button after one Down, on Ask after two".
 *
 * Does not: prove the ring moves on the device; that is the Deck row's job. The mode button's Up
 * (to the question box) is left to Steam's own step and is not tested here.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";

import * as navFocusRegistry from "../utils/navFocusRegistry";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
  /* Only the box's move handler is kept (its latest render), not the whole props object. */
  boxDown: [] as Array<(() => unknown) | undefined>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const RealTextField = stubs.TextField;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  const CapturingTextField = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingTextField(props, ref) {
      hoisted.boxDown.push(props.onMoveDown as (() => unknown) | undefined);
      return <RealTextField {...props} ref={ref} />;
    }
  );
  return { ...stubs, Focusable: CapturingFocusable, TextField: CapturingTextField };
});

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";

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
    unifiedInput: "how do i parry",
    usesNativeMultilineField: true,
    setIsUnifiedInputFocused: vi.fn(),
    isUnifiedInputFocused: false,
    setUnifiedInput: vi.fn(),
    filteredSettings: [],
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

function lastBoxProps(): Record<string, unknown> {
  return { onMoveDown: hoisted.boxDown[hoisted.boxDown.length - 1] };
}

function lastRowProps(): Record<string, unknown> {
  const rows = hoisted.focusableProps.filter((p) => p.className === "bonsai-unified-input-actions-row");
  return rows[rows.length - 1];
}

/** Press Down the way Steam does on the device: through the move handler, never a DOM key event. */
function pressDown(props: Record<string, unknown>): unknown {
  return (props.onMoveDown as () => unknown)();
}

function mount(overrides: Partial<MainTabUnifiedAskBarProps> = {}) {
  const view = render(<MainTabUnifiedAskBar {...buildProps(overrides)} />, { container: document.body.appendChild(document.createElement("div")) });
  const modeButton = view.container.querySelector("button.bonsai-ask-mode-trigger") as HTMLElement;
  const askButton = view.container.querySelector("button.bonsai-ask-primary") as HTMLElement;
  expect(modeButton).toBeTruthy();
  expect(askButton).toBeTruthy();
  return { ...view, modeButton, askButton };
}

beforeEach(() => {
  hoisted.focusableProps.length = 0;
  hoisted.boxDown.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  navFocusRegistry.resetNavFocusRegistry();
  document.body.innerHTML = "";
});

describe("Down from the question box (maintainer 2026-10-06: it skipped the row under the box)", () => {
  it("puts the ring on the mode button, and the next Down puts it on Ask", () => {
    const { modeButton, askButton } = mount();

    expect(pressDown(lastBoxProps())).toBe(true);
    expect(document.activeElement).toBe(modeButton);
    expect(document.activeElement).not.toBe(askButton);

    expect(pressDown(lastRowProps())).toBe(true);
    expect(document.activeElement).toBe(askButton);

    // Up is Down reversed: from Ask back to the mode button.
    const askRows = hoisted.focusableProps.filter((p) => p.className === "bonsai-ask-row");
    expect((askRows[askRows.length - 1].onMoveUp as () => unknown)()).toBe(true);
    expect(document.activeElement).toBe(modeButton);
  });

  it("still lands on the mode button while an answer is arriving (Ask is greyed, Stop sits beside it)", () => {
    const { modeButton, container } = mount({ isAsking: true });

    expect(pressDown(lastBoxProps())).toBe(true);
    expect(document.activeElement).toBe(modeButton);
    expect(container.querySelector('button[aria-label="Stop generation"]')).toBeTruthy();
  });

  it("does not hand Down from the row to the greyed Ask button while an answer is arriving", () => {
    const { modeButton } = mount({ isAsking: true });
    modeButton.focus();

    expect(pressDown(lastRowProps())).toBe(false);
    expect(document.activeElement).toBe(modeButton);
  });

  it("leaves Down from the row to Steam while the mode menu is open, so the press can go into the menu", () => {
    const { modeButton, askButton } = mount();
    act(() => {
      fireEvent.click(modeButton);
    });
    expect(modeButton.getAttribute("aria-expanded")).toBe("true");
    modeButton.focus();

    expect(pressDown(lastRowProps())).toBe(false);
    expect(document.activeElement).not.toBe(askButton);
  });
});
