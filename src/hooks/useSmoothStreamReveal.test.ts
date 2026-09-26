import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSmoothStreamReveal, FENCE_BURST_RATE_MULTIPLIER } from "./useSmoothStreamReveal";
import { STREAM_BEAT_MS } from "../utils/streamBeat";
import { prepareStreamMarkdown } from "../utils/streamMarkdownPrepare";

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

  /*
   * Deck, plan 70 flow L3 (SPOILER-COVER-01 try 2): the back end's live spoiler cover wraps a
   * sentence in a ```bonsai-spoiler fence once the protected name arrives -- so the new snapshot
   * REWRITES text the screen had already revealed, it does not just grow. The reveal used to keep
   * its old characters and append the new snapshot from the old length: "When fight" + the new
   * text from character 10 on read "When fight-spoiler\nWhen fighting the Soul Master..." -- the
   * opener eaten, the name in plain text for about 6 s, the fence's closer left over as an
   * orphan that opened a "Code block incoming…" chip. These are the snapshots the Deck read.
   */
  it.each([
    [
      "HK-A",
      "When fight",
      "\n```bonsai-spoiler\nWhen fighting the Soul Master, the ke\n```\n",
      "fight-spoiler",
    ],
    [
      "HK-MENU",
      "I'll give you the run",
      "\n```bonsai-spoiler\nI'll give you the rundown on how to handle the Soul Master f\n```\n",
      "runll",
    ],
  ])(
    "re-syncs to a snapshot that rewrote earlier text instead of splicing (%s)",
    (_label, first, rewritten, splice) => {
      const { result, rerender } = renderHook(
        ({ target }) => useSmoothStreamReveal({ targetText: target, enabled: true, done: false }),
        { initialProps: { target: first } }
      );
      beats(6);
      expect(result.current).toBe(first);
      rerender({ target: rewritten });
      for (let i = 0; i < 12; i += 1) {
        expect(rewritten.startsWith(result.current)).toBe(true);
        expect(result.current).not.toContain(splice);
        beats(1);
      }
      expect(result.current).toBe(rewritten);
    }
  );

  /*
   * The back end's cover grows with the sentence: every flush moves the fence's closer, so each
   * snapshot rewrites the one before. Walked beat by beat, what the bubble draws must never be
   * the name outside a closed cover, never a wait chip (a half-typed "```bonsa" reads as an
   * ordinary code fence; an unfinished cover reads "hidden until complete") -- the cover stays a
   * cover from the moment it first shows.
   */
  it("shows the back end's growing cover as one finished cover at every beat (HK-A)", () => {
    const snapshots = [
      "\n```bonsai-spoiler\nWhen fighting the Soul Master, t\n```\n",
      "\n```bonsai-spoiler\nWhen fighting the Soul Master, the k\n```\n",
      "\n```bonsai-spoiler\nWhen fighting the Soul Master, the key is timing your attacks around his movement.\n```\nHe tele",
    ];
    const { result, rerender } = renderHook(
      ({ target }) => useSmoothStreamReveal({ targetText: target, enabled: true, done: false }),
      { initialProps: { target: snapshots[0]! } }
    );
    const check = () => {
      const drawn = prepareStreamMarkdown(result.current);
      expect(drawn.waitChip).toBeNull();
      const plain = [...drawn.closedBlocks.filter((b) => !b.startsWith("```bonsai-spoiler")), drawn.liveTail ?? ""];
      expect(plain.join("\n")).not.toContain("Soul Master");
    };
    for (const snap of snapshots) {
      rerender({ target: snap });
      check();
      for (let i = 0; i < 4; i += 1) {
        beats(1);
        check();
      }
    }
    expect(result.current).toBe(snapshots[2]);
  });

  it("drops text the back end has taken back (a held-back word) rather than keep showing it", () => {
    const { result, rerender } = renderHook(
      ({ target }) => useSmoothStreamReveal({ targetText: target, enabled: true, done: false }),
      { initialProps: { target: "Keep moving.\n\nThe Soul" } }
    );
    beats(6);
    expect(result.current).toBe("Keep moving.\n\nThe Soul");
    rerender({ target: "Keep moving.\n\n" });
    expect(result.current).toBe("Keep moving.\n\n");
  });

  it("exports fence burst multiplier at 3×", () => {
    expect(FENCE_BURST_RATE_MULTIPLIER).toBe(3);
  });
});
