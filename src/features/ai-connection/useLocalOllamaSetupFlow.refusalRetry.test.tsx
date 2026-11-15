/**
 * Title: A "downloads are off" refusal while the screen shows them on sends the screen's value once and tries once more
 *
 * Purpose: Pin the first-start fault (plan 104, lane B1; the maintainer saw it 2026-11-11). The screen showed
 * Internet downloads on, but the back end read its file and refused the setup start with "downloads_off". The
 * tab then showed "Failed (check the Internet downloads permission?)" although the person had turned it on.
 * Now the screen sends its own value to the back end once and starts the setup again once; only a second
 * refusal shows that line, and a save that does not go through says the setting could not be saved. The
 * real section is drawn and Update AI & models pressed, and the back end's answers are stood in.
 *
 * Does not: prove the Deck. On a healthy back end the Deck's first-start row never showed the fault, so
 * this test (the back end made to refuse once) is what proves the fix.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { setDownloadPermissionBridge } from "../downloads/downloadNotice";
import { DEFAULT_CAPABILITIES } from "../settings/bonsaiSettingsSchema";

const OFF_LINE = "Failed (check the Internet downloads permission?)";
const REFUSED = { accepted: false, ok: false, error: "downloads_off", reason: "Internet downloads are off." };
const ON = { ...DEFAULT_CAPABILITIES, internet_downloads: true };

const later = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method);

/** Downloads shown as on; the back end refuses the first `refusals` starts, and `saveWorks` says whether the save goes through. */
async function pressUpdate(refusals: number, saveWorks = true) {
  let refused = 0;
  setRpcHandler("start_local_ollama_setup", () => (refused++ < refusals ? REFUSED : { accepted: true }));
  setRpcHandler("save_settings", () => {
    if (!saveWorks) throw new Error("back end not answering");
    return {};
  });
  setDownloadPermissionBridge({
    enabled: true,
    kidsLockActive: false,
    capabilities: ON,
    setCapabilities: () => {},
    onBeforeDeckyModal: () => {},
    onCompleteDeckyModalClose: (close) => close(),
  });
  render(
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
  await screen.findByText("Installed: 1");
  const btn = (await screen.findByText("Update AI & models")).closest("button") as HTMLButtonElement;
  await act(async () => void fireEvent.click(btn));
  await later(60);
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  setDownloadPermissionBridge(null);
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "idle", stage: "", profile: "", done: true, log_tail: [] }));
  markSettingsLoaded();
});

describe("a refusal while the screen shows Internet downloads on", () => {
  it("sends the screen's value once, starts again, and shows no failed line when the second start goes through", async () => {
    await pressUpdate(1);
    expect(calls("save_settings")).toHaveLength(1);
    expect(calls("save_settings")[0].args[0]).toEqual({ capabilities: ON });
    expect(calls("start_local_ollama_setup")).toHaveLength(2);
    expect(screen.queryByText(OFF_LINE)).toBeNull();
  });

  it("shows the failed line only when the second start is refused too, and does not try a third time", async () => {
    await pressUpdate(2);
    expect(calls("save_settings")).toHaveLength(1);
    expect(calls("start_local_ollama_setup")).toHaveLength(2);
    expect(screen.getByText(OFF_LINE)).toBeTruthy();
  });

  it("says the setting could not be saved when the send fails, and does not start again", async () => {
    await pressUpdate(1, false);
    expect(calls("start_local_ollama_setup")).toHaveLength(1);
    expect(screen.queryByText(OFF_LINE)).toBeNull();
    expect(screen.getByText(/could not be saved/i)).toBeTruthy();
  });
});
