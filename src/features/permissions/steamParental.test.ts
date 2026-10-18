import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STEAM_PARENTAL_INITIAL_TIMEOUT_MS, subscribeSteamParental } from "./steamParental";

type ParentalPayload = {
  ever_enabled: boolean;
  locked: boolean;
  settings?: ArrayBuffer;
  strPlaintextPassword?: string;
};

type ParentalStub = {
  RegisterForParentalSettingsChanges: ReturnType<typeof vi.fn>;
  _fire: (payload: ParentalPayload) => void;
  _liveCount: () => number;
};

function installParentalStub(opts?: {
  syncFire?: ParentalPayload | null;
  throwAfterSyncFire?: boolean;
  throwOnRegister?: boolean;
}): ParentalStub {
  let listener: ((p: ParentalPayload) => void) | undefined;
  let live = 0;

  const RegisterForParentalSettingsChanges = vi.fn((cb: (p: ParentalPayload) => void) => {
    if (opts?.throwOnRegister) {
      throw new Error("register failed");
    }
    listener = cb;
    live += 1;
    if (opts?.syncFire) {
      cb(opts.syncFire);
    }
    if (opts?.throwAfterSyncFire) {
      throw new Error("register threw after fire");
    }
    return {
      unregister: () => {
        live -= 1;
        listener = undefined;
      },
    };
  });

  Object.defineProperty(globalThis, "SteamClient", {
    value: {
      URL: { ExecuteSteamURL: vi.fn() },
      Parental: { RegisterForParentalSettingsChanges },
    },
    writable: true,
    configurable: true,
  });

  return {
    RegisterForParentalSettingsChanges,
    _fire: (payload) => listener?.(payload),
    _liveCount: () => live,
  };
}

function clearParental(): void {
  Object.defineProperty(globalThis, "SteamClient", {
    value: {
      URL: { ExecuteSteamURL: vi.fn() },
    },
    writable: true,
    configurable: true,
  });
}

describe("subscribeSteamParental", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearParental();
    vi.useRealTimers();
  });

  it("delivers UNKNOWN immediately when Parental API is absent", () => {
    clearParental();
    const onChange = vi.fn();
    const unsub = subscribeSteamParental(onChange);
    expect(onChange).toHaveBeenCalledWith(undefined);
    unsub();
  });

  it("handles sync fire inside register without leaking", () => {
    const stub = installParentalStub({
      syncFire: { ever_enabled: true, locked: true },
    });
    const onChange = vi.fn();
    const unsub = subscribeSteamParental(onChange);
    expect(onChange).toHaveBeenCalledWith({ everEnabled: true, locked: true });
    expect(stub._liveCount()).toBe(1);
    unsub();
    expect(stub._liveCount()).toBe(0);
  });

  it("handles async fire and locked true→false→true", () => {
    const stub = installParentalStub();
    const onChange = vi.fn();
    const unsub = subscribeSteamParental(onChange, { initialTimeoutMs: 5000 });
    expect(onChange).not.toHaveBeenCalled();
    stub._fire({ ever_enabled: true, locked: true });
    stub._fire({ ever_enabled: true, locked: false });
    stub._fire({ ever_enabled: true, locked: true });
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([
      { everEnabled: true, locked: true },
      { everEnabled: true, locked: false },
      { everEnabled: true, locked: true },
    ]);
    unsub();
    expect(stub._liveCount()).toBe(0);
  });

  it("delivers UNKNOWN when the callback never fires", () => {
    installParentalStub();
    const onChange = vi.fn();
    const unsub = subscribeSteamParental(onChange, { initialTimeoutMs: 100 });
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onChange).toHaveBeenCalledWith(undefined);
    unsub();
  });

  it("uses the default initial timeout constant", () => {
    installParentalStub();
    const onChange = vi.fn();
    const unsub = subscribeSteamParental(onChange);
    vi.advanceTimersByTime(STEAM_PARENTAL_INITIAL_TIMEOUT_MS - 1);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledWith(undefined);
    unsub();
  });

  it("delivers UNKNOWN when register throws before any fire", () => {
    installParentalStub({ throwOnRegister: true });
    const onChange = vi.fn();
    const unsub = subscribeSteamParental(onChange);
    expect(onChange).toHaveBeenCalledWith(undefined);
    unsub();
  });

  it("keeps the sync snapshot when register throws after firing", () => {
    installParentalStub({
      syncFire: { ever_enabled: false, locked: true },
      throwAfterSyncFire: true,
    });
    const onChange = vi.fn();
    const unsub = subscribeSteamParental(onChange);
    expect(onChange).toHaveBeenCalledWith({ everEnabled: false, locked: true });
    // No unregister handle — unsubscribe must not throw.
    expect(() => unsub()).not.toThrow();
  });

  it("does not deliver after unsubscribe", () => {
    const stub = installParentalStub();
    const onChange = vi.fn();
    const unsub = subscribeSteamParental(onChange, { initialTimeoutMs: 5000 });
    unsub();
    stub._fire({ ever_enabled: true, locked: true });
    vi.advanceTimersByTime(5000);
    expect(onChange).not.toHaveBeenCalled();
    expect(stub._liveCount()).toBe(0);
  });
});
