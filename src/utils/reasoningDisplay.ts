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
  let shown = text;
  if (text.length >= REASONING_LIVE_SLICE_CHARS) {
    const firstEnd = /[.!?](?=\s)|\n/.exec(text);
    shown = firstEnd ? text.slice(firstEnd.index + 1) : text;
  }
  const tidied = tidyReasoningText(shown, { dropRuleChecklist: true });
  /*
   * A slice that was nothing but the model re-checking its rules would leave the block empty, and
   * the stock waiting phrase has already stepped aside for this turn -- one plain line says what
   * is happening instead (the roadmap's own first option: "a short status line").
   */
  if (!tidied && shown.trim()) return LIVE_RULE_CHECK_LINE;
  return tidied;
}

/** What the live line says while the model is only re-checking its own rules. */
const LIVE_RULE_CHECK_LINE = "Double-checking the answer…";

/*
 * The model's own thinking is written for itself, in markdown, and a large part of it is our own
 * instructions read back: a "Determine Constraints" step listing every "Must ..." rule, an output
 * format step, and a closing "Status line? Yes." checklist. Measured on the Deck (plan 70 and the
 * maintainer's screenshot docs/test-evidence/plan70-THINKING-CHECKLIST.png), that is what filled
 * the live line on every answer. The shapes below are the ones the model really writes; the tests
 * beside this file use its own words.
 */
/** A numbered step heading: "4.  **Determine Constraints:**". */
const STEP_HEADING_RE = /^\s*\d+\.\s+\*\*([^*]+)\*\*/;
/** Step titles that are the model checking its instructions, not working on the question. */
const RULE_STEP_TITLE_RE =
  /constraint|\brules?\b|checklist|final (?:check|review|polish)|self-check|(?:check|review) against|verif|requirement|output (?:structure|format)|generate (?:the )?output|^execution|final output|confidence/i;
/** A list line: "    *   text", "- text" or "3. text". Group 1 is the text. */
const LIST_LINE_RE = /^\s*(?:[*-]|\d+\.)\s+(.*)$/;
/**
 * A self-check: "Direct and concise? Yes, ...", "Ali G voice? Yes." A real question the model asks
 * about the game opens with a question word ("Is the boss weak to fire? Yes, ...") and is kept.
 */
const SELF_CHECK_RE =
  /^(?!(?:is|are|does|do|did|can|could|should|would|will|what|which|how|why|where|when|who)\b)[^?]{1,120}\?\s*(?:yes|no)\b/i;
/** A restated rule: "Must start with `<bonsai-status>`." */
const RESTATED_RULE_RE = /^must\b/i;
/** The heading the model puts on top of its own notes. */
const THINKING_HEADING_RE = /^\s*(?:\*\*)?Thinking Process:?(?:\*\*)?\s*/i;

function stripMarks(line: string): string {
  return line
    .replace(/^(\s*)[*-]\s+/, "$1• ")
    .replace(/\*\*/g, "")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`+/g, "");
}

/**
 * Feature: the model's thinking without the marks it writes for itself.
 * In: raw thinking; with `dropRuleChecklist`, also leave out the model re-checking its rules.
 * Out: the text to draw, trimmed.
 *
 * Always removed: the raw "Thinking Process:" heading, bold and italic stars, and backtick marks
 * (the words inside them stay -- a quoted note title is real content). A "[hidden]" cover the
 * computer side put in is left exactly as it is. List stars become a plain bullet.
 *
 * With `dropRuleChecklist` (the live line): a step whose title is about constraints, rules, the
 * output format or a final check is left out whole, and so is any "Must ..." rule line or
 * "...? Yes." self-check that shows before the first step heading of the slice (the heading was
 * cut off above it). Inside a step about the question itself, every line is kept. The opened
 * reasoning block keeps the checklist: it is the whole record the person chose to open.
 */
export function tidyReasoningText(
  text: string,
  { dropRuleChecklist = false }: { dropRuleChecklist?: boolean } = {},
): string {
  const kept: string[] = [];
  let step: "none" | "rule" | "work" = "none";
  for (const rawLine of text.split("\n")) {
    const line = kept.length === 0 ? rawLine.replace(THINKING_HEADING_RE, "") : rawLine;
    if (dropRuleChecklist) {
      const heading = STEP_HEADING_RE.exec(line);
      if (heading) step = RULE_STEP_TITLE_RE.test(heading[1].trim()) ? "rule" : "work";
      if (step === "rule") continue;
      const listed = LIST_LINE_RE.exec(line);
      if (listed && !heading) {
        const body = stripMarks(listed[1]).trim();
        if (SELF_CHECK_RE.test(body)) continue;
        if (step === "none" && RESTATED_RULE_RE.test(body)) continue;
      }
    }
    if (kept.length === 0 && !line.trim()) continue;
    kept.push(stripMarks(line));
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
