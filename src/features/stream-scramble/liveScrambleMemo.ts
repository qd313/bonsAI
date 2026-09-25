/**
 * Title: What the scramble remembers between one mount of the answer and the next
 *
 * Purpose: The streaming answer's scramble lives in a component that is thrown away and built
 * again at two moments: when the answer ends (the bubble switches from its streaming layout to its
 * finished one, and moments later the chat reloads and draws the answer as a saved turn), and when
 * the person closes and reopens the Quick Access Menu mid-answer. This module keeps the two facts
 * that have to outlive those rebuilds, outside React:
 *   - the live text last shown, so a rebuild mid-answer can tell "this answer, already on screen"
 *     from "a new answer" (plan 69: on reopening, what was already on screen comes back as plain
 *     text and only new text scrambles);
 *   - where the settle point was when the stream ended, and when that was, so whichever section
 *     of the finished answer holds it can finish settling on the same clock (plan 69: the last
 *     letters keep settling and are all real within 0.6 s of the end).
 *
 * Used for: ScrambledAnswerText.tsx.
 *
 * Solves: Both facts would otherwise die with the component that knew them.
 *
 * Does not: Hold more than one answer. Only one answer streams at a time.
 */
import { SCRAMBLE_FINISH_MS, type FinishProbe } from "./streamScrambleMath";

export type PendingFinish = FinishProbe & { startedAt: number };

let lastLiveText = "";
let finish: PendingFinish | null = null;

/** The live text a streaming section just showed. */
export function rememberLiveText(text: string): void {
  lastLiveText = text;
}

/**
 * Whether `text` continues the answer a streaming section was already showing: the remembered
 * text, whole, is where it starts. A new answer's first words never start with the whole of the
 * previous answer, even when both open the same way.
 */
export function continuesShownAnswer(text: string): boolean {
  return lastLiveText.length > 0 && text.length >= lastLiveText.length && text.startsWith(lastLiveText);
}

/** The stream ended at `now`, with its settle point where `probe` says (null: nowhere findable). */
export function beginFinish(probe: FinishProbe | null, now: number): void {
  finish = probe ? { ...probe, startedAt: now } : null;
}

/** The settle point handed over by the stream's end, while there is time left to settle; null otherwise. */
export function pendingFinish(now: number): PendingFinish | null {
  if (!finish) return null;
  if (now - finish.startedAt >= SCRAMBLE_FINISH_MS) {
    finish = null;
    return null;
  }
  return finish;
}

/** Test-only: forget everything. */
export function resetLiveScrambleMemoForTests(): void {
  lastLiveText = "";
  finish = null;
}
