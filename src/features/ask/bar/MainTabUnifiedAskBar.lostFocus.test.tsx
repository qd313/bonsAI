/**
 * Title: The question box and its strip while the panel's page has lost the browser's focus (plan 97, L14)
 * Purpose: Pin row P97-L14-FREEZE at the level the Deck check looks at: where Steam's ring is after each press.
 *          Plan 97 block B (workshop:test-evidence/plan97-P97-B-FREEZE-2.json, plan97-P97-B-AFTER-POPUP-FOCUS.json)
 *          caught the panel's page on screen with `document.hasFocus()` false after a Steam box or the menu
 *          closing; Down from the question box then moved the page's focus to Ask while the ring stayed on the box,
 *          press after press. This mounts the real ask bar inside a page in that state (lostFocusPanel.tsx) and
 *          presses the D-pad the way Steam does.
 * Used for: useMainTabAskBarFocus.ts (Down, Left and Right from the box), AskStripSendButtons.tsx (Ask and the X,
 *           with their own nav nodes), lostFocusHop.ts (the plugin-log line).
 * Solves: In the model, as on the Deck, a plain `focus()` on a page without focus leaves the ring where it was;
 *         Steam's own move and its transfer move it. So every press below must either reach its stop by Steam's
 *         transfer or decline, letting Steam's own step move the ring; and the page's focus and the ring must
 *         agree afterwards. With the page's focus present, the routes are the ones the strip test pins
 *         (MainTab.askStrip.deck.test.tsx).
 * Does not: Prove the Deck's ring moves: that is row P97-L14-FREEZE. Steam's own step is given by each test
 *           (the next or previous stop along the strip's row, which is how Steam walks a row's children).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { mountPanelPage, type MoveKey, type PanelPage } from "../../../test-harness/lostFocusPanel";
import { getRpcCallLog, resetFakeDeckyRpc } from "../../../test-harness/fakeDeckyRpc";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";
import { LOST_FOCUS_HOP_LOG_TAG } from "../../../shared/dpad/lostFocusHop";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../../test-harness/lostFocusPanel");
  return {
    ...stubs,
    Focusable: withPanelNav(stubs.Focusable),
    TextField: withPanelNav(stubs.TextField),
    Button: withPanelNav(stubs.Button),
  };
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
    askMode: "strategy",
    onAskModeChange: vi.fn(),
    ...overrides,
  };
}

let page: PanelPage;

function mount(overrides: Partial<MainTabUnifiedAskBarProps> = {}) {
  const view = render(<MainTabUnifiedAskBar {...buildProps(overrides)} />, { container: page.host });
  /* Decky stamps tabindex on what Steam navigates; the stub does not, so give the box its own. */
  const box = page.host.querySelector<HTMLElement>('[data-decky-ui="TextField"]')!;
  box.setAttribute("tabindex", "0");
  return { ...view, box };
}

function box(): HTMLElement {
  return page.host.querySelector<HTMLElement>('[data-decky-ui="TextField"]')!;
}
function press(key: MoveKey) {
  let out: "claimed" | "declined" = "declined";
  act(() => {
    out = page.press(key);
  });
  return out;
}

/** Plugin-log lines this file's hops wrote. */
function hopLogLines(): Array<Record<string, unknown>> {
  return getRpcCallLog()
    .filter((c) => c.method === "dbg_fe_log" && c.args[0] === LOST_FOCUS_HOP_LOG_TAG)
    .map((c) => c.args[1] as Record<string, unknown>);
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetNavFocusRegistry();
  page = mountPanelPage();
});
afterEach(() => {
  cleanup();
  page.remove();
  document.body.innerHTML = "";
});

describe("the plugin log records every hop made while the page lacks focus (plan 97, L14 commit 1)", () => {
  it("writes one dpad.lostFocusHop line for Down from the box with the page's focus gone, saying whether the ring followed", () => {
    mount();
    act(() => page.steamMove(box()));
    page.setFocused(false);

    press("onMoveDown");

    const lines = hopLogLines();
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const last = lines[lines.length - 1]!;
    expect(typeof last.hop).toBe("string");
    expect(typeof last.followed).toBe("boolean");
    expect(["plain", "transfer"]).toContain(last.via);
  });

  it("writes nothing while the page has its focus", () => {
    mount();
    act(() => page.steamMove(box()));

    press("onMoveDown");
    press("onMoveLeft");

    expect(hopLogLines()).toEqual([]);
  });
});
