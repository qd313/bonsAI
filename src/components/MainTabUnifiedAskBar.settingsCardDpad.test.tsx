/**
 * Title: The settings-results card's D-pad wiring
 * Purpose: Pin plan 45 step 3 / plan 56 lane E2's rewrite of how the D-pad reaches the
 *          settings-results card: Up from the box lands the real Steam ring on the row nearest
 *          the box, Up/Down walk the rows, Down from the row nearest the box returns the ring to
 *          the box, A (onActivate and onOKButton) jumps to the setting exactly as a click does,
 *          B (onCancelButton) closes the card for the rest of the search and keeps the words, the
 *          card reappears once the box is emptied and a new search starts, and typing while the
 *          ring sits in the card hands it back to the box.
 * Used for: the settings-results card's row map in MainTabUnifiedAskBar.tsx and the box's own
 *          onMoveUp override next to it.
 * Solves: before this, the box swallowed Up/Down itself and slid a `selectedIndex` marker through
 *         the list from a distance -- a shape a real D-pad press on the device never produces (the
 *         focus law: Steam calls a Focusable's own move handlers directly, never a DOM keydown).
 *         Asserting through fireEvent keydown would have passed for that dead code and proven
 *         nothing about the device; every assertion here goes through the real onMoveUp / onMoveDown
 *         / onActivate / onOKButton / onCancelButton props Steam actually invokes.
 * Does not: cover step 4 (keeping the chips unreachable while the card is open) or step 6 (tap
 *         outside) -- both land in later commits, see the session report.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  textFieldProps: null as Record<string, unknown> | null,
  buttonProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealTextField = stubs.TextField;
  const RealButton = stubs.Button;
  const CapturingTextField = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingTextField(props, ref) {
      // A layout effect, not a plain assignment in the render body: guarantees this always holds
      // the props from the most recently committed render, immune to any earlier render pass
      // (e.g. before a measuring effect settles) leaving a stale capture behind.
      React.useLayoutEffect(() => {
        hoisted.textFieldProps = props;
      });
      return <RealTextField {...props} ref={ref} />;
    },
  );
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
    function CapturingButton(props, ref) {
      React.useLayoutEffect(() => {
        hoisted.buttonProps.push(props);
      });
      return <RealButton {...props} ref={ref} />;
    },
  );
  return {
    ...stubs,
    TextField: CapturingTextField,
    Button: CapturingButton,
  };
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
    ...overrides,
  };
}

function fakeSettings(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Settings > Group ${i} > Row ${i}`);
}

/** Same rect stand-in the settings-card test uses: plenty of room, so every row fits. */
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

function cardRowButtons(): Array<Record<string, unknown>> {
  return hoisted.buttonProps.filter((p) => p.className === "bonsai-settings-results-card-row");
}

beforeEach(() => {
  hoisted.textFieldProps = null;
  hoisted.buttonProps = [];
  resetNavFocusRegistry();
});

afterEach(() => {
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("Up from the box lands on the row nearest the box", () => {
  it("asks Steam to hand the ring to the settings-results-card nav node", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: fakeSettings(3) }));

    const takeFocus = vi.fn(() => true);
    registerNavFocus("settings-results-card", { current: { TakeFocus: takeFocus } });

    const onMoveUp = hoisted.textFieldProps?.onMoveUp as () => boolean;
    expect(onMoveUp).toBeTruthy();
    const handled = onMoveUp();

    expect(handled).toBe(true);
    expect(takeFocus).toHaveBeenCalledWith(true);
    restoreRects();
  });

  it("falls back to focusing the last row's own element when Steam has not populated the nav node yet", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: fakeSettings(3) }));

    const rows = cardRowButtons();
    expect(rows.length).toBe(3);
    const lastRowRef = rows[rows.length - 1].ref as React.RefCallback<HTMLButtonElement> | React.RefObject<HTMLButtonElement>;
    void lastRowRef;

    const onMoveUp = hoisted.textFieldProps?.onMoveUp as () => boolean;
    const handled = onMoveUp();

    expect(handled).toBe(true);
    // The last drawn row (index 2, nearest the box) is the one that took the DOM fallback focus.
    const buttons = document.querySelectorAll("button.bonsai-settings-results-card-row");
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    restoreRects();
  });

  it("does not override Up when the card is not showing", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: [] }));
    // With no results the card never renders, so the box's Up must fall through to whatever
    // unifiedInputDeckNavHandlers already does (the preset-chip hop) rather than a card-only stub.
    expect(hoisted.textFieldProps?.onMoveUp).toBeTruthy();
    const onMoveUp = hoisted.textFieldProps?.onMoveUp as () => boolean;
    // No preset carousel host mounted, so the ordinary handler honestly reports it found nothing.
    expect(onMoveUp()).toBe(false);
    restoreRects();
  });
});

describe("Up and Down walk the rows inside the card", () => {
  it("Down moves from one row to the next", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: fakeSettings(3) }));
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button.bonsai-settings-results-card-row"));
    const rows = cardRowButtons();

    const onMoveDownFromFirst = rows[0].onMoveDown as () => boolean;
    const handled = onMoveDownFromFirst();

    expect(handled).toBe(true);
    expect(document.activeElement).toBe(buttons[1]);
    restoreRects();
  });

  it("Up moves from one row back to the previous one", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: fakeSettings(3) }));
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button.bonsai-settings-results-card-row"));
    const rows = cardRowButtons();

    const onMoveUpFromSecond = rows[1].onMoveUp as () => boolean;
    const handled = onMoveUpFromSecond();

    expect(handled).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
    restoreRects();
  });

  it("Up on the top row holds still -- there is nothing above it to claim", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: fakeSettings(3) }));
    const rows = cardRowButtons();

    const onMoveUpFromTop = rows[0].onMoveUp as () => boolean;
    expect(onMoveUpFromTop()).toBe(true);
    restoreRects();
  });
});

describe("Down from the row nearest the box returns the ring to the box", () => {
  it("asks Steam to hand the ring back to the unified-input nav node", () => {
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: fakeSettings(3) }));
    const rows = cardRowButtons();
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });

    const onMoveDownFromLast = rows[rows.length - 1].onMoveDown as () => boolean;
    const handled = onMoveDownFromLast();

    expect(handled).toBe(true);
    expect(takeFocus).toHaveBeenCalledWith(true);
    restoreRects();
  });
});

describe("A jumps to the setting exactly as a click does", () => {
  it("onActivate calls onSettingClick with the row's own setting and index", () => {
    const onSettingClick = vi.fn();
    const settings = fakeSettings(3);
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: settings, onSettingClick }));
    const rows = cardRowButtons();

    (rows[1].onActivate as () => void)();

    expect(onSettingClick).toHaveBeenCalledWith(settings[1], 1);
    restoreRects();
  });

  it("onOKButton also calls onSettingClick and stops the press from propagating", () => {
    const onSettingClick = vi.fn();
    const settings = fakeSettings(3);
    const { restoreRects } = renderWithRoom(buildProps({ filteredSettings: settings, onSettingClick }));
    const rows = cardRowButtons();
    const stopPropagation = vi.fn();

    (rows[2].onOKButton as (evt: { stopPropagation: () => void }) => void)({ stopPropagation });

    expect(onSettingClick).toHaveBeenCalledWith(settings[2], 2);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    restoreRects();
  });
});

describe("B closes the card for the rest of the search", () => {
  it("hides the card and returns the ring to the box, keeping the words", () => {
    const { container, rerender, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: fakeSettings(3) }),
    );
    expect(container.querySelector(".bonsai-settings-results-card")).toBeTruthy();

    // Registered only now, after mount -- the box's own mount effect registers its real
    // (unpopulated in this stub) nav node under the same "unified-input" id, and a registration
    // made before render would just be overwritten by it.
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });

    const rows = cardRowButtons();
    (rows[rows.length - 1].onCancelButton as () => boolean)();

    // The ring goes back to the box the same way Down from that row does.
    expect(takeFocus).toHaveBeenCalledWith(true);

    // Re-render with the same props (as the real component tree would on the next paint) to
    // observe the card actually disappearing now that it is closed for this search.
    rerender(<MainTabUnifiedAskBar {...buildProps({ filteredSettings: fakeSettings(3) })} />);
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();
    restoreRects();
  });

  it("comes back once the box is emptied and a new search starts", () => {
    const { container, rerender, restoreRects } = renderWithRoom(
      buildProps({ filteredSettings: fakeSettings(3) }),
    );
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });
    const rows = cardRowButtons();
    (rows[rows.length - 1].onCancelButton as () => boolean)();
    rerender(<MainTabUnifiedAskBar {...buildProps({ filteredSettings: fakeSettings(3) })} />);
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();

    // The box is emptied -- no results at all, same as clearing the field.
    rerender(<MainTabUnifiedAskBar {...buildProps({ unifiedInput: "", filteredSettings: [] })} />);
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();

    // A new search starts.
    rerender(<MainTabUnifiedAskBar {...buildProps({ unifiedInput: "graphics", filteredSettings: fakeSettings(3) })} />);
    expect(container.querySelector(".bonsai-settings-results-card")).toBeTruthy();
    restoreRects();
  });
});

describe("Typing while the ring is in the card hands it back to the box", () => {
  it("redirects to the box once unifiedInput changes while the gamepad ring sits on a row", () => {
    const { container, rerender, restoreRects } = renderWithRoom(
      buildProps({ unifiedInput: "graph", filteredSettings: fakeSettings(3) }),
    );
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });

    const buttons = container.querySelectorAll("button.bonsai-settings-results-card-row");
    const ringRow = buttons[buttons.length - 1] as HTMLElement;
    ringRow.classList.add("gpfocus");

    rerender(<MainTabUnifiedAskBar {...buildProps({ unifiedInput: "graphi", filteredSettings: fakeSettings(3) })} />);

    expect(takeFocus).toHaveBeenCalledWith(true);
    restoreRects();
  });

  it("does nothing extra when the ring was already on the box", () => {
    const { rerender, restoreRects } = renderWithRoom(
      buildProps({ unifiedInput: "graph", filteredSettings: fakeSettings(3) }),
    );
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });

    rerender(<MainTabUnifiedAskBar {...buildProps({ unifiedInput: "graphi", filteredSettings: fakeSettings(3) })} />);

    expect(takeFocus).not.toHaveBeenCalled();
    restoreRects();
  });
});
