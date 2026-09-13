import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useVoiceAskInput } from "./useVoiceAskInput";
import { setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { useVoiceTranscription } from "../../hooks/useVoiceTranscription";

// Spies on the real hook (still calling through to it) so a test can reach into the exact
// field-writer callback useVoiceAskInput hands it — the only way to drive that callback with a
// functional SetStateAction, which every real transcription update in this codebase never does.
vi.mock("../../hooks/useVoiceTranscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/useVoiceTranscription")>();
  return {
    ...actual,
    useVoiceTranscription: vi.fn(actual.useVoiceTranscription),
  };
});

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

describe("useVoiceAskInput lastVoiceText", () => {
  it("records the text a string transcription wrote into the field", async () => {
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

    expect(result.current.lastVoiceText).toBe("how do i beat the boss");
  });

  it("records the computed result when the transcription arrives as a functional update appending to seed text", () => {
    let fieldText = "seed text";
    const setUnifiedInput = vi.fn((updater: unknown) => {
      fieldText = typeof updater === "function" ? (updater as (s: string) => string)(fieldText) : String(updater);
    });

    const { result } = renderHook(() =>
      useVoiceAskInput({
        setUnifiedInput,
        unifiedInput: fieldText,
        microphoneAccess: true,
        isAsking: false,
        uiT,
      }),
    );

    // useVoiceAskInput hands useVoiceTranscription the exact field-writer a real dictation drives.
    // Real transcription updates are always plain strings, so this reaches the same callback with
    // a functional SetStateAction instead, the shape a caller appending to seed text would send.
    const setUnifiedInputFromVoice = vi.mocked(useVoiceTranscription).mock.calls[0][0];

    act(() => {
      setUnifiedInputFromVoice((prev) => `${prev} more words`);
    });

    expect(result.current.lastVoiceText).toBe("seed text more words");
    expect(fieldText).toBe("seed text more words");
  });
});
