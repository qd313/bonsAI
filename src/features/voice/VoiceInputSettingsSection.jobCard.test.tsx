/**
 * Title: The voice install on the job card: its first Cancel, the bar when you leave, the ring
 *
 * Purpose: Pin plan 106 lane F3's row P105-JOB-CARD-ELSEWHERE-01 for the voice install (board 5, tab 2, round 2
 * "Elsewhere"). A on "Install voice engine" swaps the button for one job card ("Voice engine install", what it is
 * doing in plain words, the sites, Cancel) and Steam's ring is on Cancel on the same press; the card follows the
 * install's stage ("Fetching the build image", "Building the voice engine", "Downloading the base.en speech model",
 * "Checking the file"); Cancel (the install's first) asks the back end to stop through `cancel_voice_install`, once, not
 * in the first half second, and a stop that is refused puts Cancel back; leave the tab and the bar shows the install
 * with its Cancel, come back and it goes; an install that ends while away is noticed by the job itself and the bar says
 * how it ended; a cancelled install reads as cancelled (not a red failure); the ring goes back to the install button
 * when the install ends.
 *
 * Does not: run the install or know what a stop leaves on disk (tests/test_voice_install_cancel.py does).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { putSteamRingOn, steamRingHolder } from "../../test-harness/steamRing";

const CANCEL = "Cancel the voice install";
const BAR = "[data-bonsai-job-bar]";
const BAR_CANCEL = "Cancel: Voice engine install";

type Install = Record<string, unknown>;
let install: Install = { phase: "idle", done: true };

const RUNNING = (stage: string, extra: Install = {}): Install => ({ phase: "running", stage, done: false, model_id: "base.en", ...extra });

const section = () => <VoiceInputSettingsSection voiceSttModel="base.en" setVoiceSttModel={() => {}} microphoneAccessEnabled />;
function Panel({ onSettings }: { onSettings: boolean }) {
  return (
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab={onSettings ? "settings" : "main"}>
      {onSettings ? section() : <div>another tab</div>}
      <JobBar />
    </div>
  );
}

const bar = () => document.querySelector<HTMLElement>(BAR);
const cancelCalls = () => getRpcCallLog().filter((c) => c.method === "cancel_voice_install");
const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const ringName = () => steamRingHolder()?.getAttribute("aria-label") ?? steamRingHolder()?.textContent ?? "(no ring)";
const installButton = () => screen.getByText("Install voice engine").closest("button") as HTMLElement;
const wait = (ms: number) => act(async () => new Promise<void>((r) => setTimeout(r, ms)));

beforeEach(() => {
  resetFakeDeckyRpc();
  resetVoiceInstallMarkerForTests();
  resetModalReturnFocusRegistry();
  resetNavFocusRegistry();
  install = { phase: "idle", done: true };
  setRpcHandler("get_voice_engine_status", () => ({
    model_id: "base.en",
    binary_ready: install.phase === "done",
    model_ready: install.phase === "done",
    ready: install.phase === "done",
    install,
  }));
  setRpcHandler("get_voice_install_status", () => install);
  setRpcHandler("install_voice_engine", () => {
    install = RUNNING("binary_pull_start");
    return { accepted: true, model_id: "base.en" };
  });
  setRpcHandler("cancel_voice_install", () => ({ cancel_requested: true, running: true }));
});
afterEach(() => cleanup());

async function pressInstall() {
  await screen.findByText("Install voice engine");
  act(() => putSteamRingOn(installButton()));
  await act(async () => void fireEvent.click(installButton()));
  await screen.findByLabelText(CANCEL);
}

describe("the voice install on the card", () => {
  it("on the same press the button gives way to the card and Steam's ring is on its Cancel", async () => {
    render(section());
    await pressInstall();
    await waitFor(() => expect(ringName()).toBe(CANCEL));
    expect(screen.queryByText("Install voice engine")).toBeNull();
    expect(screen.getByText("Voice engine install")).toBeTruthy();
    expect(screen.getByText("Fetching the build image")).toBeTruthy();
    expect(screen.getByText("From ghcr.io and huggingface.co, and the build image's package servers")).toBeTruthy();
  });

  it("follows the install: building the engine, the speech model with its share, then checking the file", async () => {
    render(section());
    await pressInstall();
    install = RUNNING("binary_build_start");
    expect(await screen.findByText("Building the voice engine", undefined, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText("This part has no percentage. It can take a few minutes.")).toBeTruthy();
    install = RUNNING("downloading", { progress_pct: 40 });
    expect(await screen.findByText("Downloading the base.en speech model", undefined, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText("59 of 148 MB")).toBeTruthy();
    expect(document.querySelector<HTMLElement>(".bonsai-job-progress__fill")!.style.width).toBe("40%");
    install = RUNNING("verifying", { progress_pct: 100 });
    expect(await screen.findByText("Checking the file", undefined, { timeout: 4000 })).toBeTruthy();
  });

  it("Cancel in the first half second does nothing; a later one stops the install once and the card says it is stopping", async () => {
    render(section());
    await pressInstall();
    fireEvent.click(screen.getByLabelText(CANCEL));
    expect(cancelCalls()).toHaveLength(0);
    await wait(520);
    fireEvent.click(screen.getByLabelText(CANCEL));
    fireEvent.click(screen.getByLabelText(CANCEL));
    await waitFor(() => expect(cancelCalls()).toHaveLength(1));
    expect(screen.getByText("Stopping the install")).toBeTruthy();
  });

  it("a stop the back end refuses puts Cancel back with the words", async () => {
    setRpcHandler("cancel_voice_install", () => {
      throw new Error("could not reach the back end");
    });
    render(section());
    await pressInstall();
    await wait(520);
    fireEvent.click(screen.getByLabelText(CANCEL));
    expect(await screen.findByText("Could not stop. Try again.")).toBeTruthy();
    expect(screen.getByLabelText(CANCEL).textContent).toContain("Cancel");
  });

  it("a cancelled install reads as cancelled, not a red failure, and the install button is back with the ring on it", async () => {
    render(section());
    await pressInstall();
    await waitFor(() => expect(ringName()).toBe(CANCEL));
    install = { phase: "cancelled", stage: "failed", done: true, model_id: "base.en", error: "Install cancelled." };
    await screen.findByText("Install voice engine", undefined, { timeout: 4000 });
    expect(screen.getByText(/Install cancelled\. Press Install voice engine to start again\./)).toBeTruthy();
    const note = screen.getByText(/Install cancelled\. Press Install voice engine/);
    expect(note.getAttribute("style")).not.toContain("f87171");
    await waitFor(() => expect(ringName()).toMatch(/Install voice engine/));
  });

  it("a progress read that fails while the install goes on does not strand the card: the job reads on and ends it", async () => {
    let reads = 0;
    setRpcHandler("get_voice_install_status", () => {
      reads += 1;
      if (reads === 1) throw new Error("socket closed");
      return install;
    });
    render(section());
    await pressInstall();
    // The section's own poll gave up on that read; the install is still running, so the card stays...
    await wait(1700);
    expect(screen.getByLabelText(CANCEL)).toBeTruthy();
    // ...and the job's own reads see it end.
    install = { phase: "done", stage: "model_ready", done: true, model_id: "base.en" };
    await waitFor(() => expect(screen.queryByLabelText(CANCEL)).toBeNull(), { timeout: 5000 });
    // The install button is back (it reads Reinstall once the section has read that the engine is in place).
    expect(await screen.findByText(/install voice engine/i)).toBeTruthy();
  });

  it("a real failure still shows the back end's reason in red", async () => {
    render(section());
    await pressInstall();
    install = { phase: "failed", stage: "failed", done: true, model_id: "base.en", error: "podman pull failed" };
    const reason = await screen.findByText("podman pull failed", undefined, { timeout: 4000 });
    expect(reason.getAttribute("style")).toContain("rgb(248, 113, 113)");
  });
});

describe("the voice install on the bar", () => {
  it("leaving the tab brings the bar with the install and its Cancel; coming back takes it away", async () => {
    const view = render(<Panel onSettings />);
    await pressInstall();
    expect(bar()).toBeNull();
    view.rerender(<Panel onSettings={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    expect(bar()!.textContent).toContain("Voice engine install");
    expect(screen.getByLabelText(BAR_CANCEL)).toBeTruthy();
    view.rerender(<Panel onSettings />);
    await waitFor(() => expect(bar()).toBeNull());
    expect(screen.getByLabelText(CANCEL)).toBeTruthy();
  });

  it("Cancel from the bar stops the install", async () => {
    const view = render(<Panel onSettings />);
    await pressInstall();
    view.rerender(<Panel onSettings={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    await wait(520);
    fireEvent.click(screen.getByLabelText(BAR_CANCEL));
    await waitFor(() => expect(cancelCalls()).toHaveLength(1));
    expect(bar()!.textContent).toContain("Stopping the install");
  });

  it("the bar's one line follows the speech model download (the drawing's 40% · 59 of 148 MB)", async () => {
    const view = render(<Panel onSettings />);
    await pressInstall();
    view.rerender(<Panel onSettings={false} />);
    install = RUNNING("downloading", { progress_pct: 40 });
    await waitFor(() => expect(bar()?.textContent).toContain("40% · 59 of 148 MB"), { timeout: 4000 });
  });

  it("an install that ends while you are away is seen by the job itself, and the bar says how it ended", async () => {
    const view = render(<Panel onSettings />);
    await pressInstall();
    view.rerender(<Panel onSettings={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    install = { phase: "done", stage: "model_ready", done: true, model_id: "base.en" };
    await waitFor(() => expect(bar()?.textContent).toContain("Voice install finished"), { timeout: 4000 });
    expect(bar()!.textContent).toContain("Voice engine installed.");
    expect(byLabel(BAR_CANCEL)).toBeNull();
  });

  it("a cancelled install that ends while you are away says so on the bar, quietly", async () => {
    const view = render(<Panel onSettings />);
    await pressInstall();
    view.rerender(<Panel onSettings={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    install = { phase: "cancelled", stage: "failed", done: true, model_id: "base.en", error: "Install cancelled." };
    await waitFor(() => expect(bar()?.textContent).toContain("Voice install cancelled"), { timeout: 4000 });
    expect(bar()!.dataset.tone).toBe("quiet");
  });
});
