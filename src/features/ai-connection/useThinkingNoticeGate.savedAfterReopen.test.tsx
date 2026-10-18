/**
 * Title: The first Thinking pick reaches the settings file (Deck check P96-F3-THINKING)
 *
 * Purpose: Pick Brief the first time (the notice shows), press "Show thinking", let Decky rebuild
 * the screen behind the closing box, and check the settings FILE says Brief and a fresh screen
 * reads Brief. Pressing "Keep it off" must send nothing and leave the file at Off.
 * Used for: Guarding `useThinkingNoticeGate.tsx` against the 2026-10-17 device bug (workshop:
 * test-evidence/plan94-P94-REPLY-STYLE.json): the screen read Brief, the file said off, and the
 * pick was gone after the plugin was closed and reopened.
 * Solves: The older gate tests only checked that the setter was called and that the pending
 * session copy was patched. Neither shows what is on disk. Here the real settings hook runs
 * against a stand-in back end that keeps a "disk", and the screen is torn down and rebuilt.
 * Does not: Render the real Decky box (`showModal` is captured, as in the sibling test), or check
 * Steam's own ring. The rebuild is modelled by unmounting before the 400 ms automatic save can
 * run, which is what closing the box does on the device.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";

import { useThinkingNoticeGate } from "./useThinkingNoticeGate";
import { usePluginSettings } from "../settings/usePluginSettings";
import { THINKING_NOTICE_STORAGE_KEY } from "../plugin-shell/useDisclaimerAndLocalRuntimeGates";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../plugin-shell/bonsaiSessionSurvival";
import { repoRoot } from "../../test-harness/repoPaths";
import { dispatchFakeRpc, getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const hoisted = vi.hoisted(() => ({ modal: null as { props: Record<string, unknown> } | null }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modal = content as { props: Record<string, unknown> };
      return { Close: () => {} };
    },
  };
});

const CONTRACT = JSON.parse(
  readFileSync(resolve(repoRoot(), "tests", "contracts", "settings-defaults.json"), "utf8"),
) as Record<string, unknown>;

function installDisk(): { current: () => Record<string, unknown> } {
  let disk: Record<string, unknown> = { ...CONTRACT, ask_think_effort: "off" };
  setRpcHandler("load_settings", () => disk);
  setRpcHandler("save_settings", (...args: unknown[]) => {
    disk = { ...disk, ...((args[0] as Record<string, unknown>) ?? {}) };
    return disk;
  });
  return { current: () => disk };
}

/** One screen: the real settings hook with the real gate on top, like the Ollama tab. */
function useScreen() {
  const settings = usePluginSettings();
  const gate = useThinkingNoticeGate(settings.askThinkEffort, settings.setAskThinkEffort, {
    // Stands in for the shell's capture: the whole session as it is before the box is answered.
    onBeforeDeckyModal: () =>
      captureBonsaiSessionForModal({
        currentTab: "ollama",
        settingsSnapshot: settings.settingsSnapshot,
      } as unknown as BonsaiSessionSurvivalSnapshot),
    onCompleteDeckyModalClose: (close) => close(),
  });
  return { settings, gate };
}

const saveCalls = () => getRpcCallLog().filter((c) => c.method === "save_settings");

beforeEach(() => {
  hoisted.modal = null;
  window.localStorage.clear();
  clearBonsaiSessionSurvival();
  resetFakeDeckyRpc();
  vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
    dispatchFakeRpc(method, args) as ReturnType<typeof call>,
  );
});

describe("first Thinking pick, notice never accepted", () => {
  it("Show thinking: the file says low and a rebuilt screen reads Brief", async () => {
    const disk = installDisk();
    const first = renderHook(() => useScreen());
    await waitFor(() => expect(first.result.current.settings.settingsLoaded).toBe(true));
    expect(window.localStorage.getItem(THINKING_NOTICE_STORAGE_KEY)).toBeNull();

    act(() => first.result.current.gate.requestThinkingEffortChange("low"));
    const onOK = hoisted.modal?.props.onAction as () => void;
    // Closing the box rebuilds the screen at once, before the 400 ms automatic save can run.
    await act(async () => {
      onOK();
      first.unmount();
    });

    await waitFor(() => expect(disk.current().ask_think_effort).toBe("low"));

    // The shell takes the saved session copy as the rebuilt screen mounts; the settings hook then
    // prefers it over the disk read. That is the path that showed Brief with a file saying off.
    expect(consumeBonsaiSessionAfterRemount()?.settingsSnapshot.askThinkEffort).toBe("low");
    const second = renderHook(() => useScreen());
    await waitFor(() => expect(second.result.current.settings.settingsLoaded).toBe(true));
    expect(second.result.current.settings.askThinkEffort).toBe("low");
    expect(disk.current().ask_think_effort).toBe("low");
  });

  it("Show thinking sends the one changed field, not a whole copy", async () => {
    installDisk();
    const first = renderHook(() => useScreen());
    await waitFor(() => expect(first.result.current.settings.settingsLoaded).toBe(true));

    act(() => first.result.current.gate.requestThinkingEffortChange("medium"));
    const onOK = hoisted.modal?.props.onAction as () => void;
    await act(async () => {
      onOK();
      first.unmount();
    });

    await waitFor(() => expect(saveCalls().length).toBeGreaterThan(0));
    expect(saveCalls()[0].args).toEqual([{ ask_think_effort: "medium" }]);
  });

  it("Keep it off: nothing is saved and the file still says off", async () => {
    const disk = installDisk();
    const first = renderHook(() => useScreen());
    await waitFor(() => expect(first.result.current.settings.settingsLoaded).toBe(true));

    act(() => first.result.current.gate.requestThinkingEffortChange("low"));
    const onCancel = hoisted.modal?.props.onCancel as () => void;
    await act(async () => {
      onCancel();
      first.unmount();
    });

    await new Promise((r) => setTimeout(r, 500));
    expect(saveCalls()).toHaveLength(0);
    expect(disk.current().ask_think_effort).toBe("off");
  });
});
