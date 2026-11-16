/**
 * Title: The Ollama version on the tab is read again when an update run ends, however it ends
 *
 * Purpose: Pin the 2026-11-15 Deck finding (plan 104 block D0a): an update was started, Cancel was
 * pressed, yet the program file had already been swapped and Ollama restarted (0.40.9 to 0.40.16),
 * and the tab kept reading "Connected · Ollama v0.40.9". The real "Where AI runs" section is drawn
 * with a PC-side answer that changes underneath it, and the line a person reads is checked: it must
 * name the new version after a run that was cancelled or failed, as it already did after one that
 * finished cleanly.
 *
 * Does not: prove the swap itself (that is the back end's) or the ring on the device.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return { ...stubs, showModal: () => ({ Close: () => {} }) };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { setDownloadPermissionBridge } from "../downloads/downloadNotice";

const IDLE = { phase: "idle", stage: "", profile: "", done: true, log_tail: [] };
const RUNNING = { phase: "running", stage: "install", profile: "update_installed", done: false, log_tail: [] };

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

let status: Record<string, unknown> = IDLE;
let runningVersion = "0.40.9";

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  setDownloadPermissionBridge(null);
  status = IDLE;
  runningVersion = "0.40.9";
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: runningVersion, models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => status);
  markSettingsLoaded();
});

async function endRunWith(end: Record<string, unknown>) {
  draw();
  expect(await screen.findByText(/Ollama v0\.40\.9/)).toBeTruthy();
  status = RUNNING;
  await screen.findByText("Installing Ollama…", { exact: false }, { timeout: 4000 });
  // The program is swapped and restarted while the run is going; then the run ends the given way.
  runningVersion = "0.40.16";
  status = end;
}

describe("the Ollama version line after a run ends", () => {
  it("names the new version after a run that was cancelled", async () => {
    await endRunWith({ phase: "cancelled", stage: "cancelled", error: "Cancelled.", done: true, log_tail: [] });
    expect(await screen.findByText(/Ollama v0\.40\.16/, {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByText(/Ollama v0\.40\.9/)).toBeNull();
  });

  it("names the new version after a run that failed", async () => {
    await endRunWith({ phase: "failed", stage: "pull", error: "Failed to pull a:1", done: true, log_tail: [] });
    expect(await screen.findByText(/Ollama v0\.40\.16/, {}, { timeout: 5000 })).toBeTruthy();
  });

  it("names the new version after a run that finished", async () => {
    await endRunWith({ phase: "done", stage: "complete", result_line: "Updated.", done: true, log_tail: [] });
    expect(await screen.findByText(/Ollama v0\.40\.16/, {}, { timeout: 5000 })).toBeTruthy();
  });
});
