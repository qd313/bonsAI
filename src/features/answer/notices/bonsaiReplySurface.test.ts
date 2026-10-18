/**
 * Title: Reply surface flag tests
 * Purpose: Pin that the "is the reply on screen" flag is cleared when the panel unmounts.
 * Used for: bonsaiReplySurface.ts regression coverage.
 * Solves: On the Deck 2026-09-23 (plan 64) the "Reply ready" notification never appeared after the
 *         menu closed: the panel unmounted with the flag still true, so a background reply read as
 *         already seen.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

vi.mock("@decky/ui", () => ({ Navigation: {}, QuickAccessTab: {} }));

import {
  isReplySurfaceVisible,
  resetReplySurfaceState,
  useReplySurfaceVisibility,
} from "./bonsaiReplySurface";

describe("useReplySurfaceVisibility", () => {
  afterEach(() => {
    cleanup();
    resetReplySurfaceState();
  });

  it("follows the panel while it is mounted", () => {
    const { rerender } = renderHook(({ visible }) => useReplySurfaceVisibility(visible), {
      initialProps: { visible: true },
    });
    expect(isReplySurfaceVisible()).toBe(true);

    rerender({ visible: false });
    expect(isReplySurfaceVisible()).toBe(false);
  });

  it("clears the flag when the panel unmounts while showing the reply", () => {
    const { unmount } = renderHook(() => useReplySurfaceVisibility(true));
    expect(isReplySurfaceVisible()).toBe(true);

    unmount();
    expect(isReplySurfaceVisible()).toBe(false);
  });
});
