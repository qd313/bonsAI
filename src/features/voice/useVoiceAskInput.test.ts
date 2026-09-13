import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useVoiceAskInput } from "./useVoiceAskInput";
import { setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const uiT = (key: string) => key;

describe("useVoiceAskInput askCameFromMic flag", () => {
  it("is false until a transcription lands", () => {
    const { result } = renderHook(() =>
      useVoiceAskInput({
        setUnifiedInput: () => {},
        unifiedInput: "",
        microphoneAccess: true,
        isAsking: false,
        uiT,
      }),
    );
    expect(result.current.askCameFromMic).toBe(false);
  });

  it("is set once a transcription is written into the field", async () => {
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: true,
      partial_transcript: "how do i beat the boss",
      finalized_transcript: "",
    }));

    let fieldText = "";
    const { result } = renderHook(() =>
      useVoiceAskInput({
        setUnifiedInput: vi.fn((updater: unknown) => {
          fieldText = typeof updater === "function" ? (updater as (s: string) => string)(fieldText) : String(updater);
        }),
        unifiedInput: fieldText,
        microphoneAccess: true,
        isAsking: false,
        uiT,
      }),
    );

    await act(async () => {
      result.current.onMicInput();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.askCameFromMic).toBe(true);
  });

  it("clearAskCameFromMic turns the flag back off, for a manual edit or a clear", async () => {
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: true,
      partial_transcript: "how do i beat the boss",
      finalized_transcript: "",
    }));

    const { result } = renderHook(() =>
      useVoiceAskInput({
        setUnifiedInput: () => {},
        unifiedInput: "",
        microphoneAccess: true,
        isAsking: false,
        uiT,
      }),
    );

    await act(async () => {
      result.current.onMicInput();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.askCameFromMic).toBe(true);

    act(() => {
      result.current.clearAskCameFromMic();
    });
    expect(result.current.askCameFromMic).toBe(false);
  });
});
