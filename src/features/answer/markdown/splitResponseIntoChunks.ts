/**
 * Title: Cutting an answer into D-pad-sized sections
 *
 * Purpose: An answer can be long. Showing it as one solid block would mean a single D-pad press
 * scrolls through all of it with no stopping point, so the answer is cut into sections, each its own
 * stop the D-pad can land on. A fenced block (a part of the answer wrapped in three backticks or
 * three tildes) is never cut, and always sits in a section of its own.
 *
 * Used for: `buildAnswerBubbleElement`, both while an answer is still arriving and once it is
 * finished, and Copy (`answerCopyText`), which puts a blank line wherever the screen cuts.
 *
 * Solves: The answer must look the same while it writes and after it finishes (plan 93, the
 * maintainer's pick on the mock-up board, tab 3, option A). The old cut looked ahead: it merged
 * whole paragraphs up to 900 letters, so where a section ended depended on how long the NEXT
 * paragraph turned out to be, and a one-paragraph answer was cut every 300 letters only if no second
 * paragraph ever came. Text still arriving could not know either, so the answer was drawn as one
 * block while it wrote and re-cut at the finish. Every cut here is decided by the text BEFORE it, so
 * a section that has closed while the answer writes is exactly the section the finished answer has.
 *
 * Does not: Remove the model's own control tags (`stripAssistantDisplayTags.ts` runs first), or
 * decide what a half-written fence shows while it arrives (`streamMarkdownPrepare.ts`).
 *
 * How it works: the text is read line by line, the way the panel reads fences
 * (markdownFenceReader). A section is "full" once it holds SECTION_FULL_CHARS letters; a full section
 * closes at the first of these that follows:
 *   - a paragraph break (a blank line);
 *   - a line break that is safe to cut at: not before an indented line (a list item's next
 *     paragraph, indented code), not inside a table, not before a heading's underline, not between
 *     a list item and plain text that continues it;
 *   - a sentence end inside a plain line of prose (not a list item, heading, quote or table row),
 *     where no bold, code or link mark is left open.
 * Whatever its length, a section also closes before a fence that starts a paragraph, and at the
 * first paragraph break after a fence, so a fence sits with no paragraph but its own. While the text is still arriving (`final` false), its last line is not yet a
 * whole line: a cut that would depend on how that line goes on is not made until it can be.
 */
import { stepFence, type OpenFence } from "./markdownFenceReader";

/**
 * How full a section gets before it closes at the next good place, in letters.
 *
 * About a third of a screen of the Deck's reading area (roughly 45 letters a line, 40 lines a screen),
 * so a section usually ends between 600 and 900 letters: the "about half a screen" of the
 * maintainer's call of 2026-09-06, now decided looking backwards only (the session's call, plan 93).
 */
export const SECTION_FULL_CHARS = 600;

const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,9}[.)])(\s|$)/;
const INDENTED = /^( {2,}|\t)/;
const TABLE_ROW = /^\s*\|/;
const SETEXT_UNDERLINE = /^\s{0,3}(=+|-+)\s*$/;
/** A line that may still become a fence opener, a heading underline or an indent: not yet decided. */
const UNDECIDED_START = /^\s*$|^\s{0,3}([`~]{1,2}|[-=]+\s*)$/;
/** A plain line of prose: sentence ends inside it are places to cut. */
const NOT_PROSE = /^\s*([-*+>#|]|\d{1,9}[.)]\s|[`~]{3})/;
/** A sentence end, its closing marks, the spaces after it, and the start of the next sentence. */
const SENTENCE_END = /[.!?]["')\]*_]*\s+(?=[^\s\p{Ll}])/gu;

function count(s: string, needle: string): number {
  return s.split(needle).length - 1;
}

/** Whether nothing inline (code, bold, a link) is left open in `s`, so a cut after it is clean. */
function inlineClosed(s: string): boolean {
  if (count(s, "`") % 2 === 1) return false;
  const bold = count(s, "**");
  if (bold % 2 === 1) return false;
  if (count(s.split("**").join(""), "*") % 2 === 1) return false;
  return count(s, "[") === count(s, "]") && count(s, "(") === count(s, ")");
}

/**
 * The sections of `text`, in order; joined they hold every word of it. With `final` false the text
 * is still arriving: every section but the last is closed for good, and the last one is still
 * filling. With `final` true (the default) the text is the whole answer.
 */
export function cutAnswerSections(text: string, final = true): string[] {
  const cuts: number[] = [];
  let sectionStart = 0;
  let open: OpenFence | null = null;
  /* The section holds a fence: it closes at the next paragraph break, full or not. */
  let holdsFence = false;
  let sawBlank = false;
  let prev: string | null = null;
  let prevInList = false;
  let offset = 0;
  const lines = text.split("\n");
  const sectionLength = (end: number) => text.slice(sectionStart, end).trim().length;
  const cut = (at: number) => {
    if (sectionLength(at) > 0) {
      cuts.push(at);
      sectionStart = at;
      holdsFence = false;
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const lineStart = offset;
    offset += line.length + 1;
    const whole = final || i < lines.length - 1;

    if (open) {
      if (!whole) break;
      if (stepFence(line, open).kind === "close") open = null;
      continue;
    }
    if (line.trim() === "") {
      if (prev !== null) sawBlank = true;
      continue;
    }
    if (!whole && UNDECIDED_START.test(line)) break;

    const step = stepFence(line, null);
    const opensFence = step.kind === "open";
    const full = sectionLength(lineStart) >= SECTION_FULL_CHARS;
    const safeLineBreak =
      !INDENTED.test(line) &&
      !(prev !== null && TABLE_ROW.test(prev) && TABLE_ROW.test(line)) &&
      !SETEXT_UNDERLINE.test(line) &&
      !(prevInList && !LIST_ITEM.test(line));
    /* A fence that starts a paragraph starts a section; one that opens inside a paragraph stays
       with it (the old cut kept such a paragraph whole: a "**7." heading above a hidden block was
       otherwise a four-letter stop of its own, plan 93 round 2). */
    if ((sawBlank && (holdsFence || opensFence)) || (full && (sawBlank || safeLineBreak))) cut(lineStart);
    if (opensFence) holdsFence = true;
    sawBlank = false;
    prevInList = LIST_ITEM.test(line) || (prevInList && INDENTED.test(line));
    prev = line;
    if (opensFence) {
      open = step.open;
      continue;
    }

    if (NOT_PROSE.test(line) || INDENTED.test(line)) continue;
    for (const m of line.matchAll(SENTENCE_END)) {
      const at = lineStart + m.index! + m[0].length;
      if (sectionLength(at) >= SECTION_FULL_CHARS && inlineClosed(text.slice(Math.max(lineStart, sectionStart), at))) {
        cut(at);
      }
    }
  }

  const sections: string[] = [];
  let from = 0;
  for (const at of [...cuts, text.length]) {
    const piece = text.slice(from, at).trim();
    if (piece) sections.push(piece);
    from = at;
  }
  return sections;
}

/** The sections of a finished answer (see cutAnswerSections). */
export function splitResponseIntoChunks(text: string): string[] {
  return cutAnswerSections(text, true);
}
