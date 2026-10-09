/**
 * Title: Down from the question box lands on the small Ask button in the strip under it
 *
 * Purpose: Pin plan 84 step 2's route (docs/focus-graph.md, "The ask box's strip"). The maintainer's
 * rule of 2026-10-06 (docs/test-evidence/maintainer-2026-10-06-question-box-down.png) was that Down
 * from the question box lands on the row under it and skips nothing; it then went to the mode button,
 * because the big Ask button sat below that row. Since plan 84 the small Ask button is in that row, so
 * Down lands on it (Down then A sends), on Stop while an answer is arriving, and Up from the strip
 * comes back to the box by Steam's transfer.
 *
 * The test presses the handlers Steam really invokes on the device (the box's own onMoveDown, and the
 * strip group's onMoveUp, because a Decky Button does not forward Up or Down) and then reads which
 * button holds the ring, so it fails without the change at the level the Deck check looks at.
 *
 * Does not: prove the ring moves on the device; that is the Deck row's job (P84-ASK-02). The whole
 * walk through the strip, on the real Main tab, is MainTab.askStrip.deck.test.tsx.
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

/** The strip's right-hand group (mode, mic or Stop, the X, Ask): it carries Up for all of them. */
function lastRightGroupProps(): Record<string, unknown> {
  const groups = hoisted.focusableProps.filter((p) => p.className === "bonsai-unified-input-actions-right");
  return groups[groups.length - 1];
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

describe("Down from the question box (plan 84: the small Ask sits in the strip right under it)", () => {
  it("puts the ring on the small Ask, and Up from the strip takes it back to the box by Steam's transfer", () => {
    const { askButton, modeButton } = mount();
    // buildProps hands in an empty askBarHostRef; the bar fills it with the small Ask button itself.
    expect(pressDown(lastBoxProps())).toBe(true);
    expect(document.activeElement).toBe(askButton);
    expect(document.activeElement).not.toBe(modeButton);

    const take = vi.spyOn(navFocusRegistry, "takeNavFocus").mockReturnValue(true);
    expect((lastRightGroupProps().onMoveUp as () => unknown)()).toBe(true);
    expect(take).toHaveBeenCalledWith("unified-input");
  });

  it("lands on Stop while an answer is arriving (Ask rests, and never takes the ring)", () => {
    const { askButton, container } = mount({ isAsking: true });
    const stop = container.querySelector('button[aria-label="Stop generation"]') as HTMLElement;
    expect(stop).toBeTruthy();

    expect(pressDown(lastBoxProps())).toBe(true);
    expect(document.activeElement).toBe(stop);
    expect(document.activeElement).not.toBe(askButton);
  });

  it("leaves Down from the strip to Steam: no part of the strip claims it", () => {
    mount();
    expect(lastRowProps().onMoveDown).toBeUndefined();
    expect(lastRightGroupProps().onMoveDown).toBeUndefined();
  });

  it("leaves Up from the strip to Steam while the mode menu is open, so the press can go into the menu", () => {
    const take = vi.spyOn(navFocusRegistry, "takeNavFocus").mockReturnValue(true);
    const { modeButton } = mount();
    act(() => {
      fireEvent.click(modeButton);
    });
    expect(modeButton.getAttribute("aria-expanded")).toBe("true");
    take.mockClear();

    expect((lastRightGroupProps().onMoveUp as () => unknown)()).toBe(false);
    expect(take).not.toHaveBeenCalledWith("unified-input");
  });
});
