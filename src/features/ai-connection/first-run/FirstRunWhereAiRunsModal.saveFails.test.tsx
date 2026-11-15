/**
 * Title: The first-start box when a save does not reach the back end (plan 104, lane B1)
 *
 * Purpose: The maintainer's first start: a setting changed in the first-start box, or Internet downloads
 * turned on from its Install Ollama box, and the back end did not take the save. Two things are pinned at
 * the level a person looks at. A switch changed in the box whose save fails is not forgotten: once the
 * screen is rebuilt (every popup does that), it sends the change again instead of taking its own value as
 * already saved. And Install Ollama after a "Turn on internet downloads?" yes whose save failed says the
 * setting could not be saved (never "turn on Internet downloads"), starts nothing, and a second try with
 * the back end back goes through.
 *
 * Does not: prove the Deck. A first start on a healthy back end never showed the fault; the back end's
 * save call is made to fail here.
 */
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";

vi.mock("@decky/ui", async () => (await import("./firstRunPopupTestKit")).deckyUiForFirstRunPopup());

import { FirstRunWhereAiRunsModal } from "./FirstRunWhereAiRunsModal";
import { saveSettingsNowOrPatch } from "./saveSettingsNowOrPatch";
import { boxes, popupHost, resetBoxes } from "./firstRunPopupTestKit";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../../test-harness/rpcFixtures";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../../settings/settingsLoadedSignal";
import { usePluginSettings, clearUnsavedSettingsForTests } from "../../settings/usePluginSettings";
import { setDownloadPermissionBridge } from "../../downloads/downloadNotice";
import { DEFAULT_CAPABILITIES } from "../../settings/bonsaiSettingsSchema";
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
  setRpcHandler("test_ollama_connection", () => ({ reachable: false, error: "Connection refused" }));
});

describe("a switch changed in the first-start box whose save fails", () => {
  it("is sent again by the screen that is built after the box closes, not taken as already saved", async () => {
    let backEndUp = false;
    let disk: Record<string, unknown> = defaultSettingsFixture();
    setRpcHandler("load_settings", () => disk);
    setRpcHandler("save_settings", (...args: unknown[]) => {
      if (!backEndUp) throw new Error("back end not answering");
      disk = { ...disk, ...((args[0] as object) ?? {}) };
      return disk;
    });
    // The box's own save, the way the plugin root wires it (nothing from the screen's hook is shared here:
    // the box's direct save is what fails, and the screen that opened it is thrown away).
    const host = popupHost({
      saveSettingsNow: (patch) => saveSettingsNowOrPatch(patch, async () => {}, (p) => ({ ...p })),
    });
    render(<FirstRunWhereAiRunsModal host={host} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("switch", { name: "Start the AI with the Deck" }));
    await settle();
    expect(calls("save_settings")).toHaveLength(1);

    // The box closes and the screen is rebuilt from the note, which holds the switch as the person set it.
    captureBonsaiSessionForModal({
      settingsSnapshot: { ...(await import("../../settings/bonsaiSettingsNormalizers")).normalizeSettings({}), ollamaLocalAutostart: true },
    } as unknown as BonsaiSessionSurvivalSnapshot);
    consumeBonsaiSessionAfterRemount();
    backEndUp = true;
    const rebuilt = renderHook(() => usePluginSettings());
    await waitFor(() => expect(rebuilt.result.current.settingsLoaded).toBe(true));
    await settle();
    expect(disk.ollama_local_autostart).toBe(true);
    rebuilt.unmount();
  });
});

describe("Install Ollama after a Turn on internet downloads yes whose save failed", () => {
  it("says the setting could not be saved and installs nothing; the next try, with the back end back, installs", async () => {
    let saveWorks = false;
    setRpcHandler("save_settings", () => {
      if (!saveWorks) throw new Error("back end not answering");
      return {};
    });
    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "idle", stage: "", profile: "", done: true, log_tail: [] }));
    setRpcHandler("start_local_ollama_setup", () => ({ accepted: true }));
    setDownloadPermissionBridge({
      enabled: false,
      kidsLockActive: false,
      capabilities: { ...DEFAULT_CAPABILITIES, internet_downloads: false },
      setCapabilities: () => {},
      onBeforeDeckyModal: () => {},
      onCompleteDeckyModalClose: (close) => close(),
    });
    render(<FirstRunWhereAiRunsModal host={popupHost()} onClose={() => {}} />);
    await waitFor(() => expect(document.body.textContent).toContain("Local Ollama setup: Not installed"));

    fireEvent.click(screen.getByLabelText("Install Ollama on this Deck"));
    await waitFor(() => expect(boxes).toHaveLength(1));
    expect((boxes[0].props as { title: string }).title).toBe("Turn on internet downloads?");
    await act(async () => void (boxes[0].props as { onAction: () => void }).onAction());
    await settle();
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
    const told = vi.mocked(toaster.toast).mock.calls.map((c) => JSON.stringify(c[0])).join(" ");
    expect(told).toMatch(/could not be saved/i);
    expect(document.body.textContent).not.toContain("check the Internet downloads permission");

    saveWorks = true;
    fireEvent.click(screen.getByLabelText("Install Ollama on this Deck"));
    await waitFor(() => expect(boxes).toHaveLength(2));
    await act(async () => void (boxes[1].props as { onAction: () => void }).onAction());
    await settle();
    expect(calls("start_local_ollama_setup")).toHaveLength(1);
    setDownloadPermissionBridge(null);
  });
});
