/**
 * Title: The first-time setup popup when a save does not reach the back end (plan 104, lane B1; plan 105, lane D3)
 *
 * Purpose: Two things are pinned at the level a person looks at. A setting the popup changes whose save fails is not
 * forgotten: once the screen is rebuilt (every popup does that), it sends the change again instead of taking its own
 * value as already saved (the PC screen's "the AI runs on this PC", after a test that connected). And the Internet
 * downloads switch whose save fails goes back off with a message saying the setting could not be saved, OK stays grey
 * and nothing starts; the next press, with the back end back, turns it on and OK installs.
 *
 * Does not: prove the Deck. A first start on a healthy back end never showed the fault; the save call is made to fail.
 */
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";

vi.mock("@decky/ui", async () => (await import("./firstRunPopupTestKit")).deckyUiForFirstRunPopup());

import { FIRST_RUN_POPUP_WORDS, FirstRunWhereAiRunsModal } from "./FirstRunWhereAiRunsModal";
import { saveSettingsNowOrPatch } from "./saveSettingsNowOrPatch";
import { popupHost, resetBoxes } from "./firstRunPopupTestKit";
import { permissionBridge } from "./firstRunTestBridge";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../../test-harness/rpcFixtures";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../../settings/settingsLoadedSignal";
import { usePluginSettings, clearUnsavedSettingsForTests } from "../../settings/usePluginSettings";
import { setDownloadPermissionBridge } from "../../downloads/downloadNotice";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../../plugin-shell/bonsaiSessionSurvival";

const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method);
const settle = (ms = 30) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));

beforeEach(() => {
  resetFakeDeckyRpc();
  resetBoxes();
  resetSettingsLoadedSignalForTests();
  markSettingsLoaded();
  clearUnsavedSettingsForTests();
  clearBonsaiSessionSurvival();
  setDownloadPermissionBridge(null);
  window.localStorage.clear();
  vi.mocked(toaster.toast).mockClear();
});

describe("a setting changed in the popup whose save fails", () => {
  it("is sent again by the screen that is built after the box closes, not taken as already saved", async () => {
    let backEndUp = false;
    let disk: Record<string, unknown> = defaultSettingsFixture();
    setRpcHandler("load_settings", () => disk);
    setRpcHandler("save_settings", (...args: unknown[]) => {
      if (!backEndUp) throw new Error("back end not answering");
      disk = { ...disk, ...((args[0] as object) ?? {}) };
      return disk;
    });
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.6", models: ["qwen3:8b"] }));
    // The box's own save, the way the plugin root wires it (the screen that opened it is thrown away).
    const host = popupHost({
      ollamaIp: "192.168.1.20",
      saveSettingsNow: (patch) => saveSettingsNowOrPatch(patch, async () => {}, (p) => ({ ...p })),
    });
    render(<FirstRunWhereAiRunsModal host={host} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(FIRST_RUN_POPUP_WORDS.pc));
    fireEvent.click(await screen.findByLabelText("Test the connection to the PC"));
    await waitFor(() => expect(calls("save_settings")).toHaveLength(1));

    // The box closes and the screen is rebuilt from the note, which holds the AI on the PC as the person set it.
    captureBonsaiSessionForModal({
      settingsSnapshot: { ...(await import("../../settings/bonsaiSettingsNormalizers")).normalizeSettings({}), ollamaLocalOnDeck: false },
    } as unknown as BonsaiSessionSurvivalSnapshot);
    consumeBonsaiSessionAfterRemount();
    backEndUp = true;
    const rebuilt = renderHook(() => usePluginSettings());
    await waitFor(() => expect(rebuilt.result.current.settingsLoaded).toBe(true));
    await settle();
    expect(disk.ollama_local_on_deck).toBe(false);
    rebuilt.unmount();
  });
});

describe("the Internet downloads switch whose save fails", () => {
  it("goes back off and says the setting could not be saved; OK stays grey; the next try, with the back end back, installs", async () => {
    let saveWorks = false;
    setRpcHandler("save_settings", () => {
      if (!saveWorks) throw new Error("back end not answering");
      return {};
    });
    permissionBridge(false);
    const onClose = vi.fn();
    render(<FirstRunWhereAiRunsModal host={popupHost()} onClose={onClose} />);
    const toggle = () => screen.getByRole("switch", { name: "Internet downloads" });

    await act(async () => void fireEvent.click(toggle()));
    await waitFor(() => expect(toggle().getAttribute("aria-checked")).toBe("false"));
    const told = vi.mocked(toaster.toast).mock.calls.map((c) => JSON.stringify(c[0])).join(" ");
    expect(told).toMatch(/could not be saved/i);
    fireEvent.click(screen.getByLabelText(FIRST_RUN_POPUP_WORDS.ok));
    await settle();
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();

    saveWorks = true;
    await act(async () => void fireEvent.click(toggle()));
    await waitFor(() => expect(toggle().getAttribute("aria-checked")).toBe("true"));
    fireEvent.click(screen.getByLabelText(FIRST_RUN_POPUP_WORDS.ok));
    await waitFor(() => expect(calls("start_local_ollama_setup")).toHaveLength(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
