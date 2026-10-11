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

describe("useVoiceAskInput when the mic's words and the box land in two separate renders", () => {
  /**
   * Steam's React does not always batch two updates made outside a button press into one render.
   * The mic writes "what the mic wrote" first and the box's text second, so for one render the words
   * are set and the box is still empty. That in-between state is the mic's own and must never read
   * as "the person emptied the box" (the likely cause of the early stop seen with a real voice on tiny.en,
   * 2026-10-10; a guess from reading the code until the Deck shows it).
   *
   * The screen below holds the box's new text back until the test lets it through, so every mic write
   * is two renders: the words first (box still as it was), then the box.
   */
  const quiet = () => {
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: true,
      partial_transcript: "",
      finalized_transcript: "",
    }));
  };

  const unbatchedScreen = () => {
    const held: { value: string | null } = { value: null };
    const renders: { box: string; last: string }[] = [];
    const hook = renderHook(() => {
      const [box, setBox] = useState("");
      const setUnifiedInput: Dispatch<SetStateAction<string>> = (v) => {
        held.value = String(v);
      };
      const voice = useVoiceAskInput({ setUnifiedInput, unifiedInput: box, microphoneAccess: true, isAsking: false, uiT });
      renders.push({ box, last: voice.lastVoiceText });
      return { box, setBox, voice };
    });
    /** One mic write as Steam's React may run it: the words render, then (a later render) the box. */
    const micWrites = async (text: string) => {
      const write = vi.mocked(useVoiceTranscription).mock.calls.at(-1)![0];
      await act(async () => {
        write(text);
      });
      await act(async () => {
        hook.result.current.setBox(held.value ?? "");
      });
    };
    const startListening = async () => {
      await act(async () => {
        hook.result.current.voice.onMicInput();
        await new Promise((r) => setTimeout(r, 60));
      });
      expect(hook.result.current.voice.voiceRecording).toBe(true);
    };
    return { ...hook, renders, micWrites, startListening };
  };

  it("keeps listening through several partial transcripts and the box grows to the last one", async () => {
    quiet();
    const { result, renders, micWrites, startListening } = unbatchedScreen();
    await startListening();
    const heard = ["how do", "how do i beat", "how do i beat the first boss", "how do i beat the first boss quickly"];
    for (const text of heard) {
      await micWrites(text);
      expect(result.current.voice.voiceRecording).toBe(true);
      expect(result.current.box).toBe(text);
    }
    // The in-between render really happened: the mic's words set, the box still empty.
    expect(renders.some((r) => r.last !== "" && r.box === "")).toBe(true);
    expect(getRpcCallLog().some((c) => c.method === "stop_voice_transcription")).toBe(false);
  });

  it("still ends dictation when the person empties the box with the X afterwards", async () => {
    quiet();
    const { result, micWrites, startListening } = unbatchedScreen();
    await startListening();
    await micWrites("how do i beat");
    await micWrites("how do i beat the first boss");
    expect(result.current.voice.voiceRecording).toBe(true);
    await act(async () => {
      result.current.setBox("");
    });
    expect(result.current.voice.voiceRecording).toBe(false);
    expect(getRpcCallLog().some((c) => c.method === "stop_voice_transcription")).toBe(true);
  });

  it("still ends dictation when the person deletes the text by hand", async () => {
    quiet();
    const { result, micWrites, startListening } = unbatchedScreen();
    await startListening();
    await micWrites("how do i beat");
    // Hand deleting goes down one step at a time, to nothing.
    await act(async () => {
      result.current.setBox("how do i");
    });
    expect(result.current.voice.voiceRecording).toBe(true);
    await act(async () => {
      result.current.setBox("");
    });
    expect(result.current.voice.voiceRecording).toBe(false);
  });

  it("does not end a recording that has heard nothing yet while the box is empty", async () => {
    quiet();
    const { result, startListening } = unbatchedScreen();
    await startListening();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(result.current.voice.voiceRecording).toBe(true);
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

describe("useVoiceAskInput when the speech model is still downloading", () => {
  it("shows the back end's plain refusal line and records nothing", async () => {
    vi.mocked(toaster.toast).mockClear();
    const line = "The speech model is still downloading. Try again when it finishes.";
    setRpcHandler("start_voice_transcription", () => ({
      accepted: false,
      error: "model_downloading",
      reason: line,
    }));
    const { result } = renderHook(() =>
      useVoiceAskInput({ setUnifiedInput: () => {}, unifiedInput: "", microphoneAccess: true, isAsking: false, uiT }),
    );
    await act(async () => {
      result.current.onMicInput();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Voice input unavailable", body: line }),
    );
    expect(result.current.voiceRecording).toBe(false);
    expect(result.current.voiceStarting).toBe(false);
    expect(getRpcCallLog().some((c) => c.method === "get_voice_transcription_status")).toBe(false);
  });
});
