/**
 * Title: Update AI & models runs in place: no popup, a moving line, then a done or failed line
 *
 * Purpose: Pin plan 87 (bugs B13 + B14, the maintainer's call 2). The real "Where AI runs" section is
 * drawn on a Deck with models installed and "Update AI & models" is pressed, then read as a person
 * would see it: no box of any kind opens; the line under the button shows the stage and the newest
 * download progress while the run goes on; the last line is the run's own result sentence (with the
 * version now answering) or, when the run is refused or fails, the reason in plain words. All of it is
 * read from the back end's setup status, so a tab that is rebuilt (closing a Decky box does that)
 * still shows the result. The starter-model question for a Deck with no models is a choice, not a
 * progress notice, and is pinned in OllamaWhereAiRunsSection.starterOffer.test.tsx.
 *
 * Does not: prove the ring on the device (jsdom has no Steam ring); the Deck row does.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ modals: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: () => {
      hoisted.modals += 1;
      return { Close: () => {} };
    },
  };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../features/plugin-shell/settingsLoadedSignal";
import { resetModalReturnFocusRegistry } from "../features/plugin-shell/modalReturnFocusRegistry";
import { setDownloadPermissionBridge } from "../features/downloads/downloadNotice";

const IDLE = { phase: "idle", stage: "", profile: "", done: true, log_tail: [] };
const RUNNING = {
  phase: "running",
  stage: "pull",
  profile: "update_installed",
  pull_step: 1,
  total_pull_steps: 2,
  current_tag: "a:1",
  progress_text: "Downloading 6e4c38e1172f: 43% 1.3 GB/3.2 GB",
  done: false,
  log_tail: [],
};
const DONE = {
  phase: "done",
  stage: "complete",
  profile: "update_installed",
  result_line: "Updated to Ollama 0.40.2 and restarted it. 2 models refreshed.",
  done: true,
  log_tail: [],
};

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
const pressUpdate = async () => {
  await screen.findByText("Installed: 1");
  const btn = (await screen.findByText("Update AI & models")).closest("button") as HTMLButtonElement;
  await act(async () => void fireEvent.click(btn));
};

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  setDownloadPermissionBridge(null);
  hoisted.modals = 0;
  status = IDLE;
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => status);
  markSettingsLoaded();
});

describe("Update AI & models, in place", () => {
  it("opens no box, shows the moving progress line, then the done line from the status", async () => {
    setRpcHandler("start_local_ollama_setup", () => {
      status = RUNNING;
      return { accepted: true };
    });
    draw();
    await pressUpdate();

    expect(await screen.findByText(/Pull 1\/2 — a:1/)).toBeTruthy();
    expect(screen.getByText(/Downloading 6e4c38e1172f: 43% 1\.3 GB\/3\.2 GB/)).toBeTruthy();

    status = DONE;
    expect(await screen.findByText("Updated to Ollama 0.40.2 and restarted it. 2 models refreshed.", {}, { timeout: 4000 })).toBeTruthy();
    expect(hoisted.modals).toBe(0);
  });

  it("a refused start shows the reason on the tab, not in a box", async () => {
    setRpcHandler("start_local_ollama_setup", () => ({
      accepted: false,
      reason: "Internet downloads are off in Permissions.",
    }));
    draw();
    await pressUpdate();

    expect(await screen.findByText(/Internet downloads are off in Permissions\./)).toBeTruthy();
    expect(hoisted.modals).toBe(0);
    // the poll that follows must not wipe the reason
    await act(() => new Promise<void>((r) => setTimeout(r, 1800)));
    expect(screen.getByText(/Internet downloads are off in Permissions\./)).toBeTruthy();
  });

  it("a run that failed shows its reason in plain words", async () => {
    status = { ...IDLE, phase: "failed", stage: "pull", error: "Could not install Ollama automatically.", done: true };
    draw();
    expect(await screen.findByText(/Could not install Ollama automatically\./)).toBeTruthy();
  });

  it("a tab that is rebuilt still shows the result, because it is read from the status", async () => {
    status = DONE;
    const first = draw();
    await screen.findByText(/Updated to Ollama 0\.40\.2/);
    first.unmount();
    draw();
    expect(await screen.findByText(/Updated to Ollama 0\.40\.2/)).toBeTruthy();
  });

  it("the Update button stays enabled while it runs, so the ring never sits on a dead button", async () => {
    status = RUNNING;
    draw();
    await screen.findByText(/Pull 1\/2 — a:1/);
    const btn = screen.getByLabelText("Update AI engine and installed models") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain("Updating");
  });
});
