/**
 * Title: A settings save that fails is sent again, not forgotten (plan 104, lane B1)
 *
 * Purpose: Pin the first-start fault. A person switched every permission on, the save never reached
 * disk (the back end was down or still starting), and the next press reached a back end whose file
 * said "downloads off". Three ways the screen and the file could stay apart are pinned here: a save
 * that fails and then nothing else changes, a first load that fails (the screen shows defaults and
 * saving is off), and a screen that is rebuilt after a popup, which used to take its own value as
 * "already saved".
 *
 * Does not: prove the Deck; the first-start row does. The back end's refusal and the Install press
 * are in useLocalOllamaSetupFlow.refusalRetry.test.tsx.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";
import { usePluginSettings } from "./usePluginSettings";
import { defaultSettingsFixture } from "../../test-harness/rpcFixtures";
import { dispatchFakeRpc, getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { DEFAULT_CAPABILITIES } from "./bonsaiSettingsSchema";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../plugin-shell/bonsaiSessionSurvival";
import { clearUnsavedSettingsForTests } from "./usePluginSettings";

const saves = () => getRpcCallLog().filter((c) => c.method === "save_settings");
const ON = { ...DEFAULT_CAPABILITIES, internet_downloads: true };

/** Lets the fake timers move without making the screen's own waits hang. */
const later = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

/** The screen has finished its first load (the fake timers are on, so Testing Library's own waiting would hang). */
async function loaded(get: () => { settingsLoaded: boolean }) {
  for (let i = 0; i < 50 && !get().settingsLoaded; i++) await later(5);
  expect(get().settingsLoaded).toBe(true);
}

describe("a settings save that fails is sent again", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    clearUnsavedSettingsForTests();
    clearBonsaiSessionSurvival();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a save that fails once goes out again with no further change on screen", async () => {
    let failures = 1;
    setRpcHandler("save_settings", (...args: unknown[]) => {
      if (failures-- > 0) throw new Error("back end not answering");
      return { ...defaultSettingsFixture(), ...((args[0] as object) ?? {}) };
    });
    const { result, unmount } = renderHook(() => usePluginSettings());
    await loaded(() => result.current);

    act(() => result.current.setCapabilities(ON));
    await later(450); // the automatic save, which fails
    expect(saves()).toHaveLength(1);

    await later(3500); // nothing else changes on screen; the failed change goes out again
    expect(saves()).toHaveLength(2);
    expect(saves()[1].args[0]).toEqual({ capabilities: ON });
    unmount();
  });

  it("a first load that fails is tried again, and what the person switched on meanwhile is then saved", async () => {
    let loads = 0;
    setRpcHandler("load_settings", () => {
      if (loads++ === 0) throw new Error("back end not up yet");
      return defaultSettingsFixture();
    });
    const { result, unmount } = renderHook(() => usePluginSettings());
    await loaded(() => result.current);
    expect(result.current.capabilities.internet_downloads).toBe(false);

    act(() => result.current.setCapabilities(ON));
    await later(450);
    expect(saves()).toHaveLength(0); // saving stays off until a load has worked: defaults must not overwrite the file

    await later(3500); // the second load works
    await later(450); // and the screen's change is saved
    expect(loads).toBe(2);
    expect(saves()).toHaveLength(1);
    expect(saves()[0].args[0]).toEqual({ capabilities: ON });
    expect(result.current.capabilities.internet_downloads).toBe(true);
    unmount();
  });

  it("a screen rebuilt after a failed save sends the change instead of taking it as already saved", async () => {
    let failing = true;
    let disk: Record<string, unknown> = defaultSettingsFixture();
    setRpcHandler("load_settings", () => disk);
    setRpcHandler("save_settings", (...args: unknown[]) => {
      if (failing) throw new Error("back end not answering");
      disk = { ...disk, ...((args[0] as object) ?? {}) };
      return disk;
    });
    const first = renderHook(() => usePluginSettings());
    await loaded(() => first.result.current);
    act(() => first.result.current.setCapabilities(ON));
    await later(450); // fails
    // A popup opens: the note holds the screen's own settings, and the screen is thrown away.
    captureBonsaiSessionForModal({ settingsSnapshot: first.result.current.settingsSnapshot } as unknown as BonsaiSessionSurvivalSnapshot);
    first.unmount(); // the panel's last save on the way out fails too
    consumeBonsaiSessionAfterRemount();
    await later(50);

    const second = renderHook(() => usePluginSettings());
    await loaded(() => second.result.current);
    await later(450); // the new screen's own tries fail while the back end is still down
    expect((disk.capabilities as { internet_downloads: boolean }).internet_downloads).toBe(false);
    failing = false; // the back end is back
    await later(65000);
    expect(second.result.current.capabilities.internet_downloads).toBe(true);
    expect((disk.capabilities as { internet_downloads: boolean }).internet_downloads).toBe(true);
    second.unmount();
  });
});
