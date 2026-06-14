import { useEffect, useRef, useState } from "react";

type UseSmoothStreamRevealArgs = {
  targetText: string;
  enabled: boolean;
  done: boolean;
};

/**
 * Reveals streamed assistant text at a steady rate so polls feel continuous (Claude-style).
 * Snaps to full target when streaming ends.
 */
export function useSmoothStreamReveal({ targetText, enabled, done }: UseSmoothStreamRevealArgs): string {
  const [displayText, setDisplayText] = useState("");
  const displayRef = useRef("");
  const targetRef = useRef(targetText);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = targetText;
    if (!enabled) {
      displayRef.current = targetText;
      setDisplayText(targetText);
      return;
    }
    if (done) {
      displayRef.current = targetText;
      setDisplayText(targetText);
      return;
    }
    if (!targetText) {
      displayRef.current = "";
      setDisplayText("");
    }
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

    const tick = (ts: number) => {
      const prev = lastTsRef.current ?? ts;
      lastTsRef.current = ts;
      const dt = Math.max(0, (ts - prev) / 1000);
      const target = targetRef.current;
      const cur = displayRef.current;
      const backlog = target.length - cur.length;
      if (backlog <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const rate = Math.min(80, Math.max(24, backlog * 2));
      const step = Math.max(1, Math.floor(rate * dt));
      const next = target.slice(cur.length, cur.length + step);
      const merged = cur + next;
      displayRef.current = merged;
      setDisplayText(merged);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
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
