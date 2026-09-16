/**
 * Title: A tap outside the settings-results card closes it
 * Purpose: Pin plan 45 step 6 / plan 56 lane E2 step 6: a pointer press anywhere outside the
 *          settings-results card behaves as B -- the card is hidden for the rest of this search,
 *          and what was typed stays. A press ON the card (its heading, a row) must not trigger
 *          this at all, since a row's own click is how A/onActivate already works.
 * Used for: the onPointerDownCapture handler on the settings-results card's wrapping div in
 *          MainTabUnifiedAskBar.tsx.
 * Solves: nothing closed the card for a mouse or touch user who simply clicked elsewhere on the
 *         bar -- only the row's own B press (Focusable onCancelButton, the previous commits) did,
 *         which a pointer cannot send. This is a finger-only feature: it exercises a real
 *         PointerEvent through the DOM (fireEvent.pointerDown), never a Focusable move handler,
 *         and is not part of the focus-graph the D-pad rig walks -- see the session report.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

/* Button/Focusable have to be real DOM nodes so a real pointerdown can bubble/capture through them. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";

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

beforeEach(() => resetNavFocusRegistry());
afterEach(() => {
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("a tap outside the card", () => {
  it("closes the card and keeps the words", () => {
    const { container, rerender, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: fakeSettings(3) }),
    );
    expect(container.querySelector(".bonsai-settings-results-card")).toBeTruthy();

    // The Ask button sits well outside the settings-results card.
    const askButton = container.querySelector(".bonsai-ask-primary") as HTMLElement;
    fireEvent.pointerDown(askButton);

    rerender(<MainTabUnifiedAskBar {...buildProps({ filteredSettings: fakeSettings(3) })} />);
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();
    restoreRects();
  });

  it("comes back once the box is emptied and a new search starts, same as B", () => {
    const { container, rerender, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: fakeSettings(3) }),
    );
    const askButton = container.querySelector(".bonsai-ask-primary") as HTMLElement;
    fireEvent.pointerDown(askButton);
    rerender(<MainTabUnifiedAskBar {...buildProps({ filteredSettings: fakeSettings(3) })} />);
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();

    rerender(<MainTabUnifiedAskBar {...buildProps({ unifiedInput: "", filteredSettings: [] })} />);
    rerender(
      <MainTabUnifiedAskBar {...buildProps({ unifiedInput: "graphics", filteredSettings: fakeSettings(3) })} />,
    );
    expect(container.querySelector(".bonsai-settings-results-card")).toBeTruthy();
    restoreRects();
  });
});

describe("a tap ON the card", () => {
  it("does not close the card -- a row's own click keeps working", () => {
    const onSettingClick = vi.fn();
    const settings = fakeSettings(3);
    const { container, rerender, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: settings, onSettingClick }),
    );

    const row = container.querySelector(".bonsai-settings-results-card-row") as HTMLElement;
    fireEvent.pointerDown(row);
    fireEvent.click(row);

    expect(onSettingClick).toHaveBeenCalled();

    // Still open after a tap that landed on the card itself.
    rerender(<MainTabUnifiedAskBar {...buildProps({ filteredSettings: fakeSettings(3) })} />);
    expect(container.querySelector(".bonsai-settings-results-card")).toBeTruthy();
    restoreRects();
  });

  it("does nothing when the card is not showing at all", () => {
    const { container, restoreRects } = renderWithRoom(buildProps({ filteredSettings: [] }));
    const host = container.querySelector(".bonsai-unified-input-host") as HTMLElement;
    expect(() => fireEvent.pointerDown(host)).not.toThrow();
    restoreRects();
  });
});
