/**
 * Title: Turning "Run AI on this Deck" off while an install runs: the job carries on, so the card and the bar must too
 *
 * Purpose: Plan 106 lane F3 (the third card note from plan 105's second opinion). Switching "Run AI on this Deck" off
 * only hides the setup block; the install or update the back end is running does not stop. The tab used to tell the
 * job's memory "nothing is running" at that moment, so the card and the bar dropped a run that was still going (and
 * Cancel with them). Now the job stays: with the switch off the card is out of sight and the bar shows the run with
 * its Cancel; the job reads the run's status itself, so the bar says how it ended; turned back on, the card is back
 * with the run's words and no bar.
 *
 * Does not: stop the run (turning the switch off never did, and the Internet downloads switch is the one that does).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { JobBar } from "../downloads/JobBar";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";

const CANCEL = "Cancel local Ollama setup";
const BAR = "[data-bonsai-job-bar]";
const RUNNING = { phase: "running", stage: "install", profile: "update_installed", done: false, accepted: true };
let status: Record<string, unknown> = RUNNING;

function Panel({ runOnDeck }: { runOnDeck: boolean }) {
  return (
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="ollama">
      <OllamaWhereAiRunsSection
        ollamaIp="127.0.0.1"
        onOllamaIpChange={() => {}}
        onPersistOllamaIp={() => {}}
        ollamaLocalOnDeck={runOnDeck}
        setOllamaLocalOnDeck={() => {}}
        ollamaLocalAutostart={false}
        setOllamaLocalAutostart={() => {}}
        namedOllamaHosts={[]}
        setNamedOllamaHosts={() => {}}
        onBeforeDeckyModal={() => {}}
        onCompleteDeckyModalClose={(close) => close()}
        onOpenOllamaModelsHub={() => {}}
        connectionTestBtnRef={{ current: null }}
      />
      <JobBar />
    </div>
  );
}

const bar = () => document.querySelector<HTMLElement>(BAR);
const cancelCalls = () => getRpcCallLog().filter((c) => c.method === "cancel_local_ollama_setup").length;

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetNavFocusRegistry();
  status = RUNNING;
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => status);
  setRpcHandler("cancel_local_ollama_setup", () => ({ cancel_requested: true }));
  markSettingsLoaded();
});
afterEach(() => cleanup());

describe("Run AI on this Deck turned off in the middle of a run", () => {
  it("the run is not dropped: the card goes with the setup block and the bar shows the run, with its Cancel", async () => {
    const view = render(<Panel runOnDeck />);
    await screen.findByLabelText(CANCEL);
    expect(bar()).toBeNull();
    view.rerender(<Panel runOnDeck={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    expect(bar()!.textContent).toContain("Updating AI & models");
    expect(screen.queryByLabelText(CANCEL)).toBeNull();
    expect(screen.getByLabelText("Cancel: Updating AI & models")).toBeTruthy();
  });

  it("Cancel from the bar still stops the run", async () => {
    const view = render(<Panel runOnDeck />);
    await screen.findByLabelText(CANCEL);
    view.rerender(<Panel runOnDeck={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    await act(async () => new Promise<void>((r) => setTimeout(r, 520)));
    fireEvent.click(screen.getByLabelText("Cancel: Updating AI & models"));
    await waitFor(() => expect(cancelCalls()).toBe(1));
    expect(bar()!.textContent).toContain("Stopping the update");
  });

  it("the job reads the run itself with the switch off: the bar says how it ended", async () => {
    const view = render(<Panel runOnDeck />);
    await screen.findByLabelText(CANCEL);
    view.rerender(<Panel runOnDeck={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    status = { phase: "done", stage: "complete", profile: "update_installed", done: true, result_line: "Ollama 0.40.16 is answering." };
    await waitFor(() => expect(bar()?.textContent).toContain("Update finished"), { timeout: 4000 });
    expect(bar()!.textContent).toContain("Ollama 0.40.16 is answering.");
  });

  it("turned back on mid-run, the card is back with the run's words and the bar is gone", async () => {
    const view = render(<Panel runOnDeck />);
    await screen.findByLabelText(CANCEL);
    view.rerender(<Panel runOnDeck={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    view.rerender(<Panel runOnDeck />);
    await screen.findByLabelText(CANCEL);
    await waitFor(() => expect(bar()).toBeNull());
    expect(screen.getByText("Updating AI & models")).toBeTruthy();
  });
});
