/**
 * What this file checks: with Voice replies on "When I asked by voice", a question spoken into the
 * microphone gets its finished answer read aloud, and a question typed afterwards does not.
 *
 * It drives the real sequence a player causes and writes the "this came from the mic" note by no
 * hand: the mic writes the words, Ask is pressed, the status polls say "pending" with the request
 * number, then "finished" with the same number, and the number reaches the screen's state in the
 * same breath as the answer is handled (as `useBonsaiAskOrchestration` does). The earlier unit test
 * wrote the note by hand before the answer, so it could not see the answer being handled before the
 * note was there.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCallback, useRef, useState } from "react";

import { useVoiceAskWithReadAloud } from "./useVoiceAskWithReadAloud";
import { useBackgroundGameAi } from "../../hooks/useBackgroundGameAi";
import {
  resetReadAloudCompletionState,
  setReadAloudCompletionContext,
} from "../../hooks/useReadAloud";
import {
  startAskCompletionWatch,
  stopAskCompletionWatch,
} from "../../utils/bonsaiAskCompletionWatch";
import { getRpcCallLog, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { idleBackgroundStatusFixture } from "../../test-harness/rpcFixtures";
import type { BackgroundRequestStatus } from "../../types/backgroundAsk";
import type { VoiceReplyMode } from "../../data/bonsaiSettingsSchema";

const SPOKEN = "how do i beat the boss";

function readAloudStarts(): number {
  return getRpcCallLog().filter((c) => c.method === "start_voice_read_aloud").length;
}

/** Pending until `finishAfter` polls have gone by, then finished, the request number only at the end
 * of the finished status being the same one the pending polls carried. */
function scriptStatusPolls(requestId: number, finishAfter: number): void {
  let polls = 0;
  setRpcHandler("get_background_game_ai_status", (): BackgroundRequestStatus => {
    polls += 1;
    const base = { ...idleBackgroundStatusFixture(), question: "q", request_id: requestId };
    if (polls <= finishAfter) return { ...base, status: "pending" };
    return { ...base, status: "completed", success: true, response: "Hit him from below." };
  });
}

/**
 * The Ask screen's own wiring, reduced: Ask starts the poll loop; the poll hands every status to a
 * function (here a no-op); the voice hook wraps Ask.
 */
function useHarness(options: {
  backgroundWatcher: boolean;
  settingsLoaded?: boolean;
  voiceReplyMode?: VoiceReplyMode;
}) {
  const [unifiedInput, setUnifiedInput] = useState("");
  const clearAskCameFromMicRef = useRef<() => void>(() => {});
  const applyStatus = useCallback((status: BackgroundRequestStatus) => {
    void status;
  }, []);
  const poll = useBackgroundGameAi(applyStatus, () => {});
  const onAskOllama = useCallback(async () => {
    if (options.backgroundWatcher) {
      startAskCompletionWatch();
      return;
    }
    const seq = poll.startNextRequest();
    poll.startBackgroundStatusPolling(seq, "q");
  }, [poll, options.backgroundWatcher]);
  const voice = useVoiceAskWithReadAloud({
    setUnifiedInput,
    unifiedInput,
    microphoneAccess: true,
    isAsking: false,
    uiT: (key: string) => key,
    clearAskCameFromMicRef,
    settingsLoaded: options.settingsLoaded ?? true,
    voiceReplyMode: options.voiceReplyMode ?? "voice_only",
    strategySpoilerMaskingEnabled: true,
    onAskOllama: onAskOllama as never,
  });
  return { voice, setUnifiedInput, unifiedInput };
}

async function speakAQuestion(result: { current: ReturnType<typeof useHarness> }) {
  setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
  setRpcHandler("get_voice_transcription_status", () => ({
    status: "recording",
    recording: true,
    streaming: true,
    partial_transcript: SPOKEN,
    finalized_transcript: "",
  }));
  await act(async () => {
    result.current.voice.onMicInput();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(result.current.unifiedInput).toBe(SPOKEN);
}

describe("a finished answer reads itself aloud on 'When I asked by voice'", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetReadAloudCompletionState();
    setReadAloudCompletionContext("voice_only", true);
  });
  afterEach(() => {
    stopAskCompletionWatch();
    vi.useRealTimers();
  });

  it("reads the answer to a spoken question (panel open)", async () => {
    scriptStatusPolls(7, 1);
    const { result } = renderHook(() => useHarness({ backgroundWatcher: false }));
    await speakAQuestion(result);

    await act(async () => {
      void result.current.voice.onAskOllamaWithReadAloud();
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(readAloudStarts()).toBe(1);
  });

  it("reads the answer to a spoken question when the panel is closed (background watcher)", async () => {
    scriptStatusPolls(8, 1);
    const { result } = renderHook(() => useHarness({ backgroundWatcher: true }));
    await speakAQuestion(result);

    await act(async () => {
      void result.current.voice.onAskOllamaWithReadAloud();
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(readAloudStarts()).toBe(1);
  });

  it("still reads it when the panel is closed and opened again between question and answer", async () => {
    scriptStatusPolls(9, 1);
    const first = renderHook(() => useHarness({ backgroundWatcher: true }));
    await speakAQuestion(first.result);
    await act(async () => {
      void first.result.current.voice.onAskOllamaWithReadAloud();
      await Promise.resolve();
    });
    // The panel closes: its screen is gone, the background watcher keeps going.
    first.unmount();
    // ...and a fresh screen opens before the answer is done.
    renderHook(() => useHarness({ backgroundWatcher: true }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(readAloudStarts()).toBe(1);
  });

  it("does not read the answer to a question typed after a spoken one", async () => {
    scriptStatusPolls(10, 1);
    const { result } = renderHook(() => useHarness({ backgroundWatcher: false }));
    await speakAQuestion(result);
    await act(async () => {
      void result.current.voice.onAskOllamaWithReadAloud();
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(readAloudStarts()).toBe(1);

    // A typed question follows. The dictation flag is still set; the text is not the spoken text.
    scriptStatusPolls(11, 1);
    act(() => {
      result.current.setUnifiedInput("something I typed");
    });
    await act(async () => {
      void result.current.voice.onAskOllamaWithReadAloud();
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(readAloudStarts()).toBe(1);
  });

  it("keeps the saved read-aloud setting while the saved settings are still loading", async () => {
    // An earlier open of the panel left the real setting in the module's copy.
    setReadAloudCompletionContext("voice_only", true);
    scriptStatusPolls(12, 1);
    // A fresh open: the screen still holds the starting values (Voice replies Off) because the
    // saved settings have not arrived. The background watcher sees the answer finish right now.
    const { result } = renderHook(() =>
      useHarness({ backgroundWatcher: true, settingsLoaded: false, voiceReplyMode: "off" }),
    );
    await speakAQuestion(result);
    await act(async () => {
      void result.current.voice.onAskOllamaWithReadAloud();
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(readAloudStarts()).toBe(1);
  });

  it("applies the saved setting once it has loaded, including a saved Off", async () => {
    setReadAloudCompletionContext("voice_only", true);
    scriptStatusPolls(13, 1);
    const { result, rerender } = renderHook(
      (p: { loaded: boolean }) =>
        useHarness({ backgroundWatcher: true, settingsLoaded: p.loaded, voiceReplyMode: "off" }),
      { initialProps: { loaded: false } },
    );
    rerender({ loaded: true });
    await speakAQuestion(result);
    await act(async () => {
      void result.current.voice.onAskOllamaWithReadAloud();
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(readAloudStarts()).toBe(0);
  });
});
