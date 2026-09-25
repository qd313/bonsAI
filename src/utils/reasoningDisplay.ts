/**
 * Title: Reading the model's own thinking for the screen
 *
 * Purpose: When a model that can think is asked a question, it writes out its thinking before it
 * writes the answer. This file turns that raw thinking into the small pieces the chat draws: the
 * newest thinking while the answer is still being made, the "41 s" on the fold row above a
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
 *   - The live text is the newest 600 characters, not the whole thinking, so once the model has
 *     thought for a while it starts mid-word; liveReasoningText drops that opening fragment.
 *   - A gap of under a second still reads "1 s". A row that says "0 s" looks broken.
 */
import type { TurnReasoning } from "../types/bonsaiUi";

/**
 * The most of the live thinking the computer side ever sends: the newest this many characters
 * (REASONING_LIVE_CHARS in ollama_chat_stream.py). A slice this long was cut from a longer think.
 */
const REASONING_LIVE_SLICE_CHARS = 600;

/**
 * Feature: the model's thinking under the question while it works, drawn as ordinary text.
 * In: the newest slice of the thinking. Out: the text to draw, trimmed.
 *
 * The maintainer's call, 2026-09-24: "let it display the thinking normally". It used to be the
 * newest three sentences, each cut to one line with an ellipsis, which read as a list of broken
 * lines. Now it is the slice as the model wrote it, line breaks kept, and the stylesheet keeps the
 * newest lines in view.
 *
 * Once the thinking is longer than the slice, the slice starts part way through a word. That
 * fragment -- everything up to the first sentence end or line break -- is dropped, so the block
 * never opens on half a word. A slice with no sentence end at all is drawn whole.
 */
export function liveReasoningText(partial: string | null | undefined): string {
  const text = partial ?? "";
  if (text.length < REASONING_LIVE_SLICE_CHARS) return text.trim();
  const firstEnd = /[.!?](?=\s)|\n/.exec(text);
  return (firstEnd ? text.slice(firstEnd.index + 1) : text).trim();
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
