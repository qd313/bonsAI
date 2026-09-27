import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callDeckyWithTimeout } from "../utils/deckyCall";
import type { SteamParentalSnapshot } from "../utils/steamParental";
import { effectiveCapabilities, useKidsLock } from "./useKidsLock";

vi.mock("../utils/deckyCall", () => ({
  callDeckyWithTimeout: vi.fn(async () => ({ ok: true })),
}));

type Listener = (snapshot: SteamParentalSnapshot | undefined) => void;

let latestListener: Listener | undefined;
let unsubCount = 0;

vi.mock("../utils/steamParental", () => ({
  subscribeSteamParental: (onChange: Listener) => {
    latestListener = onChange;
    return () => {
      unsubCount += 1;
      latestListener = undefined;
    };
  },
}));

describe("effectiveCapabilities", () => {
  it("returns stored caps when unlocked and all-deny when locked", () => {
    const stored = {
      filesystem_write: true,
      media_library_access: true,
      steam_logs_read: true,
      steam_web_api: true,
      microphone_access: true,
      internet_downloads: true,
    };
    expect(effectiveCapabilities(stored, false)).toEqual(stored);
    expect(effectiveCapabilities(stored, true)).toEqual({
      filesystem_write: false,
      media_library_access: false,
      steam_logs_read: false,
      steam_web_api: false,
      microphone_access: false,
      internet_downloads: false,
    });
  });
});

describe("useKidsLock", () => {
  beforeEach(() => {
    latestListener = undefined;
    unsubCount = 0;
    vi.mocked(callDeckyWithTimeout).mockClear();
    vi.mocked(callDeckyWithTimeout).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    latestListener = undefined;
  });

  it("UNKNOWN leaves lock inactive — fail open", async () => {
    const { result, unmount } = renderHook(() => useKidsLock());
    expect(result.current).toBe(false);
    await act(async () => {
      latestListener?.(undefined);
    });
    expect(result.current).toBe(false);
    unmount();
    expect(unsubCount).toBe(1);
  });

  it("latches on locked true; UNKNOWN after true does not clear; false clears", async () => {
    const { result, unmount } = renderHook(() => useKidsLock());

    await act(async () => {
      latestListener?.({ everEnabled: true, locked: true });
    });
    expect(result.current).toBe(true);
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("set_kids_lock_state", [true]);

    await act(async () => {
      latestListener?.(undefined);
    });
    expect(result.current).toBe(true);

    await act(async () => {
      latestListener?.({ everEnabled: true, locked: false });
    });
    expect(result.current).toBe(false);
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("set_kids_lock_state", [false]);

    unmount();
    expect(unsubCount).toBe(1);
  });

  it("retries push once on failure and keeps frontend lock active", async () => {
    vi.mocked(callDeckyWithTimeout)
      .mockRejectedValueOnce(new Error("rpc down"))
      .mockResolvedValueOnce({ ok: true });

    const { result, unmount } = renderHook(() => useKidsLock());
    await act(async () => {
      latestListener?.({ everEnabled: true, locked: true });
    });
    expect(result.current).toBe(true);
    expect(callDeckyWithTimeout).toHaveBeenCalledTimes(2);
    unmount();
  });
});
