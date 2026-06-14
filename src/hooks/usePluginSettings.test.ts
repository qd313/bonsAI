import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";
import { usePluginSettings } from "./usePluginSettings";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";
import { dispatchFakeRpc, getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { DEFAULT_LATENCY_WARNING_SECONDS } from "../utils/settingsAndResponse";

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
});
