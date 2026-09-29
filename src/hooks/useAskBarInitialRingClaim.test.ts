/**
 * Title: Ask bar ring claim — a reopen over a game without the panel's focus
 * Purpose: Pin that reopening Quick Access asks the panel's own window for the browser's focus when
 *          it came back without it, and does nothing at all when it came back with it.
 * Used for: useAskBarInitialRingClaim's reopen half.
 * Solves: Plan 76, measured on the Deck 2026-09-29 (docs/test-evidence/plan76-P76-TRAP-SPLIT.json).
 *         The plugin stays mounted while Quick Access is closed, so the mount-time claim never runs
 *         on a reopen. Over a running game, three reopens of six came back with
 *         `document.hasFocus()` false; each of those split Steam's ring from the page's focus on a
 *         later press, and no press or reopen fixed it until the game was closed.
 * Does not: Prove the browser grants the focus on the Deck — only a device run can.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAskBarInitialRingClaim } from "./useAskBarInitialRingClaim";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { rememberUiDocument, resetUiDocument } from "../utils/uiDocument";

type PanelState = { visible: boolean; focused: boolean };

function mountPanelDocument(state: PanelState) {
  const doc = document.implementation.createHTMLDocument("qam");
  const win = { focus: vi.fn() };
  Object.defineProperty(doc, "defaultView", { value: win, configurable: true });
  Object.defineProperty(doc, "visibilityState", {
    get: () => (state.visible ? "visible" : "hidden"),
    configurable: true,
  });
  doc.hasFocus = vi.fn(() => state.focused);
  rememberUiDocument(doc.body);
  return { doc, win };
}

/** Quick Access shown again: the page turns visible and says so. */
function reopen(doc: Document, state: PanelState) {
  state.visible = true;
  act(() => {
    doc.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("useAskBarInitialRingClaim on a Quick Access reopen (plan 76)", () => {
  let state: PanelState;

  beforeEach(() => {
    vi.useFakeTimers();
    resetNavFocusRegistry();
    resetUiDocument();
    // Mounted while Quick Access was open, then closed; the plugin stays mounted in between.
    state = { visible: false, focused: false };
  });

  afterEach(() => {
    vi.useRealTimers();
    resetUiDocument();
  });

  it("asks the panel's own window for focus when the reopen came back without it", () => {
    const { doc, win } = mountPanelDocument(state);
    renderHook(() => useAskBarInitialRingClaim());

    reopen(doc, state);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(win.focus).toHaveBeenCalledTimes(1);
  });

  it("does nothing at all when the reopen came back with focus, the common case", () => {
    const { doc, win } = mountPanelDocument(state);
    renderHook(() => useAskBarInitialRingClaim());

    state.focused = true;
    reopen(doc, state);
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(win.focus).not.toHaveBeenCalled();
  });

  it("does nothing when the page turns hidden", () => {
    const { doc, win } = mountPanelDocument(state);
    renderHook(() => useAskBarInitialRingClaim());

    state.visible = false;
    act(() => {
      doc.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(2000);
    });

    expect(win.focus).not.toHaveBeenCalled();
  });

  it("stops asking once the focus has arrived", () => {
    const { doc, win } = mountPanelDocument(state);
    renderHook(() => useAskBarInitialRingClaim());

    reopen(doc, state);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(win.focus).toHaveBeenCalledTimes(1);

    state.focused = true;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(win.focus).toHaveBeenCalledTimes(1);
  });

  it("gives up after a few tries if the focus never arrives", () => {
    const { doc, win } = mountPanelDocument(state);
    renderHook(() => useAskBarInitialRingClaim());

    reopen(doc, state);
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(win.focus.mock.calls.length).toBeGreaterThan(0);
    expect(win.focus.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("stops if Quick Access closes again before the beat", () => {
    const { doc, win } = mountPanelDocument(state);
    renderHook(() => useAskBarInitialRingClaim());

    reopen(doc, state);
    state.visible = false;
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(win.focus).not.toHaveBeenCalled();
  });

  it("stops listening once the bar unmounts", () => {
    const { doc, win } = mountPanelDocument(state);
    const view = renderHook(() => useAskBarInitialRingClaim());
    view.unmount();

    reopen(doc, state);
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(win.focus).not.toHaveBeenCalled();
  });
});
