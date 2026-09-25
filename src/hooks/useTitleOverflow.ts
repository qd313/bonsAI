/**
 * Title: Does an open question's title overflow its cap?
 *
 * Purpose: Tells the chat transcript whether an OPEN question's title really runs past its
 * five-line cap (roadmap: "A short question fades out at its right edge as if there were more to
 * read"). CSS alone cannot tell a short question from a cut one, so the title span's own ref
 * (passed to buildTurnHeaderElement, one instance per open turn) measures scrollHeight against the
 * clientHeight the max-height cap enforces -- the same shape of check ChatSlotRow.tsx uses for its
 * own title overflow. Keyed by turn id ("live" for the live turn) so switching which turn is open
 * never reads a stale measurement left by the one before it.
 *
 * Used for: MainTabChatTranscript.tsx, called from the spot this block used to occupy there.
 *
 * Solves: Two things. It keeps the measuring and its state in one small place outside the
 * transcript, which is at its size limit. And it stops the measuring from costing the panel its
 * frame rate: the ref builder hands React a new function on every render, so React calls it on
 * every render, and reading scrollHeight makes the browser lay the whole panel out again right
 * there. Profiled on the Deck 2026-09-24 with a game running (scripts/probe_deck_cpu_profile.py),
 * that one function was 9.9 s of the page's 28.5 s of script time while an answer streamed --
 * the largest single cost in the panel, for a title that had not changed. So a title is measured
 * again only when its element or its text changed, or when a second has passed since the last
 * look, which still catches a change in layout (a late-loading font, the UI scale) soon after.
 *
 * Does not: Draw the fade -- buildTurnHeaderElement does that from `titleOverflowing`.
 */
import { useRef, useState } from "react";

/** How long an unchanged title's measurement is trusted before it is taken again. */
const REMEASURE_AFTER_MS = 1000;

type Measured = { el: HTMLElement; text: string; at: number };

export function useTitleOverflow() {
  const [overflowingTitles, setOverflowingTitles] = useState<Record<string, boolean>>({});
  const lastMeasured = useRef<Record<string, Measured>>({});
  const measureTitleOverflow = (key: string) => (el: HTMLSpanElement | null) => {
    if (!el) return;
    // textContent is a plain read; scrollHeight below is the one that costs a layout.
    const text = el.textContent ?? "";
    const now = performance.now();
    const last = lastMeasured.current[key];
    if (last && last.el === el && last.text === text && now - last.at < REMEASURE_AFTER_MS) return;
    lastMeasured.current[key] = { el, text, at: now };
    const overflowing = el.scrollHeight - el.clientHeight > 1;
    setOverflowingTitles((prev) => (prev[key] === overflowing ? prev : { ...prev, [key]: overflowing }));
  };
  return { overflowingTitles, measureTitleOverflow };
}
