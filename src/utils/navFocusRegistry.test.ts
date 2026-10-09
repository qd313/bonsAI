import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  registerNavFocus,
  unregisterNavFocus,
  resetNavFocusRegistry,
  takeNavFocus,
  type NavRefHolder,
} from "./navFocusRegistry";

/** Stands in for the object Steam assigns to a `navRef`. */
function steamNavRef(takeFocus: (gamepad?: boolean) => unknown): NavRefHolder {
  return { current: { TakeFocus: takeFocus } };
}

describe("nav focus registry", () => {
  beforeEach(() => {
    resetNavFocusRegistry();
  });

  it("hands focus to a registered target", () => {
    const takeFocus = vi.fn(() => true);
    registerNavFocus("session-context-strip", steamNavRef(takeFocus));

    expect(takeNavFocus("session-context-strip")).toBe(true);
    // `true` marks the move as gamepad-sourced, which is what a D-pad press is.
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  it("reports false for a target that was never registered", () => {
    expect(takeNavFocus("settings-results-card")).toBe(false);
  });

  /*
   * The case that matters most: Decky's types do not declare `navRef`, so if the prop ever stops
   * being forwarded, `current` stays null. That must read as "cannot move" so the caller falls
   * through to its DOM fallback instead of reporting a move that did not happen — reporting a
   * phantom move is precisely what made three fixes look correct while nothing moved on device.
   */
  it("reports false when Decky never populated the ref", () => {
    registerNavFocus("session-context-strip", { current: null });

    expect(takeNavFocus("session-context-strip")).toBe(false);
  });

  it("reports false when the ref holds something without TakeFocus", () => {
    registerNavFocus("session-context-strip", { current: {} });
    expect(takeNavFocus("session-context-strip")).toBe(false);
  });

  it("treats an explicit false from Steam as a refused move", () => {
    registerNavFocus("session-context-strip", steamNavRef(() => false));
    expect(takeNavFocus("session-context-strip")).toBe(false);
  });

  it("treats a void return as success, since Steam's wrapper does not always return", () => {
    registerNavFocus("session-context-strip", steamNavRef(() => undefined));
    expect(takeNavFocus("session-context-strip")).toBe(true);
  });

  it("survives a target that throws", () => {
    registerNavFocus("session-context-strip", steamNavRef(() => {
      throw new Error("detached nav node");
    }));

    expect(() => takeNavFocus("session-context-strip")).not.toThrow();
    expect(takeNavFocus("session-context-strip")).toBe(false);
  });

  it("forgets a target on unmount", () => {
    const row = steamNavRef(() => true);
    registerNavFocus("tab-bar", row);
    expect(takeNavFocus("tab-bar")).toBe(true);

    // The unmount cleanup names the holder it registered, so it can only drop its own entry.
    unregisterNavFocus("tab-bar", row);

    expect(takeNavFocus("tab-bar")).toBe(false);
  });
});
