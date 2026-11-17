/**
 * The stream pace at the level the Deck check looks at: the drawn answer. With the AI on a PC
 * the scrambled letters turn real sooner, and the text grows faster;
 * with the AI on the Deck the screen is exactly what it was.
 */
import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrambledAnswerText } from "./ScrambledAnswerText";
import { StreamScrambleContext, type StreamScrambleContextValue } from "./streamScrambleContext";
import { resetLiveScrambleMemoForTests } from "./liveScrambleMemo";
import { setAiRunsOnPc } from "./streamPace";
import { useSmoothStreamReveal } from "./useSmoothStreamReveal";
import { STREAM_BEAT_MS } from "./streamBeat";
import { useOllamaConnectionState } from "../../ai-connection/useOllamaConnectionState";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

type SwitchWindow = Window & { __bonsaiStreamPace?: unknown };

const SETTLE: StreamScrambleContextValue = { enabled: true, settleMs: 400 };

function view(raw: string, value: StreamScrambleContextValue) {
  return (
    <StreamScrambleContext.Provider value={value}>
      <ScrambledAnswerText plain={raw} raw={raw} streaming spoilerMaskingEnabled />
    </StreamScrambleContext.Provider>
  );
}

/** Letters still drawn as symbols behind the writing. */
function scrambled(container: HTMLElement): number {
  return container.querySelectorAll(".bonsai-stream-scramble-char").length;
}

function advance(ms: number) {
  for (let left = ms; left > 0; left -= 25) {
    act(() => {
      vi.advanceTimersByTime(Math.min(25, left));
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  resetLiveScrambleMemoForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setAiRunsOnPc(false);
  delete (window as SwitchWindow).__bonsaiStreamPace;
});

/** What is still scrambled `ms` after a fresh answer starts, on the current pace. */
function scrambledAfter(raw: string, value: StreamScrambleContextValue, ms: number): number {
  resetLiveScrambleMemoForTests();
  const r = render(view(raw, value));
  advance(ms);
  const left = scrambled(r.container);
  r.unmount();
  return left;
}

describe("how soon scrambled letters turn real", () => {
  it("at 350 ms they are still symbols on the Deck and real on a PC", () => {
    expect(scrambledAfter("Hello world", SETTLE, 350)).toBe(10);
    setAiRunsOnPc(true);
    expect(scrambledAfter("Hello world", SETTLE, 350)).toBe(0);
  });
});

describe("how fast the text grows", () => {
  /** How much of a long reply is shown after a few beats. */
  function shownAfterBeats(beats: number): number {
    const { result } = renderHook(() =>
      useSmoothStreamReveal({ targetText: "x".repeat(300), enabled: true, done: false })
    );
    for (let i = 0; i < beats; i += 1) {
      act(() => {
        vi.advanceTimersByTime(STREAM_BEAT_MS);
      });
    }
    return result.current.length;
  }

  it("shows more of the same backlog after the same beats on a PC", () => {
    const deck = shownAfterBeats(3);
    setAiRunsOnPc(true);
    const pc = shownAfterBeats(3);
    expect(pc).toBeGreaterThan(deck);
  });
});

describe("where the AI runs decides the pace", () => {
  it("the connection state turns the setting into the pace: AI not on the Deck means the PC pace", () => {
    const { rerender } = renderHook(({ onDeck }) => useOllamaConnectionState({ ollamaLocalOnDeck: onDeck }), {
      initialProps: { onDeck: true },
    });
    expect(scrambledAfter("Hello world", SETTLE, 350)).toBe(10);
    rerender({ onDeck: false });
    expect(scrambledAfter("Hello world", SETTLE, 350)).toBe(0);
    rerender({ onDeck: true });
    expect(scrambledAfter("Hello world", SETTLE, 350)).toBe(10);
  });
});
