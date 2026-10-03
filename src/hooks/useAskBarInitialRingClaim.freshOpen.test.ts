/**
 * Title: Ask bar ring claim -- a fresh close-and-open of Quick Access
 * Purpose: Pin that when Steam parks the ring on the plugin's own tab bar as the panel opens, the
 *          ring is still handed to the question box -- and that a person who deliberately uses the
 *          tab bar later, or a Main tab rebuilt by a tab switch, is left alone. Tests sit at the
 *          level the Deck check looks at: the ring after an open.
 * Used for: useAskBarInitialRingClaim and askBarRingWatch.
 * Solves: Plan 81, measured on the Deck 2026-10-03 (docs/test-evidence/plan81-P81-TAB-SWITCH-RING-reopen.json):
 *         three fresh close-and-opens, three times the ring sat on the plugin's tab bar (y 48 to 64)
 *         and stayed there. The tab bar is a plugin control, so the one-time claim at mount, which
 *         yields to any owner, left it there.
 * Does not: Prove the order Steam places the ring in on the Deck -- only a device run can.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAskBarInitialRingClaim } from "./useAskBarInitialRingClaim";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { rememberUiDocument, resetUiDocument } from "../utils/uiDocument";

/** Quick Access: tab icon column, and the pane holding Decky's header and the plugin's scope. */
function mountPanel(visible = true) {
  const state = { visible };
  const doc = document.implementation.createHTMLDocument("qam");
  const pane = doc.createElement("div");
  pane.id = "quickaccess_content_999";
  const scope = doc.createElement("div");
  scope.className = "bonsai-scope";
  const tabBar = doc.createElement("div");
  tabBar.className = "bonsai-tab-bar";
  const retry = doc.createElement("button");
  const box = doc.createElement("input");
  scope.append(tabBar, retry, box);
  pane.append(scope);
  doc.body.append(pane);

  const win = { focus: vi.fn() };
  Object.defineProperty(doc, "defaultView", { value: win, configurable: true });
  Object.defineProperty(doc, "visibilityState", {
    get: () => (state.visible ? "visible" : "hidden"),
    configurable: true,
  });
  doc.hasFocus = vi.fn(() => true);
  rememberUiDocument(doc.body);

  const putRingOn = (el: HTMLElement | null) => {
    doc.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
    el?.classList.add("gpfocus");
  };
  const setVisible = (v: boolean) => {
    state.visible = v;
    act(() => {
      doc.dispatchEvent(new Event("visibilitychange"));
    });
  };
  return { doc, tabBar, retry, box, putRingOn, setVisible };
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("useAskBarInitialRingClaim on a fresh open (plan 81)", () => {
  let takeFocus: ReturnType<typeof vi.fn>;
  let panel: ReturnType<typeof mountPanel>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetNavFocusRegistry();
    resetUiDocument();
    // A successful transfer puts Steam's ring on the question box.
    takeFocus = vi.fn(() => {
      panel.putRingOn(panel.box);
      return true;
    });
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });
  });

  afterEach(() => {
    vi.useRealTimers();
    resetUiDocument();
  });

  it("moves the ring off the tab bar when Quick Access is closed and opened again", () => {
    panel = mountPanel();
    renderHook(() => useAskBarInitialRingClaim());
    advance(2000);
    panel.setVisible(false); // closed; the plugin stays mounted
    advance(1000);
    takeFocus.mockClear();

    panel.setVisible(true); // opened again
    panel.putRingOn(panel.tabBar); // Steam's first focusable
    advance(500);

    expect(takeFocus).toHaveBeenCalledTimes(1);
  });

  it("moves the ring off the tab bar when the plugin was built fresh with the ring already there", () => {
    panel = mountPanel();
    panel.putRingOn(panel.tabBar);
    renderHook(() => useAskBarInitialRingClaim());
    advance(500);

    expect(takeFocus).toHaveBeenCalled();
    expect(panel.doc.querySelector(".gpfocus")).toBe(panel.box);
  });

  it("does the same on every open of three in a row", () => {
    panel = mountPanel();
    renderHook(() => useAskBarInitialRingClaim());
    advance(2000);

    for (let i = 0; i < 3; i += 1) {
      panel.setVisible(false);
      takeFocus.mockClear();
      panel.setVisible(true);
      panel.putRingOn(panel.tabBar);
      advance(500);
      expect(takeFocus).toHaveBeenCalledTimes(1);
    }
  });

  it("leaves a person alone who goes Up to the tab bar after the ring reached the box", () => {
    panel = mountPanel();
    renderHook(() => useAskBarInitialRingClaim());
    advance(2000);
    panel.setVisible(false);
    panel.setVisible(true);
    panel.putRingOn(panel.tabBar);
    advance(500); // claimed: the ring is on the box
    takeFocus.mockClear();

    panel.putRingOn(panel.tabBar); // the person presses Up, on purpose
    advance(5000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("leaves a person alone who picks tabs on the bar long after the open", () => {
    panel = mountPanel();
    renderHook(() => useAskBarInitialRingClaim());
    advance(2000);
    panel.setVisible(false);
    panel.putRingOn(null);
    takeFocus.mockImplementation(() => false); // the question box's nav node is not ready
    panel.setVisible(true);
    advance(4000);
    takeFocus.mockClear();

    panel.putRingOn(panel.tabBar); // by now it is the person's own doing
    advance(5000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("leaves a plugin control alone, such as a Retry button Steam restored", () => {
    panel = mountPanel();
    renderHook(() => useAskBarInitialRingClaim());
    advance(2000);
    panel.setVisible(false);
    takeFocus.mockClear();
    panel.setVisible(true);
    panel.putRingOn(panel.retry);
    advance(2000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("leaves the tab bar alone when only the Main tab was rebuilt by a tab switch", () => {
    panel = mountPanel();
    const first = renderHook(() => useAskBarInitialRingClaim());
    advance(2000);
    first.unmount(); // the person switched to another plugin tab with the strip ...
    takeFocus.mockClear();

    panel.putRingOn(panel.tabBar); // ... and the ring is on the bar
    renderHook(() => useAskBarInitialRingClaim()); // Main is built again, same plugin build
    advance(5000);

    expect(takeFocus).not.toHaveBeenCalled();
  });
});
