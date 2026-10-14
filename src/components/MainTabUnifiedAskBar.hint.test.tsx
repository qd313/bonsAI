/**
 * Title: Ask bar -> the grey hint in the empty question box, every mode
 * Purpose: Pin that the empty question box shows its mode's hint in Speed, Strategy and Expert,
 *          on both drawing paths, and that typing a character removes it.
 * Used for: the placeholder and the drawn overlay in MainTabUnifiedAskBar.tsx.
 * Solves: measured on the Deck 2026-10-13: only Strategy showed a hint; Speed and Expert showed none.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";
import { ASK_MODE_HINTS } from "../data/askModeHints";
import { ASK_MODE_IDS } from "../data/askMode";

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
    ...overrides,
  };
}

describe("the grey hint in the empty question box", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  for (const mode of ASK_MODE_IDS) {
    it(`${mode}: the real field carries that mode's hint, and typing one letter removes it`, () => {
      const { container, rerender } = render(<MainTabUnifiedAskBar {...buildProps({ askMode: mode })} />);
      const hinted = Array.from(container.querySelectorAll("[placeholder]")).map((n) => n.getAttribute("placeholder"));
      expect(hinted).toContain(ASK_MODE_HINTS[mode]);
      expect(ASK_MODE_HINTS[mode].length).toBeGreaterThan(10);
      rerender(<MainTabUnifiedAskBar {...buildProps({ askMode: mode, unifiedInput: "a" })} />);
      // Once a letter is typed the field is not empty, so its browser hint is not drawn; the bar must not
      // keep its own copy of the hint on screen either.
      expect(container.textContent).not.toContain(ASK_MODE_HINTS[mode]);
    });

    it(`${mode}: the drawn overlay shows that mode's hint when empty, and not once a letter is typed`, () => {
      const { container, rerender } = render(
        <MainTabUnifiedAskBar {...buildProps({ askMode: mode, usesNativeMultilineField: false })} />,
      );
      const hint = container.querySelector(".bonsai-unified-input-strategy-placeholder");
      expect(hint?.textContent).toBe(ASK_MODE_HINTS[mode]);
      rerender(
        <MainTabUnifiedAskBar {...buildProps({ askMode: mode, usesNativeMultilineField: false, unifiedInput: "a" })} />,
      );
      expect(container.querySelector(".bonsai-unified-input-strategy-placeholder")).toBeNull();
    });
  }
});
