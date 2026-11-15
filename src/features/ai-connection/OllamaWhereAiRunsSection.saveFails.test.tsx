/**
 * Title: Turning Internet downloads on when the save fails says so (plan 104, lane B1)
 *
 * Purpose: On the first start a person pressed Install Ollama with Internet downloads off, said yes to
 * "Turn on internet downloads?", and the back end did not take the save. The yes used to go on as if
 * it had worked, and the press then failed with a message to turn on Internet downloads, which the
 * person had just done. Now the press stops, nothing is installed, the screen goes back to off (it does
 * not claim a setting the file does not have), and a message says the setting could not be saved. The
 * real section is drawn and pressed, and the back end's save call is made to fail.
 *
 * Does not: prove the Deck; the first-start row does, and on a healthy back end it never showed the
 * fault. This test stands the failing back-end call in.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";

const hoisted = vi.hoisted(() => ({ modals: [] as Array<{ props: Record<string, unknown> }> }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modals.push(content as { props: Record<string, unknown> });
      return { Close: () => {} };
    },
  };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { setDownloadPermissionBridge } from "../downloads/downloadNotice";
import { DEFAULT_CAPABILITIES } from "../settings/bonsaiSettingsSchema";

const later = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method);

function draw() {
  return render(
    <OllamaWhereAiRunsSection
      ollamaIp="127.0.0.1"
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={true}
      setOllamaLocalOnDeck={() => {}}
      ollamaLocalAutostart={false}
      setOllamaLocalAutostart={() => {}}
      namedOllamaHosts={[]}
      setNamedOllamaHosts={() => {}}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
      onOpenOllamaModelsHub={() => {}}
    />
  );
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  hoisted.modals = [];
  vi.mocked(toaster.toast).mockClear();
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "idle", stage: "", profile: "", done: true, log_tail: [] }));
  setRpcHandler("start_local_ollama_setup", () => ({ accepted: true }));
  markSettingsLoaded();
});

describe("Turning Internet downloads on when the save fails", () => {
  it("stops the press, goes back to off, and says the setting could not be saved", async () => {
    setRpcHandler("save_settings", () => {
      throw new Error("back end not answering");
    });
    const setCaps = vi.fn();
    const caps = { ...DEFAULT_CAPABILITIES, internet_downloads: false };
    setDownloadPermissionBridge({
      enabled: false,
      kidsLockActive: false,
      capabilities: caps,
      setCapabilities: setCaps,
      onBeforeDeckyModal: () => {},
      onCompleteDeckyModalClose: (close) => close(),
    });
    draw();
    await screen.findByText("Installed: 1");
    const btn = (await screen.findByText("Update AI & models")).closest("button") as HTMLButtonElement;
    await act(async () => void fireEvent.click(btn));
    await later(20);
    await act(async () => void (hoisted.modals[0].props.onAction as () => void)());
    await later(20);

    expect(calls("save_settings")).toHaveLength(1);
    expect(calls("start_local_ollama_setup")).toHaveLength(0);
    expect(setCaps).toHaveBeenLastCalledWith(caps);
    const told = vi.mocked(toaster.toast).mock.calls.map((c) => JSON.stringify(c[0])).join(" ");
    expect(told).toMatch(/could not be saved/i);
    expect(told).not.toMatch(/check the Internet downloads permission/i);
    setDownloadPermissionBridge(null);
  });
});
