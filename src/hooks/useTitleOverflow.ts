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
 * Solves: Keeps the measuring and its state in one small place outside the transcript, which is
 * at its size limit.
 *
 * Does not: Draw the fade -- buildTurnHeaderElement does that from `titleOverflowing`.
 */
import { useState } from "react";

export function useTitleOverflow() {
  const [overflowingTitles, setOverflowingTitles] = useState<Record<string, boolean>>({});
  const measureTitleOverflow = (key: string) => (el: HTMLSpanElement | null) => {
    if (!el) return;
    const overflowing = el.scrollHeight - el.clientHeight > 1;
    setOverflowingTitles((prev) => (prev[key] === overflowing ? prev : { ...prev, [key]: overflowing }));
  };
  return { overflowingTitles, measureTitleOverflow };
}
