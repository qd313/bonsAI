/**
 * Title: The Voice input section keeps up with an install across a rebuild
 *
 * Purpose: Pin what a person sees when the voice engine install finishes: the open section's text turns
 * to "ready" within 5 seconds and one "Voice engine ready" toast shows, without leaving the tab. Covers
 * the section mounting while an install is already running, the download box closing (the section is
 * unmounted and mounted again), and a failed progress read.
 *
 * Used for: Plan 96 row F9 (P96-F9-VOICE-REFRESH).
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";

vi.mock("../downloads/downloadNotice", () => ({ confirmDownload: async () => true }));

import { VoiceInputSettingsSection } from "./VoiceInputSettingsSection";
import { resetVoiceInstallMarkerForTests } from "./voiceInstallBusyStore";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

type Phase = "idle" | "running" | "done";
let phase: Phase = "idle";
let pollFails = false;

function installBody(p: Phase) {
  return p === "running"
    ? { phase: "running", stage: "download_start", done: false, progress_pct: 40 }
    : { phase: p, done: true };
}

function wireBackEnd() {
  setRpcHandler("get_voice_engine_status", () => {
    const ready = phase === "done";
    return {
      model_id: "tiny.en",
      binary_ready: ready,
      model_ready: ready,
      ready,
      install: installBody(phase),
    };
  });
  setRpcHandler("get_voice_install_status", () => {
    if (pollFails) throw new Error("socket closed");
    return installBody(phase);
  });
  setRpcHandler("install_voice_engine", () => {
    phase = "running";
    return { accepted: true };
  });
}

const mountSection = () =>
  render(<VoiceInputSettingsSection voiceSttModel="tiny.en" setVoiceSttModel={() => {}} microphoneAccessEnabled />);

const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const readyToasts = () =>
  vi.mocked(toaster.toast).mock.calls.filter((c) => (c[0] as { title?: string }).title === "Voice engine ready");
const statusReads = () => getRpcCallLog().filter((c) => c.method === "get_voice_engine_status").length;

beforeEach(() => {
  vi.useFakeTimers();
  resetFakeDeckyRpc();
  resetVoiceInstallMarkerForTests();
  vi.mocked(toaster.toast).mockClear();
  phase = "idle";
  pollFails = false;
  wireBackEnd();
});
afterEach(() => vi.useRealTimers());

describe("Voice input section after the install finishes", () => {
  it("mounted while an install runs, it reads ready within 5 s of the finish, with one toast", async () => {
    phase = "running";
    mountSection();
    await advance(100);
    expect(screen.getByText(/whisper-cli not installed/)).toBeTruthy();
    expect(screen.getByText(/Installing…/)).toBeTruthy();

    phase = "done";
    await advance(4900);
    expect(screen.getByText(/whisper-cli ready/)).toBeTruthy();
    expect(screen.getByText(/tiny.en ready/)).toBeTruthy();
    expect(screen.getByText(/Voice engine is ready for on-device transcription/)).toBeTruthy();
    expect(readyToasts()).toHaveLength(1);
    await advance(10_000);
    expect(readyToasts()).toHaveLength(1);
  });

  it("the box closing rebuilds the section: the new copy still shows ready after the finish", async () => {
    const first = mountSection();
    await advance(100);
    fireEvent.click(screen.getByText("Install voice engine"));
    await advance(100);
    first.unmount();
    mountSection();
    await advance(100);

    phase = "done";
    await advance(4900);
    expect(screen.getByText(/whisper-cli ready/)).toBeTruthy();
    expect(readyToasts()).toHaveLength(1);
  });

  it("a rebuilt copy whose first read still says idle keeps watching and does not stop early", async () => {
    const first = mountSection();
    await advance(100);
    fireEvent.click(screen.getByText("Install voice engine"));
    await advance(100);
    first.unmount();
    // The back end has not yet taken up the install when the new copy reads once.
    phase = "idle";
    mountSection();
    await advance(2500);
    expect(screen.getByText(/Installing…/)).toBeTruthy();

    phase = "done";
    await advance(4900);
    expect(screen.getByText(/whisper-cli ready/)).toBeTruthy();
    expect(readyToasts()).toHaveLength(1);
  });

  it("a failed progress read refreshes the status once more and then stops polling", async () => {
    phase = "running";
    mountSection();
    await advance(100);
    pollFails = true;
    phase = "done";
    const before = statusReads();
    await advance(5000);
    expect(statusReads()).toBe(before + 1);
    expect(screen.getByText(/whisper-cli ready/)).toBeTruthy();
    const pollsAfter = getRpcCallLog().filter((c) => c.method === "get_voice_install_status").length;
    await advance(10_000);
    expect(getRpcCallLog().filter((c) => c.method === "get_voice_install_status").length).toBe(pollsAfter);
  });
});
