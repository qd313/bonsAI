/**
 * Title: Up from Ask always lands on the question box
 *
 * Purpose: Pin plan 74 lane 3, bug 4 (roadmap: "Up from Ask lands on the mic one time and on the
 * paperclip another"). Ask set no Up of its own, so Steam's own step carried the ring into the row
 * of icons along the box's bottom edge, which it re-enters on whichever icon was used last (the mic
 * one time, the paperclip another; docs/test-evidence/plan64-ASKBAR-DOWN-TO-STOP-01.json: "Up from
 * Ask goes to Voice input (the last-used place in the row)"). Down from the box goes straight to
 * Ask, so Up from Ask now goes straight back to the box, through Steam's own transfer.
 *
 * The handler sits on the Ask row's own Focusable: a Decky Button does not forward move props on
 * the device, so a handler on the button itself would never run there.
 *
 * Does not: prove the transfer lands on the device; that is the Deck row's job.
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

function askRowProps(): Record<string, unknown> | undefined {
  const rows = hoisted.focusableProps.filter((p) => p.className === "bonsai-ask-row");
  return rows[rows.length - 1];
}

beforeEach(() => {
  hoisted.focusableProps = [];
});

afterEach(() => {
  vi.restoreAllMocks();
  navFocusRegistry.resetNavFocusRegistry();
});

describe("Up from Ask", () => {
  it("hands the ring to the question box through Steam's own transfer", () => {
    const spy = vi.spyOn(navFocusRegistry, "takeNavFocus").mockReturnValue(true);
    render(<MainTabUnifiedAskBar {...buildProps()} />);

    const onMoveUp = askRowProps()?.onMoveUp as () => boolean;
    expect(onMoveUp).toBeTypeOf("function");
    expect(onMoveUp()).toBe(true);
    expect(spy).toHaveBeenCalledWith("unified-input");
  });

  it("goes to the box the same way from Clear, the other stop in Ask's row", () => {
    const spy = vi.spyOn(navFocusRegistry, "takeNavFocus").mockReturnValue(true);
    render(<MainTabUnifiedAskBar {...buildProps({ showSearchClearButton: true })} />);

    expect((askRowProps()?.onMoveUp as () => boolean)()).toBe(true);
    expect(spy).toHaveBeenCalledWith("unified-input");
  });

  it("leaves the press to Steam when the box is not registered yet", () => {
    vi.spyOn(navFocusRegistry, "takeNavFocus").mockReturnValue(false);
    render(<MainTabUnifiedAskBar {...buildProps()} />);

    expect((askRowProps()?.onMoveUp as () => boolean)()).toBe(false);
  });
});
