/**
 * Title: The mic press tells the back end whether a game is running
 *
 * Purpose: With no game running the live words come as fast as the engine can make them; with a game
 * running the back end rests between passes to keep the game smooth (plan 88 follow-up). It can only
 * choose if the screen says which case it is, so the start call carries one true-or-false argument,
 * read from Steam at the moment of the press. These tests pin that argument for a running game, no
 * game, and a Steam that cannot answer.
 *
 * Does not: test the pacing itself (tests/test_voice_whole_recording.py does).
 */
import { act, renderHook } from "@testing-library/react";
import { Router } from "@decky/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useVoiceTranscription } from "../../hooks/useVoiceTranscription";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return { ...stubs, showModal: () => ({ Close: () => {} }) };
});

type RunningApp = typeof Router.MainRunningApp;
const original = Router.MainRunningApp;
const setRunningApp = (app: unknown) => {
  (Router as { MainRunningApp: RunningApp }).MainRunningApp = app as RunningApp;
};

async function pressMic(): Promise<unknown[]> {
  const { result } = renderHook(() => useVoiceTranscription(() => {}, () => {}));
  await act(async () => {
    await result.current.startVoiceTranscription("");
  });
  const starts = getRpcCallLog().filter((c) => c.method === "start_voice_transcription");
  expect(starts).toHaveLength(1);
  return starts[0].args;
}

describe("start_voice_transcription carries whether a game is running", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: true,
      partial_transcript: "",
      finalized_transcript: "",
    }));
  });

  afterEach(() => setRunningApp(original));

  it("sends true when Steam reports a running app", async () => {
    setRunningApp({ appid: 220, display_name: "Half-Life 2" });
    expect(await pressMic()).toEqual([true]);
  });

  it("sends false when Steam reports no running app", async () => {
    setRunningApp(undefined);
    expect(await pressMic()).toEqual([false]);
  });

  it("sends false for an empty or zero app id", async () => {
    setRunningApp({ appid: 0, display_name: "" });
    expect(await pressMic()).toEqual([false]);
  });

  it("sends false when reading Steam's running app throws", async () => {
    Object.defineProperty(Router, "MainRunningApp", {
      configurable: true,
      get() {
        throw new Error("Steam is not ready");
      },
    });
    try {
      expect(await pressMic()).toEqual([false]);
    } finally {
      Object.defineProperty(Router, "MainRunningApp", { configurable: true, writable: true, value: original });
    }
  });
});
