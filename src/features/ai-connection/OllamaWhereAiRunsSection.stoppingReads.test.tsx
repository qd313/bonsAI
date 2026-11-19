/**
 * Title: Cancel on the AI update: the card shows the result within a second, on the tab and on the bar
 *
 * Purpose: Pin, at the level the Deck check reads, that a Cancel on the Ollama tab's install or update is followed by
 * fast reads of the run's status. The back end is faked as "running" until the Cancel and "cancelled" straight after;
 * the card leaves "Stopping the update" within 400 ms of the press (not the 1.5 seconds of the routine read), with
 * the run's own words ("Cancelled.") and the buttons back. Once with the tab on screen (its own poll reads fast and
 * hands every status to the card) and once with the tab away (the bar's Cancel; the follower reads fast). A run that
 * is not being cancelled is read at the routine pace, not faster.
 *
 * Does not: move the ring (OllamaWhereAiRunsSection.jobCard.test.tsx pins where it goes when the card ends).
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _c, onChange: _o, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { JobBar } from "../downloads/JobBar";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { setDownloadPermissionBridge } from "../downloads/downloadNotice";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";

const UPDATE = "Update AI engine and installed models";
const CANCEL = "Cancel local Ollama setup";
const BAR_CANCEL = "Cancel: Updating AI & models";
const BAR = "[data-bonsai-job-bar]";
const RUNNING = { phase: "running", stage: "install", profile: "update_installed", done: false, accepted: true };
const CANCELLED = { phase: "cancelled", stage: "", profile: "update_installed", error: "Cancelled.", done: true };

let status: Record<string, unknown> = { phase: "idle", stage: "", profile: "", done: true };

const section = () => (
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
    connectionTestBtnRef={{ current: null }}
  />
);
function Panel({ onTab }: { onTab: boolean }) {
  return (
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab={onTab ? "ollama" : "settings"}>
      {onTab ? section() : <div>another tab</div>}
      <JobBar />
    </div>
  );
}

const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const statusReads = () => getRpcCallLog().filter((c) => c.method === "get_local_ollama_setup_status").length;
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
/** Moves the clock until a routine read has just happened, so the next one is a full 1.5 seconds away. */
async function justAfterARead() {
  const before = statusReads();
  while (statusReads() === before) await advance(50);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  resetNavFocusRegistry();
  setDownloadPermissionBridge(null);
  status = { phase: "idle", stage: "", profile: "", done: true };
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => status);
  setRpcHandler("start_local_ollama_setup", () => {
    status = RUNNING;
    return { accepted: true };
  });
  // The back end stops the job at once: the next status read says so.
  setRpcHandler("cancel_local_ollama_setup", () => {
    status = CANCELLED;
    return { cancel_requested: true };
  });
  markSettingsLoaded();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function startUpdate(view: ReturnType<typeof render>) {
  fireEvent.click(await screen.findByLabelText(UPDATE));
  await screen.findByLabelText(CANCEL);
  await advance(600);
  return view;
}

describe("Cancel on the AI update shows its result within a second", () => {
  it("on the tab: the card leaves Stopping within 400 ms and the buttons are back with Cancelled.", async () => {
    await startUpdate(render(<Panel onTab />));
    await justAfterARead();
    fireEvent.click(screen.getByLabelText(CANCEL));
    expect(screen.getByText("Stopping the update")).toBeTruthy();
    await advance(400);
    expect(screen.queryByText("Stopping the update")).toBeNull();
    expect(byLabel(CANCEL)).toBeNull();
    expect(byLabel(UPDATE)).not.toBeNull();
    expect(screen.getByText("Cancelled.")).toBeTruthy();
  });

  it("away from the tab: the bar leaves Stopping within 400 ms and says it was cancelled", async () => {
    const view = await startUpdate(render(<Panel onTab />));
    view.rerender(<Panel onTab={false} />);
    await advance(600);
    expect(document.querySelector(BAR)).not.toBeNull();
    await justAfterARead();
    fireEvent.click(screen.getByLabelText(BAR_CANCEL));
    expect(document.querySelector(BAR)!.textContent).toContain("Stopping the update");
    await advance(400);
    expect(document.querySelector(BAR)!.textContent).not.toContain("Stopping");
    expect(document.querySelector(BAR)!.textContent).toContain("Update cancelled");
  });

  it("a run nobody is cancelling is read at the routine pace", async () => {
    await startUpdate(render(<Panel onTab />));
    await justAfterARead();
    const before = statusReads();
    await advance(3100);
    expect(statusReads() - before).toBeLessThanOrEqual(3);
  });
});
