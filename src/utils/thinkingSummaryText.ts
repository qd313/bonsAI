/**
 * Title: Cleaning up the "thinking" line shown while an Ask is running
 *
 * Purpose: While an Ask is being answered, the screen shows a short line describing what the
 * model is doing — "Thinking…", or something more specific once the back end sends it. This file
 * cleans up that line if the model starts it with a throwaway filler word ("Yeah,", "Sure,",
 * "Fine.") instead of getting straight to the point, and supplies the fixed placeholder text
 * shown for the brief moment before the back end's own line arrives.
 *
 * Used for: `useBonsaiAskOrchestration` — the live "thinking" line shown while an Ask is running.
 *
 * Solves: a filler opener reaching the screen unedited reads as the model being flippant rather
 * than helpful; and without a placeholder, the line would sit empty for the moment between
 * pressing Ask and the back end's response arriving.
 *
 * Does not: decide what the line actually says. Every word of the real line is written by the
 * back end (see `bonsai_stream_tags.py`); this file only cleans it up on arrival and fills the
 * gap before it arrives.
 *
 * Gotchas:
 *   - `THINKING_BLURB_PLACEHOLDER` is deliberately one fixed line ("Thinking…"), not one of
 *     several picked at random. An earlier version picked a random opener for the placeholder
 *     that could differ from the real line that replaced it, which read as the line changing its
 *     mind rather than a placeholder finishing its job.
 *   - `sanitizeThinkingSummary()` mirrors `sanitize_thinking_summary` in `bonsai_stream_tags.py`
 *     and has to keep agreeing with it exactly, because the model's own status tag reaches the
 *     screen as plain text and both run on that same text, one after the other.
 *   - If cleaning up the line would leave nothing at all — the model's entire line was a filler
 *     word with nothing after it — this shows the original, uncleaned line instead of a blank
 *     one. A flippant-sounding line beats no line at all while an Ask is still running.
 *   - This file used to also write the actual wording of that line itself, with several pools of
 *     phrasing and hand-copied rules for choosing between them. That was removed after the
 *     wording it guessed sometimes disagreed with the back end's own separate guess about the
 *     same question, which could change the line's wording partway through a single reply. See
 *     `docs/planning/06-thinking-blurbs-review.md` for the full account.
 */

/**
 * Shown for the one round-trip between submit and the backend's woven opener arriving in the
 * `start_background_game_ai` response. Deliberately constant and pool-free: a placeholder giving
 * way to a specific line reads as progress, whereas one random opener replacing another read as
 * the line changing its mind.
 */
export const THINKING_BLURB_PLACEHOLDER = "Thinking…";

const LAZY_THINKING_OPENER_RE =
  /^\s*(?:yeah\b[,!?.\s—–-]*|fine\b[.\s—–-]*|sure\b[.\s—–-]*|oh joy\b[,!\s—–-]*|right\b[.\s—–-]*)/i;

/**
 * Mirror of `sanitize_thinking_summary` in `bonsai_stream_tags.py`. Still needed on this side
 * because the model-emitted `<bonsai-status>` tag reaches the UI as free-form text; the two run in
 * series on the same string, so they must agree exactly.
 */
export function sanitizeThinkingSummary(text: string): string {
  const raw = (text || "").trim();
  if (!raw) return raw;
  let cleaned = raw;
  for (let i = 0; i < 3; i += 1) {
    const next = cleaned.replace(LAZY_THINKING_OPENER_RE, "").trim();
    if (next === cleaned) break;
    cleaned = next;
  }
  /*
   * Mirrors Python's `return cleaned if cleaned else raw`. A summary that is *entirely* a lazy
   * opener — the model emitting `<bonsai-status>Sure.</bonsai-status>`, which is exactly what the
   * prompt warns against and therefore exactly what happens — strips to "". Returning that blanked
   * the thinking line mid-Ask, because the render gate in MainTabChatTranscript is a truthiness
   * check. A lazy opener on screen beats no line at all.
   */
  return cleaned || raw;
}
