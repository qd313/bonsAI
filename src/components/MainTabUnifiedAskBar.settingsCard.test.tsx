/**
 * Title: The settings-results card floats above the box
 * Purpose: Pin the observable behaviour of the settings-results card (plan 45 / plan 56 lane E,
 *          steps 1, 2 and 5): it takes no layout space of its own, it never shows more rows than
 *          the eight-row cap or the live room above the box allow (whichever is smaller), the
 *          heading counts what was left out, and it stays hidden for a long typed question unless
 *          the words are an exact run inside a setting's own name.
 * Used for: the card block in MainTabUnifiedAskBar.tsx and settingsCardRowsThatFit /
 *          shouldHideSettingsResultsCard in useSteamSettingsSearch.ts.
 * Solves: the old list lived in normal document flow under the Ask row and grew unbounded --
 *         typing "en" matched 71 of 194 settings and threw the question box off the top of the
 *         panel (plan 45 section 2). A snapshot test would not catch either failure mode coming
 *         back, so this asserts actual row counts and the card's own position style.
 * Does not: cover the D-pad wiring into the card (plan 45 step 3) -- not built this lane, see the
 *         session report for why.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/* Button/Focusable have to be real DOM nodes so the card's own rects and classes are real too. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { settingsCardHeightForRows } from "../hooks/useSteamSettingsSearch";

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
    unifiedInput: "test",
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

/**
 * Renders inside a `.bonsai-scope` > `.bonsai-tab-bar` + mount structure, and stubs
 * getBoundingClientRect on both the tab bar and the question-box host so the card's live-measured
 * cap has real numbers to work with -- the same two rects the component itself reads (see its
 * measuring effect's own comment).
 */
function renderWithRoom(
  props: MainTabUnifiedAskBarProps,
  { boxTop, tabBarBottom }: { boxTop: number; tabBarBottom: number },
) {
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
      return {
        top: tabBarBottom - 20,
        bottom: tabBarBottom,
        left: 0,
        right: 300,
        width: 300,
        height: 20,
        x: 0,
        y: tabBarBottom - 20,
        toJSON: () => ({}),
      } as DOMRect;
    }
    if (this.classList.contains("bonsai-unified-input-host")) {
      return {
        top: boxTop,
        bottom: boxTop + 60,
        left: 0,
        right: 300,
        width: 300,
        height: 60,
        x: 0,
        y: boxTop,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return originalGBCR.call(this);
  };

  const result = render(<MainTabUnifiedAskBar {...props} />, { container: mount });
  return { ...result, restoreRects: () => { Element.prototype.getBoundingClientRect = originalGBCR; } };
}

describe("the settings-results card takes no layout space", () => {
  beforeEach(() => resetNavFocusRegistry());
  afterEach(() => {
    document.body.innerHTML = "";
    resetNavFocusRegistry();
  });

  it("renders the card as position: absolute rather than a row in normal flow", () => {
    const { container, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: fakeSettings(3) }),
      { boxTop: 400, tabBarBottom: 100 },
    );
    const card = container.querySelector(".bonsai-settings-results-card") as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.style.position).toBe("absolute");
    restoreRects();
  });

  it("does not render a card at all when there are no results", () => {
    const { container, restoreRects } = renderWithRoom(buildProps({ filteredSettings: [] }), {
      boxTop: 400,
      tabBarBottom: 100,
    });
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();
    restoreRects();
  });
});

describe("the settings-results card never shows more rows than fit", () => {
  beforeEach(() => resetNavFocusRegistry());
  afterEach(() => {
    document.body.innerHTML = "";
    resetNavFocusRegistry();
  });

  it("caps at eight rows when there is more than enough room, and counts the rest as more", () => {
    const { container, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: fakeSettings(20) }),
      // Plenty of room: 1000px between the box and the tab bar.
      { boxTop: 1100, tabBarBottom: 100 },
    );
    const rows = container.querySelectorAll(".bonsai-settings-results-card-row");
    expect(rows.length).toBe(8);
    const heading = container.querySelector(".bonsai-settings-results-card-heading");
    expect(heading?.textContent).toContain("12 more");
    restoreRects();
  });

  it("shows fewer than eight when the room between the box and the tab bar is tighter, like the Deck's own screen", () => {
    const sixRowHeight = settingsCardHeightForRows(6);
    // boxTop - tabBarBottom - 6px gap === exactly six rows' worth of room.
    const boxTop = 500;
    const tabBarBottom = boxTop - sixRowHeight - 6;
    const { container, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: fakeSettings(20) }),
      { boxTop, tabBarBottom },
    );
    const rows = container.querySelectorAll(".bonsai-settings-results-card-row");
    expect(rows.length).toBe(6);
    const heading = container.querySelector(".bonsai-settings-results-card-heading");
    expect(heading?.textContent).toContain("14 more");
    restoreRects();
  });

  it("shows every result with no 'more' count once everything fits", () => {
    const { container, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: fakeSettings(3) }),
      { boxTop: 1100, tabBarBottom: 100 },
    );
    const rows = container.querySelectorAll(".bonsai-settings-results-card-row");
    expect(rows.length).toBe(3);
    const heading = container.querySelector(".bonsai-settings-results-card-heading");
    expect(heading?.textContent).not.toContain("more");
    restoreRects();
  });
});

describe("the settings-results card hides itself for a long typed question", () => {
  beforeEach(() => resetNavFocusRegistry());
  afterEach(() => {
    document.body.innerHTML = "";
    resetNavFocusRegistry();
  });

  it("hides when there are more than three words and no exact setting name inside them", () => {
    const { container, restoreRects } = renderWithRoom(
      buildProps({
        unifiedInput: "why is my battery draining so fast",
        filteredSettings: fakeSettings(1),
      }),
      { boxTop: 1100, tabBarBottom: 100 },
    );
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();
    restoreRects();
  });

  it("shows for a four-word run that is an exact setting name (the let-out clause)", () => {
    const { container, restoreRects } = renderWithRoom(
      buildProps({
        unifiedInput: "steam client update channel",
        filteredSettings: fakeSettings(1),
      }),
      { boxTop: 1100, tabBarBottom: 100 },
    );
    expect(container.querySelector(".bonsai-settings-results-card")).toBeTruthy();
    restoreRects();
  });

  it("hides as soon as there is a question mark", () => {
    const { container, restoreRects } = renderWithRoom(
      buildProps({ unifiedInput: "brightness?", filteredSettings: fakeSettings(1) }),
      { boxTop: 1100, tabBarBottom: 100 },
    );
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();
    restoreRects();
  });
});
