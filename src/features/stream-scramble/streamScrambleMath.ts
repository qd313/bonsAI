/**
 * Title: Streamed-answer scramble maths
 *
 * Purpose: The pure, timing-free core of the scramble on a streaming answer (plan 69 step 3): where
 * the settle point is for each of the three styles, how fast the last letters settle once the
 * answer has ended, which symbol each unsettled character shows, where in the settled text the
 * churning span goes, and how a finished answer finds the stretch the stream left unsettled. The
 * same shape as the decode chips' own maths file, which this reuses for its symbols and its two
 * timings, so the answer and the chips churn alike.
 *
 * Used for: ScrambledAnswerText.tsx, which owns the timer and the DOM writes; this file only
 * computes numbers and strings.
 *
 * Solves: Keeps "which letters are real right now" testable on its own, away from the timer and
 * the renderer -- the part of the scramble most likely to be quietly wrong.
 *
 * Does not: Read the clock, schedule anything, touch the DOM, or know about React.
 *
 * How the three styles settle (the maintainer's mockup, plan 69):
 *   settle -- every letter scrambles for the same short time after it arrived, then settles.
 *   chip   -- exactly the decode chip: one letter every 42 ms, whatever the model is doing.
 *   tail   -- the last 10 letters are always scrambled.
 * Spaces and line breaks never scramble and never count as letters, so words keep their shape.
 */
import { makeDecodeChurn, PRESET_DECODE_CHAR_MS, PRESET_DECODE_CHURN_REFRESH_MS } from "../preset-carousel/presetChipDecodeText";
import { normalizeIncompleteInline } from "../../utils/streamMarkdownPrepare";

/** Chip pace: one letter settles every this many ms -- the decode chips' own number. */
export const SCRAMBLE_CHAR_MS = PRESET_DECODE_CHAR_MS;
/** The scrambled letters reshuffle this often, ms -- the decode chips' own number. */
export const SCRAMBLE_CHURN_MS = PRESET_DECODE_CHURN_REFRESH_MS;
/** "Fixed tail" keeps this many letters scrambled (plan 69). */
const SCRAMBLE_TAIL_LETTERS = 10;
/** Once an answer has ended, its last scrambled letters are all real within this long. */
export const SCRAMBLE_FINISH_MS = 600;
/**
 * The settled text is handed to the markdown renderer at most this often. The letters themselves
 * settle on every reshuffle, inside the churning span; the renderer catches up in steps, which is
 * what keeps the scramble cheaper than today's reveal, which renders on every frame.
 */
export const SCRAMBLE_MARKDOWN_STEP_MS = 110;
/** Chip pace never banks more than this many letters, so a stall does not end in a burst. */
const CHIP_CREDIT_CAP = 10;
/** How much text either side of the settle point the stream's end hands over to be found again. */
const FINISH_PROBE_CHARS = 32;
/** A probe with fewer letters than this could match in the wrong place, so none is made. */
const FINISH_PROBE_MIN_LETTERS = 6;
/**
 * A private-use character marking where the churning span goes inside the settled markdown. The
 * markdown renderer swaps it for the span (MainTabBonsaiAiMarkdownChunk's scramble slot), so the
 * span sits at the end of whatever block the settled text ends in -- inside the bold, the list
 * item or the heading -- rather than on a line of its own after the answer.
 */
export const SCRAMBLE_SLOT_MARK = "";

function isBlank(ch: string): boolean {
  return ch === " " || ch === "\n" || ch === "\t" || ch === "\r";
}

/**
 * Bold, italic and code marks. The span shows raw text, not markdown, so a `**` there would flash
 * as two asterisks until the renderer caught up and turned it into bold; the span leaves them out.
 */
function isInlineMark(ch: string): boolean {
  return ch === "*" || ch === "`";
}

function countLetters(text: string): number {
  let letters = 0;
  for (let i = 0; i < text.length; i += 1) if (!isBlank(text[i]!)) letters += 1;
  return letters;
}

/**
 * One churn symbol per character of `text`, index for index: spaces and line breaks as
 * themselves, a bold, italic or code mark as nothing, anything else a random symbol.
 */
export function churnSymbols(text: string): string[] {
  const pool = makeDecodeChurn(text.length);
  const out: string[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    out.push(isBlank(ch) ? ch : isInlineMark(ch) ? "" : pool[i]!);
  }
  return out;
}

/** Real text for the span: as written, minus the bold, italic and code marks (see isInlineMark). */
export function withoutInlineMarks(text: string): string {
  return text.replace(/[*`]/g, "");
}

/** Past any spaces and line breaks from `from`: they settle for free. */
function skipBlanks(text: string, from: number): number {
  let i = from;
  while (i < text.length && isBlank(text[i]!)) i += 1;
  return i;
}

/**
 * "Settle after a moment": the first letter from `from` on that is still inside its scramble time.
 * `arrivals[i]` is when letter i arrived, on the same clock as `now`; letters arrive in order, so
 * the settle point only ever moves forward.
 */
export function settlePointAfterMoment(
  arrivals: readonly number[],
  from: number,
  now: number,
  settleMs: number
): number {
  let i = from;
  while (i < arrivals.length && arrivals[i]! + settleMs <= now) i += 1;
  return i;
}

/**
 * "Chip pace": settle one letter per SCRAMBLE_CHAR_MS of `credit` banked since the last step.
 * Returns the new settle point and the credit left over (capped, and zero once caught up).
 */
export function settlePointChipPace(
  text: string,
  from: number,
  credit: number
): { point: number; credit: number } {
  let point = skipBlanks(text, from);
  let left = Math.min(credit, CHIP_CREDIT_CAP);
  while (point < text.length && left >= 1) {
    point = skipBlanks(text, point + 1);
    left -= 1;
  }
  return { point, credit: point >= text.length ? 0 : left };
}

/** "Fixed tail": the settle point that leaves exactly `keep` letters scrambled at the end. */
export function settlePointFixedTail(text: string, keep: number = SCRAMBLE_TAIL_LETTERS): number {
  let kept = 0;
  let i = text.length;
  while (i > 0 && kept < keep) {
    i -= 1;
    if (!isBlank(text[i]!)) kept += 1;
  }
  return i;
}

/** How many of `total` letters are real `elapsedMs` into the finish: all within SCRAMBLE_FINISH_MS, never slower than chip pace. */
export function lettersSettledInFinish(total: number, elapsedMs: number): number {
  if (total <= 0) return 0;
  const perMs = Math.max(1 / SCRAMBLE_CHAR_MS, total / SCRAMBLE_FINISH_MS);
  return Math.min(total, Math.floor(Math.max(0, elapsedMs) * perMs));
}

/**
 * The markdown to render for a section whose first `settled` characters are real: those
 * characters, then the slot mark where the churning span goes. The mark goes in before the closers
 * normalizeIncompleteInline adds, so a word scrambling inside bold stays bold.
 */
export function settledMarkdownWithSlot(raw: string, settled: number): string {
  return normalizeIncompleteInline(raw.slice(0, settled) + SCRAMBLE_SLOT_MARK);
}

/** What the stream's end hands over so the finished answer can find the settle point again. */
export type FinishProbe = {
  /** Text either side of the settle point, never across a blank line. */
  probe: string;
  /** Where in `probe` the settle point is. */
  offset: number;
};

/**
 * The probe for the settle point `settled` in the streamed text: up to 32 characters before it and
 * after it, cut at any blank line, because the finished answer is split into sections at blank
 * lines and the probe has to sit inside one of them. Null when it holds too few letters to be
 * found in the right place.
 */
export function finishProbeAt(text: string, settled: number): FinishProbe | null {
  let before = text.slice(Math.max(0, settled - FINISH_PROBE_CHARS), settled);
  const blankBefore = before.lastIndexOf("\n\n");
  if (blankBefore >= 0) before = before.slice(blankBefore + 2);
  let after = text.slice(settled, settled + FINISH_PROBE_CHARS);
  const blankAfter = after.indexOf("\n\n");
  if (blankAfter >= 0) after = after.slice(0, blankAfter);
  const probe = before + after;
  return countLetters(probe) >= FINISH_PROBE_MIN_LETTERS ? { probe, offset: before.length } : null;
}

/**
 * Where the settle point handed over by the stream's end falls in one finished section, or -1
 * when the section does not hold it. Everything from there to the section's end settles in the
 * finish: the letters still scrambling, and any the stream never showed (the last few words, or a
 * line under the answer, that arrived with the end itself).
 */
export function locateSettlePoint(sectionText: string, handed: FinishProbe): number {
  const at = sectionText.lastIndexOf(handed.probe);
  return at < 0 ? -1 : at + handed.offset;
}
