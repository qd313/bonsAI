import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearModalReturnFocus,
  peekModalReturnFocus,
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "./modalReturnFocusRegistry";

function mountButton(): HTMLElement {
  const el = document.createElement("button");
  document.body.appendChild(el);
  return el;
}

describe("modal return-focus registry", () => {
  beforeEach(() => {
    resetModalReturnFocusRegistry();
    document.body.innerHTML = "";
  });

  it("does nothing when no modal was opened", () => {
    expect(restoreModalReturnFocus()).toBe(false);
  });

  it("focuses the control that opened the modal", () => {
    const el = mountButton();
    const focus = vi.spyOn(el, "focus");
    registerModalReturnFocusOwner("plugin-help", el);
    rememberModalReturnFocus("plugin-help");

    expect(restoreModalReturnFocus()).toBe(true);
    expect(focus).toHaveBeenCalled();
  });

  it("leaves focus alone when the opener unmounted while the modal was open", () => {
    const el = mountButton();
    registerModalReturnFocusOwner("plugin-help", el);
    rememberModalReturnFocus("plugin-help");
    registerModalReturnFocusOwner("plugin-help", null); // unmount

    // False, not a throw and not a guess at some other element: focus stays where Decky put it.
    expect(restoreModalReturnFocus()).toBe(false);
  });

  it("consumes the pending id even when it cannot restore", () => {
    rememberModalReturnFocus("ollama-models-hub");
    expect(restoreModalReturnFocus()).toBe(false);
    expect(peekModalReturnFocus()).toBeNull();
  });

  it("does not re-focus on a later unrelated modal close", () => {
    const el = mountButton();
    const focus = vi.spyOn(el, "focus");
    registerModalReturnFocusOwner("plugin-help", el);
    rememberModalReturnFocus("plugin-help");

    restoreModalReturnFocus();
    focus.mockClear();

    // A second close with nothing armed must not resurrect the previous target.
    expect(restoreModalReturnFocus()).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });

  it("restores the control that was actually used, not the last one registered", () => {
    const help = mountButton();
    const hub = mountButton();
    const helpFocus = vi.spyOn(help, "focus");
    const hubFocus = vi.spyOn(hub, "focus");
    registerModalReturnFocusOwner("plugin-help", help);
    registerModalReturnFocusOwner("ollama-models-hub", hub);

    rememberModalReturnFocus("plugin-help");
    restoreModalReturnFocus();

    expect(helpFocus).toHaveBeenCalled();
    expect(hubFocus).not.toHaveBeenCalled();
  });

  it("clearModalReturnFocus disarms a pending restore", () => {
    const el = mountButton();
    const focus = vi.spyOn(el, "focus");
    registerModalReturnFocusOwner("desktop-note-save", el);
    rememberModalReturnFocus("desktop-note-save");

    clearModalReturnFocus();

    expect(restoreModalReturnFocus()).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });

  it("prefers the Decky focusable Panel wrapper when the control has one", () => {
    const panel = document.createElement("div");
    panel.className = "Panel Focusable";
    const inner = document.createElement("button");
    panel.appendChild(inner);
    document.body.appendChild(panel);
    const panelFocus = vi.spyOn(panel, "focus");

    registerModalReturnFocusOwner("character-picker-settings", inner);
    rememberModalReturnFocus("character-picker-settings");
    restoreModalReturnFocus();

    // Decky navigates Panels, not raw buttons; focusing only the <button> misses on Deck.
    expect(panelFocus).toHaveBeenCalled();
  });

  it("survives an element whose focus() throws", () => {
    const el = mountButton();
    vi.spyOn(el, "focus").mockImplementation(() => {
      throw new Error("detached");
    });
    registerModalReturnFocusOwner("plugin-help", el);
    rememberModalReturnFocus("plugin-help");

    expect(() => restoreModalReturnFocus()).not.toThrow();
  });

  it("re-registering after a remount replaces the stale element", () => {
    const first = mountButton();
    registerModalReturnFocusOwner("plugin-help", first);
    registerModalReturnFocusOwner("plugin-help", null);

    const second = mountButton();
    const secondFocus = vi.spyOn(second, "focus");
    const firstFocus = vi.spyOn(first, "focus");
    registerModalReturnFocusOwner("plugin-help", second);

    rememberModalReturnFocus("plugin-help");
    restoreModalReturnFocus();

    expect(secondFocus).toHaveBeenCalled();
    expect(firstFocus).not.toHaveBeenCalled();
  });

  // Both of these lock in fixes for rule violations that shipped in this file from the start.
  // See `AGENTS.md (Decky focus graph)` and the header comment on `focusOwnerById`.

  it("does not rewrite the opener's tabindex", () => {
    const el = mountButton();
    el.setAttribute("tabindex", "0");
    registerModalReturnFocusOwner("plugin-help", el);
    rememberModalReturnFocus("plugin-help");

    restoreModalReturnFocus();

    // It used to stamp tabindex="-1" and never put it back, which takes the control out of Steam's
    // nav graph -- so a picker you closed once could not be navigated onto again.
    expect(el.getAttribute("tabindex")).toBe("0");
  });

  it("reports a miss when Steam's ring stayed somewhere else", () => {
    const ringOwner = document.createElement("div");
    ringOwner.className = "gpfocus";
    document.body.appendChild(ringOwner);

    const el = mountButton();
    registerModalReturnFocusOwner("ollama-models-hub", el);
    rememberModalReturnFocus("ollama-models-hub");

    // The DOM focus call still happens; what changed is that we no longer call that a success.
    // Reporting "claimed" whenever the element merely existed is why two on-device attempts at
    // PICKER-FOCUS-01 both looked like they had worked.
    expect(restoreModalReturnFocus()).toBe(false);
  });

  it("reports a hit when the ring lands on the opener", () => {
    const el = mountButton();
    el.className = "gpfocus";
    registerModalReturnFocusOwner("ollama-models-hub", el);
    rememberModalReturnFocus("ollama-models-hub");

    expect(restoreModalReturnFocus()).toBe(true);
  });

  // Settings -> Data's two confirm-modal openers (plan 32 bug 4): Clear cache... and
  // Clear all data... never armed the registry before, so Steam picked the return focus itself and
  // landed on a hidden tab button (runs/CLEAR-CACHE-01-b and -c).
  it("round-trips the settings-clear-cache id", () => {
    const el = mountButton();
    const focus = vi.spyOn(el, "focus");
    registerModalReturnFocusOwner("settings-clear-cache", el);
    rememberModalReturnFocus("settings-clear-cache");

    expect(restoreModalReturnFocus()).toBe(true);
    expect(focus).toHaveBeenCalled();
  });

  it("round-trips the settings-clear-all-data id", () => {
    const el = mountButton();
    const focus = vi.spyOn(el, "focus");
    registerModalReturnFocusOwner("settings-clear-all-data", el);
    rememberModalReturnFocus("settings-clear-all-data");

    expect(restoreModalReturnFocus()).toBe(true);
    expect(focus).toHaveBeenCalled();
  });

  it("keeps the two settings ids independent", () => {
    const cache = mountButton();
    const clearAll = mountButton();
    const cacheFocus = vi.spyOn(cache, "focus");
    const clearAllFocus = vi.spyOn(clearAll, "focus");
    registerModalReturnFocusOwner("settings-clear-cache", cache);
    registerModalReturnFocusOwner("settings-clear-all-data", clearAll);

    rememberModalReturnFocus("settings-clear-all-data");
    restoreModalReturnFocus();

    expect(clearAllFocus).toHaveBeenCalled();
    expect(cacheFocus).not.toHaveBeenCalled();
  });
});
