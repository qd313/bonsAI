import { act, renderHook } from "@testing-library/react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";
import { describe, expect, it, vi } from "vitest";

import { useVoiceAskInput } from "./useVoiceAskInput";
import { getRpcCallLog, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
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

describe("useVoiceAskInput when the box is emptied while the mic is still listening", () => {
  const listening = () => {
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: true,
      partial_transcript: "",
      finalized_transcript: "how do i beat the boss",
    }));
  };

  it("stops the recording and never writes the words back", async () => {
    listening();
    const writes: string[] = [];
    // The caller owns the box, as the real screen does: the loop's writes land in it.
    const { result } = renderHook(() => {
      const [box, setBox] = useState("");
      const setUnifiedInput: Dispatch<SetStateAction<string>> = (v) => {
        writes.push(String(v));
        setBox(v);
      };
      return {
        box,
        setBox,
        voice: useVoiceAskInput({ setUnifiedInput, unifiedInput: box, microphoneAccess: true, isAsking: false, uiT }),
      };
    });
    await act(async () => {
      result.current.voice.onMicInput();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.box).toBe("how do i beat the boss");
    expect(result.current.voice.voiceRecording).toBe(true);

    // The X empties the box.
    await act(async () => {
      result.current.setBox("");
    });
    expect(result.current.voice.voiceRecording).toBe(false);
    const writesBefore = writes.length;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(writes.length).toBe(writesBefore);
    expect(result.current.box).toBe("");
    expect(getRpcCallLog().some((c) => c.method === "stop_voice_transcription")).toBe(true);
  });

  it("leaves a recording alone while the box is still empty because nothing has been heard yet", async () => {
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: true,
      partial_transcript: "",
      finalized_transcript: "",
    }));
    const { result } = renderHook(() =>
      useVoiceAskInput({ setUnifiedInput: () => {}, unifiedInput: "", microphoneAccess: true, isAsking: false, uiT }),
    );
    await act(async () => {
      result.current.onMicInput();
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(result.current.voiceRecording).toBe(true);
  });
});

describe("useVoiceAskInput while an answer is arriving", () => {
  it("answers a mic press with a short toast and starts no recording", async () => {
    vi.mocked(toaster.toast).mockClear();
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    const { result } = renderHook(() =>
      useVoiceAskInput({ setUnifiedInput: () => {}, unifiedInput: "", microphoneAccess: true, isAsking: true, uiT }),
    );
    await act(async () => {
      result.current.onMicInput();
      await Promise.resolve();
    });
    expect(toaster.toast).toHaveBeenCalledTimes(1);
    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Mic is waiting",
        body: "The microphone is off until the answer finishes.",
      }),
    );
    expect(result.current.voiceRecording).toBe(false);
    expect(getRpcCallLog().some((c) => c.method === "start_voice_transcription")).toBe(false);
  });
});
