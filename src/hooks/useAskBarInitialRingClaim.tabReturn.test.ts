/**
 * Title: Ask bar ring claim -- coming back to the Decky tab from another Quick Access tab
 * Purpose: Pin that after the plugin's pane is shown again, the ring goes to the question box the
 *          first time it lands on Decky's header (the back arrow), and never takes it from the tab
 *          icon column or from a person who walks there later on purpose. Tests sit at the level
 *          the Deck check looks at: the ring is on a non-plugin element and the transfer to the
 *          question box is (or is not) requested.
 * Used for: useAskBarInitialRingClaim's tab-return half.
 * Solves: Plan 81, measured on the Deck 2026-10-03 (docs/test-evidence/plan81-P81-LOOK-QAM-TAB-SWITCH.json):
 *         six tab switches away and back, six times the ring came back on Decky's back arrow. A tab
 *         switch fires no visibility event (the panel's page stays visible; the plugin's pane just
 *         goes to width 0 and back), so the plugin never tried to claim the ring.
 * Does not: Prove Steam's size change reaches the observer on the Deck -- only a device run can.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAskBarInitialRingClaim } from "./useAskBarInitialRingClaim";
import {
  clearModalReturnFocus,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { rememberUiDocument, resetUiDocument } from "../utils/uiDocument";

type Callback = (entries: { contentRect: { width: number; height: number } }[]) => void;

/** A panel page shaped like Quick Access: Decky's back arrow above the plugin's own pane. */
function mountPanel() {
  const doc = document.implementation.createHTMLDocument("qam");
  // Quick Access: a column of tab icons, and next to it the pane (Steam's id) holding Decky's
  // header with its back arrow above the plugin's own scope.
  const tabIcon = doc.createElement("div");
  tabIcon.id = "quickaccess_tab_999";
  const pane = doc.createElement("div");
  pane.id = "quickaccess_content_999";
  const backArrow = doc.createElement("button");
  backArrow.className = "DialogButton";
  const scope = doc.createElement("div");
  scope.className = "bonsai-scope";
  const chip = doc.createElement("button");
  scope.appendChild(chip);
  pane.append(backArrow, scope);
  doc.body.append(tabIcon, pane);

  let callback: Callback = () => {};
  class FakeObserver {
    constructor(cb: Callback) {
      callback = cb;
    }
    observe = vi.fn();
    /* A disconnected observer delivers nothing more. */
    disconnect = vi.fn(() => {
      callback = () => {};
    });
  }
  const win = { focus: vi.fn(), ResizeObserver: FakeObserver };
  Object.defineProperty(doc, "defaultView", { value: win, configurable: true });
  Object.defineProperty(doc, "visibilityState", { get: () => "visible", configurable: true });
  doc.hasFocus = vi.fn(() => true);
  rememberUiDocument(doc.body);

  const setSize = (width: number, height = width === 0 ? 0 : 454) =>
    act(() => callback([{ contentRect: { width, height } }]));
  /** Steam's ring marker on one element, none elsewhere. */
  const putRingOn = (el: HTMLElement | null) => {
    doc.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
    el?.classList.add("gpfocus");
  };
  const panel = { doc, tabIcon, backArrow, chip, setSize, putRingOn };
  lastPanel = panel;
  return panel;
}

/** The panel the current test built: a successful transfer puts the ring on the question box. */
let lastPanel: { putRingOn: (el: HTMLElement | null) => void; chip: HTMLElement } | null = null;

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("useAskBarInitialRingClaim on a return from another Quick Access tab (plan 81)", () => {
  let takeFocus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetNavFocusRegistry();
    resetUiDocument();
    clearModalReturnFocus();
    takeFocus = vi.fn(() => {
      lastPanel?.putRingOn(lastPanel.chip);
      return true;
    });
    registerNavFocus("unified-input", { current: { TakeFocus: takeFocus } });
  });

  afterEach(() => {
    vi.useRealTimers();
    resetUiDocument();
    clearModalReturnFocus();
  });

  /** Mounted, shown once, past the mount claim, with the transfer spy cleared. */
  function settle() {
    const p = mountPanel();
    const view = renderHook(() => useAskBarInitialRingClaim());
    p.setSize(300);
    advance(2000);
    takeFocus.mockClear();
    return { p, view };
  }
  /** Help tab shown, then the Decky tab again with the ring on the tab icon. */
  function comeBack(p: ReturnType<typeof mountPanel>) {
    p.setSize(0);
    p.putRingOn(p.tabIcon);
    p.setSize(300);
  }

  it("waits while the ring rests on the tab icon, then takes it when it enters on the back arrow", () => {
    const { p } = settle();
    comeBack(p);

    advance(2000); // resting on the Decky tab icon: the person may press Down or Right
    expect(takeFocus).not.toHaveBeenCalled();

    p.putRingOn(p.backArrow); // Right from the icon: Steam's own landing
    advance(300);

    expect(takeFocus).toHaveBeenCalledTimes(1);
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  it("does it on every return of five in a row", () => {
    const { p } = settle();

    for (let i = 0; i < 5; i += 1) {
      comeBack(p);
      advance(500);
      p.putRingOn(p.backArrow);
      advance(300);
    }

    expect(takeFocus).toHaveBeenCalledTimes(5);
  });

  it("takes it once, then lets a person walk Up to the back arrow on purpose", () => {
    const { p } = settle();
    comeBack(p);
    p.putRingOn(p.backArrow);
    advance(300);
    expect(takeFocus).toHaveBeenCalledTimes(1);

    p.putRingOn(p.chip); // the box has the ring, and the person goes Up and out
    advance(300);
    p.putRingOn(p.backArrow);
    advance(5000);

    expect(takeFocus).toHaveBeenCalledTimes(1);
  });

  it("never acts on the back arrow when no return came before it", () => {
    const { p } = settle();

    p.putRingOn(p.chip);
    advance(300);
    p.putRingOn(p.backArrow);
    advance(5000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("stops watching after a plugin control got the ring first", () => {
    const { p } = settle();
    comeBack(p);
    p.putRingOn(p.chip);
    advance(300);

    p.putRingOn(p.backArrow);
    advance(5000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("stops watching once the window ends", () => {
    const { p } = settle();
    comeBack(p);
    advance(11000); // resting on the tab icon the whole time

    p.putRingOn(p.backArrow);
    advance(2000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("does not take the ring while a box (modal) is open", () => {
    const { p } = settle();
    rememberModalReturnFocus("plugin-help");
    comeBack(p);
    p.putRingOn(p.backArrow);
    advance(1000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("stops when the pane hides again before the ring enters", () => {
    const { p } = settle();
    comeBack(p);
    advance(200);
    p.setSize(0); // sweeping on down the tab icons
    p.putRingOn(p.backArrow);
    advance(2000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("does nothing on a plain resize while shown", () => {
    const { p } = settle();

    p.putRingOn(p.backArrow);
    p.setSize(280);
    p.setSize(300);
    advance(2000);

    expect(takeFocus).not.toHaveBeenCalled();
  });

  it("keeps trying when the question box's nav node is not ready yet", () => {
    const { p } = settle();
    takeFocus.mockImplementationOnce(() => false).mockImplementationOnce(() => false);
    comeBack(p);
    p.putRingOn(p.backArrow);
    advance(2000);

    expect(takeFocus).toHaveBeenCalledTimes(3);
  });

  it("stops watching once the bar unmounts", () => {
    const { p, view } = settle();
    comeBack(p);
    view.unmount();

    p.putRingOn(p.backArrow);
    advance(2000);

    expect(takeFocus).not.toHaveBeenCalled();
  });
});
