/**
 * Title: Smooth stream reveal hook
 * Purpose: Reveal streamed assistant tokens at a capped prose rate with fence burst after close.
 * Used for: MainTab live answer bubble while background Ask polls partial_response.
 * Solves: Blocky token jumps during streaming without delaying final settle (T3 snap on done).
 * Does not: Parse markdown fences — see streamMarkdownPrepare and splitResponseIntoChunks.
 */
import { useEffect, useRef, useState } from "react";
import { didNonSpoilerFenceJustClose } from "../utils/streamMarkdownPrepare";

type UseSmoothStreamRevealArgs = {
  targetText: string;
  enabled: boolean;
  done: boolean;
};

/** Slowest reveal, so a couple of trailing characters still animate rather than snapping. */
const PROSE_RATE_MIN = 40;
/**
 * Spend about one poll interval draining whatever has arrived.
 *
 * Replaces a hard 160 chars/s ceiling, which was below what a LAN GPU actually produces (~40 tok/s):
 * the reveal fell permanently behind and the remainder landed in one frame at T3. Deriving the rate
 * from the backlog instead makes it self-scaling — a fast host drains a big backlog quickly, a slow
 * one trickles — and pacing it *just over* `BACKGROUND_STREAM_POLL_MS` (150ms) keeps the reveal from
 * sprinting to the end of a partial and then idling until the next poll, which is the startup hitch
 * STREAM-REVEAL-01 saw on Deck after the first ~6-7 words.
 */
const TARGET_DRAIN_SECONDS = 0.18;
/**
 * Frames to keep the loop alive after catching up — about one poll interval at 60fps, so a partial
 * that drains early is still animating when the next one lands. Bounded on purpose: an
 * unconditional reschedule never terminates, which spins forever under test fake timers.
 */
const IDLE_COAST_FRAMES = 12;
/** After a non-spoiler fence closes, reveal backlog at this multiple (C2; may change). */
const FENCE_BURST_RATE_MULTIPLIER = 3;

function proseRevealRate(backlog: number): number {
  return Math.max(PROSE_RATE_MIN, backlog / TARGET_DRAIN_SECONDS);
}

/**
 * Reveals streamed assistant text at a steady rate so polls feel continuous (Claude-style).
 * Snaps to full target when streaming ends (T3 settle). Fence body bursts at ~3× after close.
 */
export function useSmoothStreamReveal({
  targetText,
  enabled,
  done,
}: UseSmoothStreamRevealArgs): string {
  const [displayText, setDisplayText] = useState("");
  const displayRef = useRef("");
  const targetRef = useRef(targetText);
  const prevTargetRef = useRef(targetText);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const burstTicksRef = useRef(0);
  const idleTicksRef = useRef(0);

  const ensureRaf = () => {
    if (!enabled || done) return;
    if (rafRef.current != null) return;
    if (targetRef.current.length <= displayRef.current.length) return;
    lastTsRef.current = null;
    idleTicksRef.current = 0;
    const tick = (ts: number) => {
      const prev = lastTsRef.current ?? ts;
      lastTsRef.current = ts;
      const dt = Math.max(0, (ts - prev) / 1000);
      const target = targetRef.current;
      const cur = displayRef.current;
      const backlog = target.length - cur.length;
      if (backlog <= 0) {
        /*
         * Coast briefly instead of tearing the loop down on the first caught-up frame. Exiting
         * immediately meant the next partial had to wait for a React round trip before any
         * character moved, so draining a partial faster than the 150ms poll showed a visible pause
         * — the other half of the startup hitch. Coasting spans that gap; parking after it keeps
         * the loop finite, which an unconditional reschedule was not.
         */
        idleTicksRef.current += 1;
        if (idleTicksRef.current > IDLE_COAST_FRAMES) {
          rafRef.current = null;
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      idleTicksRef.current = 0;
      const baseRate = proseRevealRate(backlog);
      const bursting = burstTicksRef.current > 0;
      const rate = bursting ? baseRate * FENCE_BURST_RATE_MULTIPLIER : baseRate;
      const step = Math.max(1, Math.floor(rate * dt) || 1);
      const next = target.slice(cur.length, cur.length + step);
      const merged = cur + next;
      displayRef.current = merged;
      setDisplayText(merged);
      if (bursting) burstTicksRef.current -= 1;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const prev = prevTargetRef.current;
    if (didNonSpoilerFenceJustClose(prev, targetText)) {
      burstTicksRef.current = 45;
    }
    prevTargetRef.current = targetText;
    targetRef.current = targetText;

    if (!enabled) {
      displayRef.current = targetText;
      setDisplayText(targetText);
      return;
    }
    if (done) {
      displayRef.current = targetText;
      setDisplayText(targetText);
      burstTicksRef.current = 0;
      return;
    }
    if (!targetText) {
      displayRef.current = "";
      setDisplayText("");
      return;
    }
    // Critical: restart RAF when new partials arrive after display caught up.
    ensureRaf();
  }, [targetText, enabled, done]);

  useEffect(() => {
    if (!enabled || done) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }
    ensureRaf();
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
    };
  }, [enabled, done]);

  if (!enabled) return targetText;
  if (done) return targetText;
  return displayText;
}

export { FENCE_BURST_RATE_MULTIPLIER };
