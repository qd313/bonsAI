/**
 * Title: Nav focus registry — the panel's window focus before a transfer
 * Purpose: Pin that `takeNavFocus` asks the panel's own window for the browser's focus first, and
 *          only when the panel is on screen without it.
 * Used for: navFocusRegistry's `takeNavFocus` and `refocusPanelWindowIfLost`.
 * Solves: Plan 76, measured on the Deck 2026-09-29 with a game running
 *         (docs/test-evidence/plan76-P76-TRAP-SPLIT.json, plan76-P76-TRAP-REPRO.json). When Quick
 *         Access reopened without the browser's focus on the panel (`document.hasFocus()` false),
 *         the plugin's own plain `focus()` hops moved the page's focus while Steam's ring stayed
 *         behind, press after press, until the game was closed. Steam's own transfer was the one
 *         move that still kept the two together; this makes it also give the panel its focus back.
 * Does not: Prove the browser grants that focus on the Deck — only a device run can.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  refocusPanelWindowIfLost,
  registerNavFocus,
  resetNavFocusRegistry,
  takeNavFocus,
  type NavRefHolder,
} from "./navFocusRegistry";
import { rememberUiDocument, resetUiDocument } from "./uiDocument";

type PanelState = { visible: boolean; focused: boolean };

/** Stand-in for the Quick Access page: its own document, its own window, stubbed focus reads. */
function mountPanelDocument(state: PanelState) {
  const doc = document.implementation.createHTMLDocument("qam");
  const win = { focus: vi.fn() };
  Object.defineProperty(doc, "defaultView", { value: win, configurable: true });
  Object.defineProperty(doc, "visibilityState", {
    get: () => (state.visible ? "visible" : "hidden"),
    configurable: true,
  });
  const hasFocus = vi.fn(() => state.focused);
  doc.hasFocus = hasFocus;
  rememberUiDocument(doc.body);
  return { win, hasFocus };
}

function steamNavRef(takeFocus: (gamepad?: boolean) => unknown): NavRefHolder {
  return { current: { TakeFocus: takeFocus } };
}

describe("takeNavFocus and the panel's own window focus (plan 76)", () => {
  let state: PanelState;

  beforeEach(() => {
    resetNavFocusRegistry();
    resetUiDocument();
    state = { visible: true, focused: true };
  });

  afterEach(() => {
    resetUiDocument();
  });

  it("with focus already on the panel, asks nothing of the window and transfers as before", () => {
    const { win } = mountPanelDocument(state);
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", steamNavRef(takeFocus));

    expect(takeNavFocus("unified-input")).toBe(true);

    expect(win.focus).not.toHaveBeenCalled();
    expect(takeFocus).toHaveBeenCalledTimes(1);
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  it("without focus, asks the panel's own window first, then transfers", () => {
    state.focused = false;
    const { win } = mountPanelDocument(state);
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", steamNavRef(takeFocus));

    expect(takeNavFocus("unified-input")).toBe(true);

    expect(win.focus).toHaveBeenCalledTimes(1);
    expect(takeFocus).toHaveBeenCalledTimes(1);
    // The order is the point: Steam's transfer should run once the panel has asked for focus.
    expect(win.focus.mock.invocationCallOrder[0]).toBeLessThan(takeFocus.mock.invocationCallOrder[0]);
  });

  it("does not touch the window while the panel is not on screen", () => {
    state.focused = false;
    state.visible = false;
    const { win } = mountPanelDocument(state);
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", steamNavRef(takeFocus));

    expect(takeNavFocus("unified-input")).toBe(true);

    expect(win.focus).not.toHaveBeenCalled();
    expect(takeFocus).toHaveBeenCalledTimes(1);
  });

  it("does not touch the window when there is nothing to transfer to", () => {
    state.focused = false;
    const { win } = mountPanelDocument(state);
    registerNavFocus("unified-input", { current: null });

    expect(takeNavFocus("unified-input")).toBe(false);
    expect(takeNavFocus("chat-slot-row")).toBe(false);

    expect(win.focus).not.toHaveBeenCalled();
  });

  it("a window that refuses still lets the transfer run", () => {
    state.focused = false;
    const { win } = mountPanelDocument(state);
    win.focus.mockImplementation(() => {
      throw new Error("focus refused");
    });
    const takeFocus = vi.fn(() => true);
    registerNavFocus("unified-input", steamNavRef(takeFocus));

    expect(takeNavFocus("unified-input")).toBe(true);
    expect(takeFocus).toHaveBeenCalledTimes(1);
  });

  it("refocusPanelWindowIfLost reports whether it asked", () => {
    const { win } = mountPanelDocument(state);
    expect(refocusPanelWindowIfLost()).toBe(false);
    expect(win.focus).not.toHaveBeenCalled();

    state.focused = false;
    expect(refocusPanelWindowIfLost()).toBe(true);
    expect(win.focus).toHaveBeenCalledTimes(1);

    state.visible = false;
    expect(refocusPanelWindowIfLost()).toBe(false);
    expect(win.focus).toHaveBeenCalledTimes(1);
  });
});
