/**
 * Title: Up from Ask always lands on the question box
 *
 * Purpose: Pin plan 74 lane 3, bug 4 (roadmap: "Up from Ask lands on the mic one time and on the
 * paperclip another") in its plan 84 shape. Ask set no Up of its own, so Steam's own step carried the
 * ring into the row of icons along the box's bottom edge, re-entering it on whichever icon was used
 * last (docs/test-evidence/plan64-ASKBAR-DOWN-TO-STOP-01.json). Since plan 84 step 2 Ask is itself in
 * that row, the small button at its right end, and Down from the box lands on it; so Up from Ask, and
 * from every other stop of the strip's right-hand group, is Down reversed: the question box, by
 * Steam's own transfer (docs/focus-graph.md, "The ask box's strip").
 *
 * The handler sits on the strip's right-hand group (a Focusable): a Decky Button does not forward Up
 * or Down on the device, so a handler on the button itself would never run there.
 *
 * Does not: prove the ring lands on the device; that is the Deck row's job (P84-ASK-02).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import * as navFocusRegistry from "../utils/navFocusRegistry";

const hoisted = vi.hoisted(() => ({ focusableProps: [] as Array<Record<string, unknown>> }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  return { ...stubs, Focusable: CapturingFocusable };
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

/** The strip's right-hand group: mode, mic or Stop, the X and Ask. */
function rightGroupProps(): Record<string, unknown> | undefined {
  const groups = hoisted.focusableProps.filter((p) => p.className === "bonsai-unified-input-actions-right");
  return groups[groups.length - 1];
}

beforeEach(() => {
  hoisted.focusableProps = [];
});

afterEach(() => {
  vi.restoreAllMocks();
  navFocusRegistry.resetNavFocusRegistry();
});

function mount(overrides: Partial<MainTabUnifiedAskBarProps> = {}) {
  const view = render(<MainTabUnifiedAskBar {...buildProps(overrides)} />, {
    container: document.body.appendChild(document.createElement("div")),
  });
  const modeButton = view.container.querySelector("button.bonsai-ask-mode-trigger") as HTMLElement;
  expect(modeButton).toBeTruthy();
  return { ...view, modeButton };
}

describe("Up from Ask (plan 84: Ask is in the box's own strip, so Up is the box)", () => {
  it("takes the ring to the question box by Steam's transfer", () => {
    const take = vi.spyOn(navFocusRegistry, "takeNavFocus").mockReturnValue(true);
    mount();

    const onMoveUp = rightGroupProps()?.onMoveUp as () => boolean;
    expect(onMoveUp).toBeTypeOf("function");
    expect(onMoveUp()).toBe(true);
    expect(take).toHaveBeenCalledWith("unified-input");
  });

  it("does the same from the X, which sits beside Ask while the box has words", () => {
    const take = vi.spyOn(navFocusRegistry, "takeNavFocus").mockReturnValue(true);
    const { container } = mount({ showSearchClearButton: true });
    expect(container.querySelector('button[aria-label="Clear"]')).toBeTruthy();

    expect((rightGroupProps()?.onMoveUp as () => boolean)()).toBe(true);
    expect(take).toHaveBeenCalledWith("unified-input");
  });

  it("never drops the ring on the mode button on the way, the stop the old Ask row went back through", () => {
    vi.spyOn(navFocusRegistry, "takeNavFocus").mockReturnValue(true);
    const { modeButton } = mount();

    (rightGroupProps()?.onMoveUp as () => boolean)();
    expect(document.activeElement).not.toBe(modeButton);
  });
});
