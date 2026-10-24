/**
 * Title: Nav focus registry — remount ordering
 * Purpose: Pin that a departing component cannot delete a live component's registration.
 * Used for: navFocusRegistry, whose entries survive a panel remount because the Map is module-level.
 * Solves: The registry's ids are fixed strings, not per-mount. Every caller registers in a
 *         `useEffect` and unregisters in its cleanup, and React does not promise the old
 *         instance's cleanup runs before the new instance's setup. When it does not — a panel
 *         reopen, a tab switch, a remount under a new key, StrictMode's double-invoke — the old
 *         unconditional delete wiped the entry belonging to the component actually on screen.
 *         `takeNavFocus` then reports false, the caller falls through to a plain cross-container
 *         `focus()`, which moves activeElement but not Steam's ring while still consuming the
 *         press: the press arrives and nothing moves. That is the recorded signature of the
 *         "Down stops half way and the Ask button cannot be reached" bug, and it explains why
 *         reopening the panel does not clear it while restarting the loader does.
 * Does not: Prove the device symptom is gone — that needs a device run over time, since the bug
 *           did not reproduce on demand on 2026-09-05 (three attempts, plan 35 § 7).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerNavFocus,
  unregisterNavFocus,
  takeNavFocus,
  resetNavFocusRegistry,
  type NavRefHolder,
} from "./navFocusRegistry";

/** A holder shaped like the one Steam fills in, which reports a successful transfer. */
function mountedHolder(): NavRefHolder & { takeFocusCalls: number } {
  const holder = {
    takeFocusCalls: 0,
    current: {
      TakeFocus: () => {
        holder.takeFocusCalls += 1;
        return true;
      },
    },
  };
  return holder;
}

describe("navFocusRegistry — a departing component must not unregister the live one", () => {
  beforeEach(() => {
    resetNavFocusRegistry();
  });

  it("keeps the new instance's registration when the old instance cleans up afterwards", () => {
    const oldInstance = mountedHolder();
    const newInstance = mountedHolder();

    // The interleaving React does not rule out: the replacement mounts, and only then does the
    // outgoing instance's effect cleanup run.
    registerNavFocus("unified-input", oldInstance);
    registerNavFocus("unified-input", newInstance);
    unregisterNavFocus("unified-input", oldInstance);

    expect(takeNavFocus("unified-input")).toBe(true);
    expect(newInstance.takeFocusCalls).toBe(1);
    expect(oldInstance.takeFocusCalls).toBe(0);
  });

  it("still drops the registration when the component that owns it unmounts alone", () => {
    const only = mountedHolder();

    registerNavFocus("tab-bar", only);
    unregisterNavFocus("tab-bar", only);

    expect(takeNavFocus("tab-bar")).toBe(false);
    expect(only.takeFocusCalls).toBe(0);
  });

  it("survives a full remount cycle in either order", () => {
    // Cleanup-then-setup, the ordering that always worked.
    const first = mountedHolder();
    const second = mountedHolder();
    registerNavFocus("preset-carousel", first);
    unregisterNavFocus("preset-carousel", first);
    registerNavFocus("preset-carousel", second);
    expect(takeNavFocus("preset-carousel")).toBe(true);
    expect(second.takeFocusCalls).toBe(1);

    // Setup-then-cleanup, the ordering that used to break it.
    const third = mountedHolder();
    registerNavFocus("preset-carousel", third);
    unregisterNavFocus("preset-carousel", second);
    expect(takeNavFocus("preset-carousel")).toBe(true);
    expect(third.takeFocusCalls).toBe(1);
  });

  it("reports false rather than throwing when Steam has not filled the ref in yet", () => {
    const unmounted: NavRefHolder = { current: null };
    registerNavFocus("tab-bar", unmounted);
    expect(takeNavFocus("tab-bar")).toBe(false);
  });
});
