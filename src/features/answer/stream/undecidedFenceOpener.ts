/**
 * Title: Live answer text, minus a fence opener that is still being written
 *
 * Purpose: Cuts off the end of a still-arriving answer when that end is the start of a fenced
 * block that cannot be told yet: a last line that is only fence marks so far ("`", "``", "```",
 * "~~~") or marks and a word still being typed ("```bon", "```bonsai-strategy-bra"), or a plain or
 * "json" block whose body has not reached its first key. The answer is drawn without it until the
 * line or the first key says what it is.
 *
 * Used for: buildAnswerSections.tsx (answerSectionBodies), on the live text of an answer that is
 * still writing, before it is cut into sections.
 *
 * Solves: The answer jumping 48.6 px taller two to three seconds before the end of a Strategy
 * answer, and falling back (Deck, 2026-10-22; plan 97, L4). A Strategy answer ends with the choice
 * menu, a fenced block the back end hides from the live text -- but only once the opener names it
 * (`hide_incomplete_strategy_branch_fence`, strategy_guide_parse.py), or, for a "```json" menu,
 * once its first key is "question" or "options". Until then the half-written opener reached the
 * screen, the answer drew the "Code block incoming…" box for it (exactly 48.6 px tall with the
 * Deck's text size), and the box vanished when the back end hid the menu. A lone "`" or "``" drew
 * an empty paragraph first, and moving the last section around restarted its scramble.
 *
 * Does not: Hide a real code block. Once the opener's line is finished with any other name, or a
 * json block's first key is anything but the menu's, the box shows as before; a finished answer
 * is never cut.
 */
import { stepFence, type OpenFence } from "../markdown/markdownFenceReader";

/** A last line that may still become a fence opener: marks, then at most one word so far. */
const UNFINISHED_OPENER = /^ {0,3}(`+|~+)[^\s`~]*$/;
/** The two names the back end's choice menu is written under when it is not named outright. */
const MENU_LIKE_INFO = /^(json)?$/i;
/** A json body that has not reached the end of its first key yet. */
const BODY_BEFORE_FIRST_KEY = /^(\{\s*("[^"]*)?)?$/;

/**
 * In: the live text of an answer still writing. Out: the same text, or the text before an
 * undecided fence opener at its end (trailing blank lines dropped with it).
 */
export function withoutUndecidedFenceOpener(text: string): string {
  const lastBreak = text.lastIndexOf("\n");
  if (UNFINISHED_OPENER.test(text.slice(lastBreak + 1))) return text.slice(0, lastBreak + 1).trimEnd();
  let open: { start: number; info: string; fence: OpenFence; bodyStart: number } | null = null;
  let pos = 0;
  while (pos < text.length) {
    const nl = text.indexOf("\n", pos);
    const next = nl === -1 ? text.length : nl + 1;
    const step = stepFence(text.slice(pos, nl === -1 ? text.length : nl), open?.fence ?? null);
    if (step.kind === "open" && !open) open = { start: pos, info: step.info, fence: step.open, bodyStart: next };
    else if (step.kind === "close") open = null;
    pos = next;
  }
  if (open && MENU_LIKE_INFO.test(open.info) && BODY_BEFORE_FIRST_KEY.test(text.slice(open.bodyStart).trim())) {
    return text.slice(0, open.start).trimEnd();
  }
  return text;
}
