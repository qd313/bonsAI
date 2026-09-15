/**
 * Title: Cleaning up a "Continuing…" note that was still showing when Stop was pressed
 *
 * Purpose: While an Ask is still being answered, the screen shows a small "Continuing…" note at
 * the end of the reply so far, to make clear more text is on the way. If a person presses Stop
 * at almost exactly the moment that note is about to be cleared, the saved reply can end up
 * keeping the note as if it were part of the actual answer. This file is a backstop that removes
 * a trailing "Continuing…" from a reply that has already been stopped and saved.
 *
 * Used for: the cancelled-Ask path in `useBonsaiAskOrchestration`, right after a person presses
 * Stop.
 *
 * Solves: the back end only sends updates at a limited rate
 * (`PARTIAL_RESPONSE_FLUSH_INTERVAL_S` in `main.py`), so a Stop that lands inside that window can
 * miss the specific update that would have cleared the note on its own.
 *
 * Does not: touch the note while an Ask is still in progress. Showing "Continuing…" partway
 * through a live reply is intentional, and this file only runs after a reply has already
 * stopped.
 *
 * Gotchas:
 *   - This mirrors `strip_soft_continue_cue` in
 *     `py_modules/backend/services/ollama_ask_budgets.py` — the two need to keep agreeing on the
 *     exact wording of the note and how it gets trimmed.
 */

const SOFT_CONTINUE_CUE = "Continuing…";

/** Mirrors strip_soft_continue_cue in py_modules/backend/services/ollama_ask_budgets.py. */
export function stripSoftContinueCue(text: string): string {
  const raw = typeof text === "string" ? text : "";
  if (!raw) {
    return raw;
  }
  const trimmed = raw.trimEnd();
  if (trimmed.endsWith(SOFT_CONTINUE_CUE)) {
    return trimmed.slice(0, -SOFT_CONTINUE_CUE.length).trimEnd();
  }
  return raw;
}
