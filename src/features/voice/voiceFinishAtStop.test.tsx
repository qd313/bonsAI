/**
 * Title: Stop reads the whole recording once, and the screen waits for that text
 *
 * Purpose: While you talk the question box shows live words. When you press Stop (or Ask) the back
 * end reads the whole recording once more and sends back the clean final text (plan 88). These tests
 * pin what the screen does around that wait: the mic button is busy and ignores presses, the final
 * text replaces the live words only if nothing newer has happened, a recording the back end ended
 * by itself puts the button back to idle, and Ask while talking asks with the final text.
 *
 * Does not: test the back end's reading (tests/test_voice_whole_recording.py does).
 */
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { useCallback, useState, type Dispatch, type ReactElement, type SetStateAction } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVoiceAskInput } from "./useVoiceAskInput";
import { useVoiceAskWithReadAloud } from "./useVoiceAskWithReadAloud";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../test-harness/rpcFixtures";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return { ...stubs, showModal: () => ({ Close: () => {} }) };
});

const uiT = (key: string) => key;
const LIVE = "how do i beat the bos";
const FINAL = "how do i beat the boss";

const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method).length;
const settle = (ms = 60) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));

/** A stop the test finishes by hand, so the "finishing" wait can be looked at. */
function holdStop(): { finish: (out: Record<string, unknown>) => void } {
  const hold = { finish: (_out: Record<string, unknown>) => {} };
  setRpcHandler("stop_voice_transcription", () => new Promise((resolve) => (hold.finish = resolve)));
  return hold;
}

const stoppedWith = (text: string) => ({
  stopped: true,
  status: "stopped",
  recording: false,
  streaming: false,
  partial_transcript: "",
  finalized_transcript: text,
});

function listeningTo(live: string) {
  setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
  setRpcHandler("get_voice_transcription_status", () => ({
    status: "recording",
    recording: true,
    streaming: true,
    partial_transcript: live,
    finalized_transcript: "",
  }));
}

/** The caller owns the question box, as the real screen does. */
function useBox() {
  const [box, setBox] = useState("");
  const writes: string[] = [];
  const setUnifiedInput: Dispatch<SetStateAction<string>> = (v) => {
    writes.push(String(v));
    setBox(v);
  };
  return { box, setBox, writes, setUnifiedInput };
}

function mountVoice() {
  return renderHook(() => {
    const field = useBox();
    const voice = useVoiceAskInput({
      setUnifiedInput: field.setUnifiedInput,
      unifiedInput: field.box,
      microphoneAccess: true,
      isAsking: false,
      uiT,
    });
    return { ...field, voice };
  });
}

async function startAndHear(result: { current: ReturnType<typeof mountVoice>["result"]["current"] }) {
  await act(async () => {
    result.current.voice.onMicInput();
    await new Promise((r) => setTimeout(r, 80));
  });
  expect(result.current.box).toBe(LIVE);
  expect(result.current.voice.voiceRecording).toBe(true);
}

describe("Stop: the final text replaces the live words", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    listeningTo(LIVE);
  });

  it("is busy while the back end reads the recording, then writes the final text", async () => {
    const hold = holdStop();
    const { result } = mountVoice();
    await startAndHear(result);

    await act(async () => {
      result.current.voice.onMicInput();
      await Promise.resolve();
    });
    expect(result.current.voice.voiceRecording).toBe(false);
    expect(result.current.voice.voiceFinishing).toBe(true);
    expect(result.current.box).toBe(LIVE);

    await act(async () => {
      hold.finish(stoppedWith(FINAL));
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current.voice.voiceFinishing).toBe(false);
    expect(result.current.box).toBe(FINAL);
  });

  it("ignores a mic press while finishing: no second stop, no new recording", async () => {
    const hold = holdStop();
    const { result } = mountVoice();
    await startAndHear(result);
    await act(async () => {
      result.current.voice.onMicInput();
      await Promise.resolve();
    });

    await act(async () => {
      result.current.voice.onMicInput();
      result.current.voice.onMicInput();
      await Promise.resolve();
    });
    expect(calls("stop_voice_transcription")).toBe(1);
    expect(calls("start_voice_transcription")).toBe(1);
    expect(result.current.voice.voiceFinishing).toBe(true);

    await act(async () => {
      hold.finish(stoppedWith(FINAL));
      await new Promise((r) => setTimeout(r, 20));
    });
    // The wait is over: the next press starts a recording again.
    await act(async () => {
      result.current.voice.onMicInput();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(calls("start_voice_transcription")).toBe(2);
  });

  it("X during finishing keeps the box empty", async () => {
    const hold = holdStop();
    const { result } = mountVoice();
    await startAndHear(result);
    await act(async () => {
      result.current.voice.onMicInput();
      await Promise.resolve();
    });

    await act(async () => {
      result.current.setBox("");
    });
    await act(async () => {
      hold.finish(stoppedWith(FINAL));
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current.box).toBe("");
    expect(result.current.voice.voiceFinishing).toBe(false);
  });

  it("keeps what the person typed during the wait instead of overwriting it", async () => {
    const hold = holdStop();
    const { result } = mountVoice();
    await startAndHear(result);
    await act(async () => {
      result.current.voice.onMicInput();
      await Promise.resolve();
    });

    await act(async () => {
      result.current.setBox(`${LIVE} please`);
    });
    await act(async () => {
      hold.finish(stoppedWith(FINAL));
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current.box).toBe(`${LIVE} please`);
  });

  it("keeps the live words when the final text comes back empty", async () => {
    setRpcHandler("stop_voice_transcription", () => stoppedWith(""));
    const { result } = mountVoice();
    await startAndHear(result);
    await act(async () => {
      result.current.voice.onMicInput();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current.box).toBe(LIVE);
  });
});

describe("a recording the back end finished by itself", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
  });

  it("puts the final text in the box and returns the button to idle", async () => {
    let phase: "recording" | "stopped" = "recording";
    setRpcHandler("get_voice_transcription_status", () =>
      phase === "recording"
        ? { status: "recording", recording: true, streaming: true, partial_transcript: LIVE, finalized_transcript: "" }
        : { status: "stopped", recording: false, streaming: false, partial_transcript: "", finalized_transcript: FINAL },
    );
    const { result } = mountVoice();
    await startAndHear(result);

    phase = "stopped";
    await waitFor(() => expect(result.current.voice.voiceRecording).toBe(false));
    expect(result.current.box).toBe(FINAL);
    expect(result.current.voice.voiceFinishing).toBe(false);
    // The poll is over: nothing more is asked of the back end.
    const polls = calls("get_voice_transcription_status");
    await settle(400);
    expect(calls("get_voice_transcription_status")).toBe(polls);
  });

  it("shows the button busy while the back end reads the recording, then idle", async () => {
    let phase: "recording" | "finishing" | "stopped" = "recording";
    setRpcHandler("get_voice_transcription_status", () => {
      if (phase === "recording") {
        return { status: "recording", recording: true, streaming: true, partial_transcript: LIVE, finalized_transcript: "" };
      }
      if (phase === "finishing") {
        return { status: "finishing", recording: false, streaming: false, partial_transcript: LIVE, finalized_transcript: "" };
      }
      return { status: "stopped", recording: false, streaming: false, partial_transcript: "", finalized_transcript: FINAL };
    });
    const { result } = mountVoice();
    await startAndHear(result);

    phase = "finishing";
    await waitFor(() => expect(result.current.voice.voiceFinishing).toBe(true));
    expect(result.current.voice.voiceRecording).toBe(false);

    phase = "stopped";
    await waitFor(() => expect(result.current.voice.voiceFinishing).toBe(false));
    expect(result.current.voice.voiceRecording).toBe(false);
    expect(result.current.box).toBe(FINAL);
  });
});

describe("a reading that comes back empty in the middle of a recording", () => {
  it("never blanks the words already in the box, and the recording goes on", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
    let words = LIVE;
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: true,
      partial_transcript: words,
      finalized_transcript: "",
    }));
    const { result } = mountVoice();
    await startAndHear(result);

    words = "";
    await settle(500);
    expect(result.current.box).toBe(LIVE);
    expect(result.current.voice.voiceRecording).toBe(true);
    expect(calls("stop_voice_transcription")).toBe(0);
  });
});

describe("Ask while the mic is listening", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    listeningTo(LIVE);
  });

  /** The Ask screen's own wiring, reduced: the question asked is whatever the box holds in the render that asks. */
  function mountAsk() {
    const asked: string[] = [];
    const hook = renderHook(() => {
      const field = useBox();
      const onAskOllama = useCallback(
        async () => {
          asked.push(field.box);
        },
        [field.box],
      );
      const voice = useVoiceAskWithReadAloud({
        setUnifiedInput: field.setUnifiedInput,
        unifiedInput: field.box,
        microphoneAccess: true,
        isAsking: false,
        uiT: uiT as never,
        clearAskCameFromMicRef: { current: () => {} },
        voiceReplyMode: "off",
        strategySpoilerMaskingEnabled: true,
        settingsLoaded: true,
        onAskOllama: onAskOllama as never,
      });
      return { ...field, voice };
    });
    return { ...hook, asked };
  }

  it("asks with the final text, last words included", async () => {
    const hold = holdStop();
    const { result, asked } = mountAsk();
    await act(async () => {
      result.current.voice.onMicInput();
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(result.current.box).toBe(LIVE);

    let pressed: Promise<unknown> = Promise.resolve();
    await act(async () => {
      pressed = result.current.voice.onAskOllamaWithReadAloud() as Promise<unknown>;
      await Promise.resolve();
    });
    // Nothing is asked while the back end is still reading the recording.
    expect(asked).toEqual([]);
    expect(result.current.voice.voiceFinishing).toBe(true);

    // The press is waiting for the box to show the new text, so look from outside act.
    await act(async () => {
      hold.finish(stoppedWith(FINAL));
      await Promise.resolve();
    });
    await waitFor(() => expect(asked).toEqual([FINAL]));
    await pressed;
    expect(result.current.box).toBe(FINAL);
  });

  it("a second Ask press during the wait does not ask twice", async () => {
    const hold = holdStop();
    const { result, asked } = mountAsk();
    await act(async () => {
      result.current.voice.onMicInput();
      await new Promise((r) => setTimeout(r, 80));
    });

    let first: Promise<unknown> = Promise.resolve();
    let second: Promise<unknown> = Promise.resolve();
    await act(async () => {
      first = result.current.voice.onAskOllamaWithReadAloud() as Promise<unknown>;
      await Promise.resolve();
      second = result.current.voice.onAskOllamaWithReadAloud() as Promise<unknown>;
      await Promise.resolve();
    });
    await act(async () => {
      hold.finish(stoppedWith(FINAL));
      await Promise.resolve();
    });
    await waitFor(() => expect(asked).toEqual([FINAL]));
    await Promise.all([first, second]);
    expect(asked).toEqual([FINAL]);
    expect(calls("stop_voice_transcription")).toBe(1);
  });

  it("asks with what the person typed during the wait", async () => {
    const hold = holdStop();
    const { result, asked } = mountAsk();
    await act(async () => {
      result.current.voice.onMicInput();
      await new Promise((r) => setTimeout(r, 80));
    });

    let pressed: Promise<unknown> = Promise.resolve();
    await act(async () => {
      pressed = result.current.voice.onAskOllamaWithReadAloud() as Promise<unknown>;
      await Promise.resolve();
    });
    await act(async () => {
      result.current.setBox("something I typed instead");
    });
    await act(async () => {
      hold.finish(stoppedWith(FINAL));
      await pressed;
    });
    expect(asked).toEqual(["something I typed instead"]);
  });

  it("asks at once when the mic is not listening", async () => {
    const { result, asked } = mountAsk();
    await act(async () => {
      result.current.setBox("typed question");
    });
    await act(async () => {
      await result.current.voice.onAskOllamaWithReadAloud();
    });
    expect(asked).toEqual(["typed question"]);
    expect(calls("stop_voice_transcription")).toBe(0);
  });
});

describe("the microphone button on the whole screen while Stop is finishing", () => {
  async function mountPlugin(): Promise<ReturnType<typeof render>> {
    vi.resetModules();
    const plugin = (await import("../../index")).default as { content?: unknown };
    const view = render(plugin.content as ReactElement);
    await waitFor(() => expect(calls("load_settings")).toBeGreaterThan(0));
    await settle(40);
    return view;
  }

  const button = (container: HTMLElement, label: string) => container.querySelector(`[aria-label="${label}"]`) as HTMLElement | null;

  async function press(container: HTMLElement, label: string) {
    await waitFor(() => expect(button(container, label)).not.toBeNull(), { timeout: 5_000 });
    await act(async () => {
      button(container, label)!.click();
      await new Promise((r) => setTimeout(r, 20));
    });
  }

  it("reads 'Finishing voice input', ignores a press, then goes back to the plain microphone", async () => {
    resetFakeDeckyRpc();
    window.localStorage.clear();
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      capabilities: { ...defaultSettingsFixture().capabilities, microphone_access: true },
    }));
    listeningTo(LIVE);
    const hold = holdStop();

    const { container } = await mountPlugin();
    await press(container, "Voice input");
    await waitFor(() => expect(button(container, "Stop voice input")).not.toBeNull());

    await press(container, "Stop voice input");
    expect(button(container, "Finishing voice input")).not.toBeNull();
    expect(button(container, "Stop voice input")).toBeNull();

    await press(container, "Finishing voice input");
    expect(calls("stop_voice_transcription")).toBe(1);
    expect(calls("start_voice_transcription")).toBe(1);

    await act(async () => {
      hold.finish(stoppedWith(FINAL));
      await new Promise((r) => setTimeout(r, 30));
    });
    await waitFor(() => expect(button(container, "Voice input")).not.toBeNull());
    expect(button(container, "Finishing voice input")).toBeNull();
  }, 120_000);
});
