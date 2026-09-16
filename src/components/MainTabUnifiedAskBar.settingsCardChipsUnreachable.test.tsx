/**
 * Title: The chip row stays unreachable while the settings-results card is open
 * Purpose: Pin plan 45 step 4 / plan 56 lane E2 step 4: while the settings-results card is
 *          showing, nothing above the Ask bar can take the D-pad's ring -- not through the
 *          question box's own Up (already covered in the previous commit's test file) and not
 *          through the AI-character avatar's Up either, which ordinarily has no handler of its
 *          own and falls to Steam's natural spatial navigation.
 * Used for: the avatar Focusable's onMoveUp override in MainTabUnifiedAskBar.tsx, next to
 *          avatarDeckNavHandlers.
 * Solves: the avatar sits in its own column next to the box, and avatarDeckNavHandlers
 *         (useMainTabAskBarFocus.ts) never defines an onMoveUp for it -- Up from the avatar was
 *         always left to Steam's own "nearest thing above" search, which reaches the preset chip
 *         row sitting above the whole Ask bar. The box's own Up override does not touch this path
 *         at all, so closing only that one left the avatar's Up as a second, unguarded way past
 *         the open card into the chips.
 * Does not: cover step 3 (the box's own Up, and the rows themselves) -- see
 *         MainTabUnifiedAskBar.settingsCardDpad.test.tsx.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      React.useLayoutEffect(() => {
        hoisted.focusableProps.push(props);
      });
      return <RealFocusable {...props} ref={ref} />;
    },
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

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
    unifiedInput: "graphics",
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
    aiCharacterPadClass: true,
    onOpenCharacterPicker: vi.fn(),
    ...overrides,
  };
}

function fakeSettings(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Settings > Group ${i} > Row ${i}`);
}

function renderWithRoom(props: MainTabUnifiedAskBarProps) {
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  const tabBar = document.createElement("div");
  tabBar.className = "bonsai-tab-bar";
  scope.appendChild(tabBar);
  const mount = document.createElement("div");
  scope.appendChild(mount);
  document.body.appendChild(scope);

  const originalGBCR = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.classList.contains("bonsai-tab-bar")) {
      return { top: 80, bottom: 100, left: 0, right: 300, width: 300, height: 20, x: 0, y: 80, toJSON: () => ({}) } as DOMRect;
    }
    if (this.classList.contains("bonsai-unified-input-host")) {
      return { top: 1100, bottom: 1160, left: 0, right: 300, width: 300, height: 60, x: 0, y: 1100, toJSON: () => ({}) } as DOMRect;
    }
    return originalGBCR.call(this);
  };

  const result = render(<MainTabUnifiedAskBar {...props} />, { container: mount });
  return {
    ...result,
    restoreRects: () => {
      Element.prototype.getBoundingClientRect = originalGBCR;
    },
  };
}

function avatarProps(): Record<string, unknown> | undefined {
  return hoisted.focusableProps.find((p) => p.className === "bonsai-ai-character-avatar");
}

beforeEach(() => {
  hoisted.focusableProps = [];
  resetNavFocusRegistry();
});

afterEach(() => {
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("the avatar's Up while the settings-results card is open", () => {
  it("sends the ring into the card instead of leaving Up to Steam's own spatial nav", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: fakeSettings(3) }));

    const takeFocus = vi.fn(() => true);
    registerNavFocus("settings-results-card", { current: { TakeFocus: takeFocus } });

    const avatar = avatarProps();
    expect(avatar).toBeTruthy();
    const onMoveUp = avatar?.onMoveUp as () => boolean;
    expect(onMoveUp).toBeTruthy();

    const handled = onMoveUp();

    expect(handled).toBe(true);
    expect(takeFocus).toHaveBeenCalledWith(true);
    restoreRects();
  });

  it("leaves Up to Steam's own spatial nav (no override at all) once the card is not showing", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: [] }));

    const avatar = avatarProps();
    expect(avatar).toBeTruthy();
    // No onMoveUp key here means Steam falls back to its own "nearest thing above" search --
    // ordinary behaviour, unrelated to the card, which is exactly what should happen with the
    // card gone.
    expect(avatar?.onMoveUp).toBeUndefined();
    restoreRects();
  });

  it("still hands Right from the avatar into the box, unaffected by the card being open", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: fakeSettings(3) }));

    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });

    const avatar = avatarProps();
    const onMoveRight = avatar?.onMoveRight as () => boolean;
    expect(onMoveRight()).toBe(true);
    expect(takeFocus).toHaveBeenCalledWith(true);
    restoreRects();
  });
});
