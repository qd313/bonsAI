import { readFile } from "node:fs/promises";

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
   * This reads the source rather than driving the hook, and that is deliberate. The reset only runs
   * from the mount effect, whose deps are `[hydrateFromSettings]` and which is a `useCallback` with
   * an empty dep list — so by the time the reset can fire, state is *already* sitting at its
   * defaults and no behavioural assertion can tell a complete list from an incomplete one. The
   * defect D18 named is not a wrong value, it is a **list that drifted**: four fields were missing
   * from one of six hand-maintained copies of the same field list in this file.
   *
   * So the invariant is checked directly. Anything the hydrate path sets, the failure path must
   * reset. When D14 collapses that duplication this test should be deleted along with it — a
   * source-shape assertion earns its place only while the shape is the thing that can break.
   */
  it("resets every field the successful-load path sets, so the two lists cannot drift", async () => {
    // Not `import.meta.url` — under vitest's jsdom environment that is an http: URL, which
    // `readFile` rejects. The suite always runs from the repo root.
    const source = await readFile("src/hooks/usePluginSettings.ts", "utf8");

    const hydrateStart = source.indexOf("const hydrateFromSettings");
    expect(hydrateStart).toBeGreaterThan(-1);
    const hydrateBody = source.slice(hydrateStart, source.indexOf("\n  }, []);", hydrateStart));

    const catchStart = source.indexOf("      .catch(() => {");
    expect(catchStart).toBeGreaterThan(-1);
    const catchBody = source.slice(catchStart, source.indexOf("\n      .finally(", catchStart));

    const settersIn = (body: string) =>
      new Set([...body.matchAll(/\bset([A-Z]\w*)\(/g)].map((m) => m[1]));

    const hydrated = settersIn(hydrateBody);
    const reset = settersIn(catchBody);
    expect(hydrated.size).toBeGreaterThan(30);

    const missingFromReset = [...hydrated].filter((name) => !reset.has(name)).sort();
    expect(missingFromReset).toEqual([]);
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
