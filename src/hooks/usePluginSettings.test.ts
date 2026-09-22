import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";
import { usePluginSettings } from "./usePluginSettings";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";
import { dispatchFakeRpc, getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { DEFAULT_LATENCY_WARNING_SECONDS } from "../data/bonsaiSettingsSchema";
describe("usePluginSettings", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
  });

  it("loads settings on mount via load_settings RPC", async () => {
    const custom = defaultSettingsFixture();
    custom.latency_warning_seconds = 55;
    setRpcHandler("load_settings", () => custom);

    const { result } = renderHook(() => usePluginSettings());

    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    expect(result.current.latencyWarningSeconds).toBe(55);
    expect(getRpcCallLog().some((c) => c.method === "load_settings")).toBe(true);
  });

  it("debounces save_settings after state change", async () => {
    const { result } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));

    const savesBefore = getRpcCallLog().filter((c) => c.method === "save_settings").length;

    act(() => {
      result.current.setLatencyWarningSeconds(99);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
    });
    expect(getRpcCallLog().filter((c) => c.method === "save_settings").length).toBeGreaterThan(savesBefore);
  });

  it("falls back to defaults when load_settings fails", async () => {
    setRpcHandler("load_settings", async () => {
      throw new Error("disk read failed");
    });

    const { result } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    expect(result.current.latencyWarningSeconds).toBe(DEFAULT_LATENCY_WARNING_SECONDS);
  });

  it("does not save_settings after load_settings fails", async () => {
    setRpcHandler("load_settings", async () => {
      throw new Error("disk read failed");
    });

    renderHook(() => usePluginSettings());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(getRpcCallLog().filter((c) => c.method === "save_settings")).toHaveLength(0);
  });

  it("pauseDebouncedSettingsSave cancels a pending debounced save", async () => {
    const { result } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    const savesBefore = getRpcCallLog().filter((c) => c.method === "save_settings").length;

    act(() => {
      result.current.setLatencyWarningSeconds(77);
    });
    await act(async () => {
      await result.current.pauseDebouncedSettingsSave();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
    });

    const newSaves = getRpcCallLog().filter((c) => c.method === "save_settings").slice(savesBefore);
    const latencies = newSaves.map(
      (entry) => (entry.args[0] as { latency_warning_seconds?: number }).latency_warning_seconds
    );
    expect(latencies).not.toContain(77);
  });

  /*
   * D18, option A, locked 2026-08-27: a failed read shows defaults — all of them, no exceptions.
   *
   * This used to read the hook's own source text and compare which `setXxx(...)` calls appeared
   * in `hydrateFromSettings` versus the failed-load reset -- catching drift between six
   * hand-written copies of the same ~48-field list. That shape is gone (D14): both paths now
   * build one complete `BonsaiSettingsSnapshotInput` from `SETTINGS_FIELD_BACKEND_KEY` and call
   * `setSettings` with it in a single line, so a field missing from one and not the other fails
   * to *compile* (the table is typed `Record<keyof BonsaiSettingsSnapshotInput, ...>`), not just
   * to test. This test checks the *behavior* the old one stood in for instead: a load failure
   * must show the exact same values loading a genuinely empty settings object would show, for
   * every field, not a mix of some fields defaulted and others stuck on whatever they last held.
   */
  it("a failed load shows the exact same values as loading a genuinely empty settings object, for every field", async () => {
    const settingsValuesOnly = (hookResult: Record<string, unknown>) => {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(hookResult)) {
        if (typeof value === "function") continue; // the ~48 setSomething functions
        if (key === "settingsLoaded") continue;
        out[key] = value;
      }
      return out;
    };

    setRpcHandler("load_settings", () => ({}));
    const { result: emptyLoadResult } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(emptyLoadResult.current.settingsLoaded).toBe(true));

    setRpcHandler("load_settings", async () => {
      throw new Error("disk read failed");
    });
    const { result: failedLoadResult } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(failedLoadResult.current.settingsLoaded).toBe(true));

    const emptyLoadValues = settingsValuesOnly(emptyLoadResult.current);
    const failedLoadValues = settingsValuesOnly(failedLoadResult.current);
    // Not vacuous: there really are ~48 fields being compared, not an empty object matching itself.
    expect(Object.keys(failedLoadValues).length).toBeGreaterThan(30);
    expect(failedLoadValues).toEqual(emptyLoadValues);
  });

  /*
   * Bug 2 (roadmap "A new setting can quietly stop working in one place"): a setting missing from
   * `SETTINGS_FIELD_BACKEND_KEY` in usePluginSettings.ts no longer builds (TypeScript requires
   * every key of `BonsaiSettingsSnapshotInput`), but this test catches it independently at
   * runtime too -- deliberately not reusing that same table, so a mistake in the table itself
   * cannot hide from both checks at once. It walks every key the wire shape (`BonsaiSettings`)
   * declares, converts snake_case to camelCase with a plain regex, and confirms the hook's
   * returned object actually has a value there after loading a fully custom settings object. A
   * field the table forgets shows up as `undefined` here, not as a coincidental default.
   */
  it("every setting the backend can save shows up as a value on the hook's returned object", async () => {
    const custom = defaultSettingsFixture();
    // Distinctive, obviously-non-default markers for a few fields so a missing table entry shows
    // up as `undefined` rather than coincidentally matching whatever the default already is.
    custom.dev_frozen_test_chips = ["marker question one", "marker question two", "marker question three"];
    custom.reply_language = "german";
    custom.text_model_routing_order = ["qwen2.5:7b"];

    const { result } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));

    act(() => {
      result.current.hydrateFromSettings(custom);
    });

    const wireKeys = Object.keys(custom);
    // Not vacuous: there really are ~48 fields on the wire shape being walked here.
    expect(wireKeys.length).toBeGreaterThan(30);
    for (const wireKey of wireKeys) {
      const camelKey = wireKey.replace(/_([a-z0-9])/g, (_match, c: string) => c.toUpperCase());
      expect(
        (result.current as Record<string, unknown>)[camelKey],
        `expected a defined value for "${camelKey}" (from wire field "${wireKey}")`
      ).not.toBeUndefined();
    }
    expect(result.current.devFrozenTestChips).toEqual([
      "marker question one",
      "marker question two",
      "marker question three",
    ]);
  });

  it("flushSettingsSnapshotNow persists the latest hydrated snapshot", async () => {
    const { result } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));

    let saved: { latency_warning_seconds?: number } | undefined;
    await act(async () => {
      result.current.hydrateFromSettings({
        ...defaultSettingsFixture(),
        latency_warning_seconds: 60,
      });
      saved = await result.current.flushSettingsSnapshotNow();
    });

    expect(saved?.latency_warning_seconds).toBe(60);
  });

  /*
   * The pinned QA test chips bug (roadmap "The pinned test sentences stop showing after the
   * first question"): the automatic background save used to send every one of the ~48 settings
   * on every change, not just the one that changed. That is harmless when the plugin's own save
   * is the only writer, but it is not: a QA batch written straight to settings.json, a corpus
   * download finishing in the background, or the sanitizer keyword command's own save can all
   * change a field on disk that this tab never touched. The very next autosave -- triggered by
   * changing one unrelated setting -- then sent the plugin's stale belief about every other field
   * and silently reverted that outside change. Sending only the fields that actually changed
   * fixes this: an untouched field is simply absent from the payload, so the backend's own
   * merge-with-fresh-disk-read (`save_settings` in main.py) leaves it alone.
   */
  it("the automatic background save sends only the field that changed, not the whole settings object", async () => {
    const { result } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));

    act(() => {
      result.current.setLatencyWarningSeconds(99);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
    });

    const saveCalls = getRpcCallLog().filter((c) => c.method === "save_settings");
    expect(saveCalls.length).toBeGreaterThan(0);
    const lastPayload = saveCalls[saveCalls.length - 1].args[0] as Record<string, unknown>;
    expect(lastPayload).toEqual({ latency_warning_seconds: 99 });
  });

  it("a field the rig hand-edits on disk survives the next unrelated autosave", async () => {
    // A stand-in for settings.json being hand-edited underneath the running plugin -- the way a
    // pinned QA batch is staged, since no test sentence may be typed by thumb on the Deck. The
    // fake backend behaves like the real one: every save merges the incoming payload over a
    // fresh read of "disk", never over what the frontend last believed.
    let disk: Record<string, unknown> = { ...defaultSettingsFixture(), dev_frozen_test_chips: ["pinned question one", "pinned question two", "pinned question three"] };
    setRpcHandler("load_settings", () => disk);
    setRpcHandler("save_settings", (...args: unknown[]) => {
      const payload = (args[0] as Record<string, unknown>) ?? {};
      disk = { ...disk, ...payload };
      return disk;
    });

    const { result } = renderHook(() => usePluginSettings());
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    expect(result.current.devFrozenTestChips).toEqual([
      "pinned question one",
      "pinned question two",
      "pinned question three",
    ]);

    // Someone edits settings.json directly again, behind the running plugin's back, exactly the
    // way the rig stages a fresh QA batch without a reload.
    disk = { ...disk, dev_frozen_test_chips: ["a brand new pinned question"] };

    // Something unrelated changes in the UI -- standing in for whatever a sent question touches.
    act(() => {
      result.current.setLatencyWarningSeconds(101);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
    });

    expect(disk.dev_frozen_test_chips).toEqual(["a brand new pinned question"]);
  });
});
