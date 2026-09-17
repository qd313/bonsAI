/**
 * Title: Reading the model's own thinking for the screen
 *
 * Purpose: When a model that can think is asked a question, it writes out its thinking before it
 * writes the answer. This file turns that raw thinking into the small pieces the chat draws: the
 * newest few sentences while the answer is still being made, the "41 s" on the fold row above a
 * finished answer, and a tidy record of a turn's thinking to keep with the saved chat.
 *
 * Used for: the Main tab chat transcript (the live lines and the fold row), the hook that polls a
 * running question, and the code that reopens a saved chat.
 *
 * Solves: three small jobs that would otherwise be written three times, in three places, slightly
 * differently — and every one of them has to cope with the computer side sending nothing at all,
 * because thinking is off by default and older saved chats have none.
 *
 * Does not: draw anything, decide when the fold row shows, or talk to the computer side.
 *
 * Gotchas:
 *   - The live text is the newest 600 characters, not the whole thinking, so its first sentence is
 *     usually cut off mid-word. That is deliberate and it is still worth showing: it is the line
 *     that scrolls away next.
 *   - A gap of under a second still reads "1 s". A row that says "0 s" looks broken.
 */
import type { TurnReasoning } from "../types/bonsaiUi";

/** How many of the newest sentences the live block ever shows. The drawing says three. */
const REASONING_LIVE_LINE_COUNT = 3;

/**
 * Feature: the three live lines under a question.
 * In: the newest slice of the model's thinking. Out: that slice as trimmed sentences, in order.
 *
 * A sentence ends at a full stop, an exclamation mark or a question mark that is followed by a
 * space or by nothing at all, and a line break always ends one. The "followed by a space" part is
 * what keeps "the boss has 3.5 times the health" as one sentence instead of two.
 */
export function splitReasoningSentences(partial: string | null | undefined): string[] {
  if (!partial) return [];
  const pieces: string[] = [];
  let current = "";
  for (let i = 0; i < partial.length; i += 1) {
    const ch = partial[i];
    if (ch === "\n" || ch === "\r") {
      pieces.push(current);
      current = "";
      continue;
    }
    current += ch;
    if (ch === "." || ch === "!" || ch === "?") {
      const next = partial[i + 1];
      if (next === undefined || next === " " || next === "\t" || next === "\n" || next === "\r") {
        pieces.push(current);
        current = "";
      }
    }
  }
  pieces.push(current);
  return pieces.map((piece) => piece.trim()).filter((piece) => piece.length > 0);
}

/**
 * Feature: the live block never grows a fourth line.
 * In: the newest slice of thinking. Out: at most three sentences, oldest first, newest last.
 *
 * The cap lives here rather than in the drawing code so it cannot be missed by a second caller:
 * the block is sized for exactly three rows and a fourth would push the answer off screen.
 */
export function newestReasoningLines(
  partial: string | null | undefined,
  limit: number = REASONING_LIVE_LINE_COUNT,
): string[] {
  const sentences = splitReasoningSentences(partial);
  if (sentences.length <= limit) return sentences;
  return sentences.slice(sentences.length - limit);
}

/**
 * Feature: the "· 41 s" on the fold row.
 * In: whole seconds, or nothing at all. Out: the text to draw.
 *
 * Anything under a second, and anything missing, reads "1 s": there was thinking — that is why the
 * row is on screen — so a "0 s" would just look like a fault.
 */
export function formatReasoningSeconds(seconds: number | null | undefined): string {
  const whole =
    typeof seconds === "number" && Number.isFinite(seconds) ? Math.round(seconds) : 0;
  return `${whole < 1 ? 1 : whole} s`;
}

/** The fold row's whole label, closed or open. */
export function reasoningFoldLabel(open: boolean, seconds: number | null | undefined): string {
  return `${open ? "Hide" : "Show"} reasoning · ${formatReasoningSeconds(seconds)}`;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Feature: a reopened chat still has its fold row.
 * In: whatever the computer side saved beside a turn. Out: a tidy record, or nothing.
 *
 * Nothing is the common answer: thinking is off by default, and every turn saved before this
 * existed has no such record at all. Anything with no readable text counts as nothing, so a turn
 * that thought and then wrote an empty think does not grow a row with no content behind it.
 */
export function normalizeTurnReasoning(value: unknown): TurnReasoning | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { text?: unknown; seconds?: unknown; tokens?: unknown };
  const text = typeof raw.text === "string" ? raw.text : "";
  if (!text.trim()) return undefined;
  return {
    text,
    seconds: finiteOrNull(raw.seconds),
    tokens: finiteOrNull(raw.tokens) ?? 0,
  };
}

/**
 * Feature: the fold row on the answer that just finished.
 * In: the finished status the panel polled. Out: a tidy record, or nothing.
 *
 * The same "no text means nothing" rule as above, which is what keeps the row off an answer that
 * failed with nothing written (the maintainer's call: no fold on a turn with no answer).
 */
export function reasoningFromFinishedStatus(status: {
  reasoning_text?: string | null;
  reasoning_seconds?: number | null;
  reasoning_tokens?: number | null;
}): TurnReasoning | undefined {
  return normalizeTurnReasoning({
    text: typeof status.reasoning_text === "string" ? status.reasoning_text : "",
    seconds: status.reasoning_seconds,
    tokens: status.reasoning_tokens,
  });
}
