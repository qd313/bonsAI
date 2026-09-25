import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSmoothStreamReveal, FENCE_BURST_RATE_MULTIPLIER } from "./useSmoothStreamReveal";
import { STREAM_BEAT_MS } from "../utils/streamBeat";

/** Beats of the reveal, each its own act() so React renders between them the way the page does. */
function beats(count: number) {
  for (let i = 0; i < count; i += 1) {
    act(() => {
      vi.advanceTimersByTime(STREAM_BEAT_MS);
    });
  }
}

describe("useSmoothStreamReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("snaps to full target when done (T3 settle)", () => {
    const { result, rerender } = renderHook(
      ({ target, enabled, done }) => useSmoothStreamReveal({ targetText: target, enabled, done }),
      { initialProps: { target: "Hello", enabled: true, done: false } }
    );
    rerender({ target: "Hello world", enabled: true, done: true });
    expect(result.current).toBe("Hello world");
  });

  /*
   * Deck, 2026-09-25: moving the text on every frame held the panel at about 20 frames a second
   * while the model wrote; once per beat, about 55. Nothing may move between beats.
   */
  it("moves the text on once per beat, never between beats", () => {
    const frames = vi.spyOn(window, "requestAnimationFrame");
    const { result } = renderHook(() =>
      useSmoothStreamReveal({ targetText: "x".repeat(200), enabled: true, done: false })
    );
    act(() => {
      vi.advanceTimersByTime(STREAM_BEAT_MS - 1);
    });
    expect(result.current).toBe("");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    const first = result.current.length;
    expect(first).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(STREAM_BEAT_MS - 1);
    });
    expect(result.current.length).toBe(first);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.length).toBeGreaterThan(first);
    expect(frames).not.toHaveBeenCalled();
  });

  it("does not shrink display when target grows", () => {
    const { result, rerender } = renderHook(
      ({ target, enabled, done }) => useSmoothStreamReveal({ targetText: target, enabled, done }),
      { initialProps: { target: "ab", enabled: true, done: false } }
    );
    beats(1);
    const lenAfterFirst = result.current.length;
    rerender({ target: "abcdef", enabled: true, done: false });
    beats(1);
    expect(result.current.length).toBeGreaterThanOrEqual(lenAfterFirst);
  });

  it("restarts reveal after display catches up and target grows again", () => {
    const { result, rerender } = renderHook(
      ({ target, enabled, done }) => useSmoothStreamReveal({ targetText: target, enabled, done }),
      { initialProps: { target: "Hi", enabled: true, done: false } }
    );
    // Drain until caught up, then let the coast run out so the loop has parked.
    beats(10);
    expect(result.current).toBe("Hi");
    expect(vi.getTimerCount()).toBe(0);
    // New partial arrives after catch-up -- the beat must restart.
    rerender({ target: "Hi there friend", enabled: true, done: false });
    const before = result.current.length;
    beats(1);
    expect(result.current.length).toBeGreaterThan(before);
  });

  /**
   * The old fixed 160 chars/s ceiling sat below real generation speed, so a fast host left the
   * reveal permanently behind and T3 dumped the remainder in one frame.
   */
  it("drains a large backlog in about one poll interval instead of at a fixed cap", () => {
    const long = "x".repeat(1000);
    const { result } = renderHook(() =>
      useSmoothStreamReveal({ targetText: long, enabled: true, done: false })
    );

    beats(2);

    // At the old cap two beats could only move ~35 characters.
    expect(result.current.length).toBeGreaterThan(800);
  });

  it("keeps the beat alive after catching up so the next partial starts immediately", () => {
    const { result } = renderHook(() =>
      useSmoothStreamReveal({ targetText: "ab", enabled: true, done: false })
    );

    beats(2);
    expect(result.current).toBe("ab");
    // Caught up, but still scheduled: an idle beat must not tear the loop down.
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it("returns target immediately when disabled", () => {
    const { result } = renderHook(() =>
      useSmoothStreamReveal({ targetText: "full text", enabled: false, done: false })
    );
    expect(result.current).toBe("full text");
  });

  it("exports fence burst multiplier at 3×", () => {
    expect(FENCE_BURST_RATE_MULTIPLIER).toBe(3);
  });
});
