/**
 * Title: Cancel on the voice install: the card shows the result within a second, on the tab and on the bar
 *
 * Purpose: Pin, at the level the Deck check reads, that a Cancel on the voice install is followed by fast reads of the
 * install's status. The back end is faked as "running" until the Cancel and "cancelled" straight after; the card leaves
 * "Stopping the install" within 400 ms of the press (not the 1.2 seconds of the routine read) and the install button is
 * back. Once with the settings tab on screen (its own poll reads fast) and once with the tab away (the bar's Cancel; the
 * follower reads fast).
 *
 * Does not: move the ring (VoiceInputSettingsSection.jobCard.test.tsx pins where it goes when the card ends).
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});
vi.mock("../downloads/downloadNotice", () => ({ confirmDownload: async () => true }));

import { VoiceInputSettingsSection } from "./VoiceInputSettingsSection";
import { resetVoiceInstallMarkerForTests } from "./voiceInstallBusyStore";
import { JobBar } from "../downloads/JobBar";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";

const CANCEL = "Cancel the voice install";
const BAR_CANCEL = "Cancel: Voice engine install";
const BAR = "[data-bonsai-job-bar]";
type Install = Record<string, unknown>;
let install: Install = { phase: "idle", done: true };

const section = () => <VoiceInputSettingsSection voiceSttModel="base.en" setVoiceSttModel={() => {}} microphoneAccessEnabled />;
function Panel({ onTab }: { onTab: boolean }) {
  return (
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab={onTab ? "settings" : "main"}>
      {onTab ? section() : <div>another tab</div>}
      <JobBar />
    </div>
  );
}

const installReads = () => getRpcCallLog().filter((c) => c.method === "get_voice_install_status").length;
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
/** Moves the clock until the install has just been read, so the next routine read is a full pace away. */
async function justAfterARead() {
  const before = installReads();
  while (installReads() === before) await advance(50);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetFakeDeckyRpc();
  resetVoiceInstallMarkerForTests();
  resetModalReturnFocusRegistry();
  resetNavFocusRegistry();
  install = { phase: "idle", done: true };
  setRpcHandler("get_voice_engine_status", () => ({ model_id: "base.en", binary_ready: false, model_ready: false, ready: false, install }));
  setRpcHandler("get_voice_install_status", () => install);
  setRpcHandler("install_voice_engine", () => {
    install = { phase: "running", stage: "binary_pull_start", done: false, model_id: "base.en" };
    return { accepted: true, model_id: "base.en" };
  });
  // The back end stops the install at once: the next status read says so.
  setRpcHandler("cancel_voice_install", () => {
    install = { phase: "cancelled", stage: "failed", done: true, model_id: "base.en", error: "Install cancelled." };
    return { cancel_requested: true, running: true };
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function startInstall(view: ReturnType<typeof render>) {
  fireEvent.click((await screen.findByText("Install voice engine")).closest("button")!);
  await screen.findByLabelText(CANCEL);
  await advance(600);
  return view;
}

describe("Cancel on the voice install shows its result within a second", () => {
  it("on the tab: the card leaves Stopping within 400 ms and the install button is back", async () => {
    await startInstall(render(<Panel onTab />));
    await justAfterARead();
    fireEvent.click(screen.getByLabelText(CANCEL));
    expect(screen.getByText("Stopping the install")).toBeTruthy();
    await advance(400);
    expect(screen.queryByText("Stopping the install")).toBeNull();
    expect(screen.queryByLabelText(CANCEL)).toBeNull();
    expect(screen.getByText("Install voice engine")).toBeTruthy();
  });

  it("away from the tab: the bar leaves Stopping within 400 ms and says it was cancelled", async () => {
    const view = await startInstall(render(<Panel onTab />));
    view.rerender(<Panel onTab={false} />);
    await advance(600);
    expect(document.querySelector(BAR)).not.toBeNull();
    await justAfterARead();
    fireEvent.click(screen.getByLabelText(BAR_CANCEL));
    expect(document.querySelector(BAR)!.textContent).toContain("Stopping the install");
    await advance(400);
    expect(document.querySelector(BAR)!.textContent).not.toContain("Stopping");
    expect(document.querySelector(BAR)!.textContent).toContain("Voice install cancelled");
  });
});
