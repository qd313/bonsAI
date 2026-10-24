/**
 * Title: A failed status check stops the recording on the back end
 *
 * Purpose: While the mic is listening, the screen checks the back end several times a second. If one
 * of those checks fails, the screen goes idle and shows the error, and it must also tell the back
 * end to stop. Otherwise the back end keeps recording until its two-minute limit ends it. A check
 * that fails after the person already stopped, or after a newer recording replaced it, must not
 * stop anything.
 *
 * Does not: test the back end's own stop (tests/test_voice_session_status.py does), or the question
 * box text (src/features/voice/ does).
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useVoiceTranscription } from "./useVoiceTranscription";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return { ...stubs };
});

const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method).length;
const settle = (ms = 60) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));

const stoppedReply = {
  stopped: true,
  status: "stopped",
  recording: false,
  streaming: false,
  partial_transcript: "",
  finalized_transcript: "",
};

function mountVoice() {
  const onError = vi.fn();
  const setUnifiedInput = vi.fn();
  const hook = renderHook(() => useVoiceTranscription(setUnifiedInput, onError));
  return { ...hook, onError };
}

/** Makes the next status check hang until the test rejects it. */
function holdStatusCheck(): { fail: (e: Error) => void } {
  const hold = { fail: (_e: Error) => {} };
  setRpcHandler(
    "get_voice_transcription_status",
    () => new Promise((_resolve, reject) => (hold.fail = reject)),
  );
  return hold;
}

describe("a failed status check on the screen", () => {
  it("tells the back end to stop, exactly once, and goes idle with the error", async () => {
    resetFakeDeckyRpc();
    const failure = new Error("status check failed");
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("get_voice_transcription_status", () => {
      throw failure;
    });
    setRpcHandler("stop_voice_transcription", () => stoppedReply);
    const { result, onError } = mountVoice();

    await act(async () => {
      await result.current.startVoiceTranscription("");
    });
    await settle();

    expect(calls("stop_voice_transcription")).toBe(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBe(failure);
    expect(result.current.isVoiceRecording()).toBe(false);
  });

  it("still shows the error when the back end's stop also fails, and does not throw", async () => {
    resetFakeDeckyRpc();
    const failure = new Error("status check failed");
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("get_voice_transcription_status", () => {
      throw failure;
    });
    setRpcHandler("stop_voice_transcription", () => {
      throw new Error("stop failed too");
    });
    const { result, onError } = mountVoice();

    await act(async () => {
      await result.current.startVoiceTranscription("");
    });
    await settle();

    expect(calls("stop_voice_transcription")).toBe(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBe(failure);
  });

  it("does not stop anything when the check fails after the person already stopped", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("stop_voice_transcription", () => stoppedReply);
    const hold = holdStatusCheck();
    const { result, onError } = mountVoice();

    await act(async () => {
      await result.current.startVoiceTranscription("");
    });
    await act(async () => {
      await result.current.stopVoiceTranscription();
    });
    expect(calls("stop_voice_transcription")).toBe(1);

    await act(async () => {
      hold.fail(new Error("late failure"));
    });
    await settle();

    expect(calls("stop_voice_transcription")).toBe(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not stop a newer recording when the check fails after it was replaced", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("stop_voice_transcription", () => stoppedReply);
    const hold = holdStatusCheck();
    const { result, onError } = mountVoice();

    await act(async () => {
      await result.current.startVoiceTranscription("");
    });
    act(() => {
      result.current.invalidateVoice();
    });

    await act(async () => {
      hold.fail(new Error("late failure"));
    });
    await settle();

    expect(calls("stop_voice_transcription")).toBe(0);
    expect(onError).not.toHaveBeenCalled();
  });
});
