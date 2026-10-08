/**
 * Title: The question box shows a ring while the D-pad is on it
 *
 * Purpose: Pin the Deck finding of 2026-10-02 (plan79-P79-X-RING-SAME.json): the question box looked
 * exactly the same with Steam's ring on it as without, both after walking onto it and after the X.
 * Steam marks the focused field by putting `gpfocus` on the INPUT itself (and `gpfocuswithin` on the
 * wrapper around it); the box's computed outline was none, so nothing was drawn. Every other control
 * shows a white ring; the box now does too, drawn INSIDE the field's own edge so neither the Ask
 * row, the dock nor the glass card around it can cut it off.
 *
 * Used for: the rule in sections/section-5.ts.
 *
 * Does not: See pixels (jsdom has no paint engine). It runs the CSS cascade with the plugin's real
 * stylesheet on the real Ask bar, Steam's focus class put where Steam puts it, and reads the computed
 * outline back. That the ring is not clipped at the edges is by construction (inside the field) and a
 * Deck check.
 */
import React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";

/* Decky's real TextField renders a Panel.Focusable wrapper around a layout div around the INPUT;
   the stub's bare div has no input to carry Steam's class, so give it the real shape. */
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const FieldWithInput = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function FieldWithInput(
    props,
    ref,
  ) {
    return (
      <div ref={ref} className="Panel Focusable" data-decky-ui="TextField">
        <div className="_DialogLayout">
          <input className="DialogInput DialogTextInputBase Focusable" value={String(props.value ?? "")} readOnly />
        </div>
      </div>
    );
  });
  return { ...stubs, TextField: FieldWithInput };
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

describe("the question box ring", () => {
  let sheet: HTMLStyleElement;
  beforeAll(() => {
    sheet = document.createElement("style");
    sheet.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(sheet);
  });
  afterAll(() => sheet.remove());

  function mount(overrides: Partial<MainTabUnifiedAskBarProps> = {}) {
    const view = render(
      <div className="bonsai-scope">
        <MainTabUnifiedAskBar {...buildProps(overrides)} />
      </div>,
    );
    const input = view.container.querySelector(".bonsai-unified-input-host input") as HTMLElement;
    expect(input).toBeTruthy();
    return { ...view, input };
  }

  it("draws a white ring on the box while Steam's focus class is on it, and none without", () => {
    const { input } = mount();
    expect(getComputedStyle(input).outline).toBe("");
    input.classList.add("gpfocus");
    const style = getComputedStyle(input);
    expect(style.outline).toMatch(/solid/);
    expect(style.outline).toContain("2px");
    expect(style.outline).toContain("rgba(255, 255, 255, 0.88)");
    input.classList.remove("gpfocus");
    expect(getComputedStyle(input).outline).toBe("");
  });

  it("draws the ring inside the field's own edge, where nothing can clip it", () => {
    const { input } = mount();
    input.classList.add("gpfocus");
    expect(parseFloat(getComputedStyle(input).outlineOffset)).toBeLessThanOrEqual(-2);
  });

  it("draws no ring on the box when the ring is on another control", () => {
    const { input, container } = mount();
    const ask = container.querySelector(".bonsai-ask-primary") as HTMLElement;
    ask.classList.add("gpfocus");
    expect(getComputedStyle(input).outline).toBe("");
  });

  it("adds no second focus look of its own to the field (the keyboard being open changes nothing)", () => {
    const { input } = mount();
    input.classList.add("gpfocus", "gpfocuswithin");
    const once = getComputedStyle(input).boxShadow;
    // one ring: the outline; the box-shadow stays the quiet inner line, not a second outer ring
    expect(once).not.toMatch(/0px 0px 0px [2-9]px/);
  });
});
