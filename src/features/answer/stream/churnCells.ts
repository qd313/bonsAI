/**
 * Title: The scramble's unsettled letters, kept in line with the text
 *
 * Purpose: Writes the churn span of an answer still settling (ScrambledAnswerText.tsx): one cell
 * per unsettled character, kept in step with the text as letters arrive at the back and settle
 * from the front, touching only what changed. Line breaks are drawn the way the settled markdown
 * will lay them out, so the answer never shrinks when they settle (plan 97, L4).
 *
 * Used for: ScrambledAnswerText.tsx, from its last layout effect (`paint`).
 *
 * Solves: The answer shrinking by a few pixels, about seven times in one long answer, each time
 * the writing passed a line break (Deck, 2026-10-14). The span keeps its line breaks (pre-wrap) so a
 * list item starts where the markdown will put it, but the markdown lays two kinds of break out
 * differently: a paragraph break is a small margin, not an empty line, and a single line break
 * inside a paragraph is only a space.
 *
 * Does not: Decide what is settled, own any timer, or know about React: it is handed the span, the
 * cells it kept, the text and the settle point.
 *
 * How it works:
 * 1. `freshCells()` is an empty record; `basis` null means "build the span again from scratch".
 * 2. `syncChurnCells()` drops the cells settled since the last call from the front of the span,
 *    appends cells for characters that arrived, and, when asked, gives every letter a new symbol.
 * 3. A paragraph break (two line breaks) is one block as tall as the markdown's gap between
 *    paragraphs; a third line break adds nothing.
 * 4. A single line break is a line break only where the markdown starts a new block after it (a
 *    list item, a heading, a quote, a table row) or the line before was a heading; anywhere else it
 *    is a space. A line break at the very end, or before a line too short to tell, is a space until
 *    the next line shows what it is, and is looked at again on every call.
 */
import { churnCellKind, churnSymbol } from "./streamScrambleMath";

/**
 * What the churn span holds: one node per unsettled character from `start` to `end` of `basis`
 * (a letter is a span, a space or line break a text node, a paragraph break one gap block, a bold or
 * code mark nothing). `basis` null means the nodes no longer match anything and must be built again.
 */
export type ChurnCells = {
  basis: string | null;
  start: number;
  end: number;
  list: Array<{ index: number; node: Node; kind: "letter" | "gap" | "text" }>;
};

export function freshCells(): ChurnCells {
  return { basis: null, start: 0, end: 0, list: [] };
}

/** A line that starts a block of its own in the markdown: a list item, heading, quote, rule or table row. */
const STARTS_BLOCK = /^ {0,3}([-*+]\s|\d{1,9}[.)]\s|#{1,6}(\s|$)|>|`{3}|~{3}|\||(-{3,}|\*{3,}|_{3,})\s*$)/;
const IS_HEADING = /^ {0,3}#{1,6}(\s|$)/;

/**
 * What the line break at `text[at]` is drawn as: "\n" where the markdown also breaks the line, " "
 * where it only joins the two lines. Looks at the line after it and the line before it.
 */
function lineBreakDrawnAs(text: string, at: number): string {
  if (text[at + 1] === "\n") return "\n"; // the first break of a paragraph break
  const lineEnd = text.indexOf("\n", at + 1);
  const next = text.slice(at + 1, lineEnd < 0 ? text.length : lineEnd);
  if (next.trim() === "") return " "; // nothing to tell yet
  if (STARTS_BLOCK.test(next)) return "\n";
  const before = text.slice(text.lastIndexOf("\n", at - 1) + 1, at);
  return IS_HEADING.test(before) || before.trimStart().startsWith("|") ? "\n" : " ";
}

/**
 * Brings the churn span in line with `text` settled up to `from`, touching only what changed:
 * settled letters leave from the front, arriving ones join at the back. Each letter stays in the
 * line as itself -- invisible, with its symbol drawn over it (answerBubble.ts) -- so the line is
 * laid out exactly as it will be once the letter is real, and a reshuffle only swaps the symbols
 * (`reshuffle`), which moves nothing. A symbol wider or narrower than its letter used to re-wrap
 * the last line on every reshuffle, and every re-wrap set the chat's size watchers measuring the
 * whole panel again (Deck profile, 2026-09-24: the page never went idle while an answer arrived).
 */
export function syncChurnCells(churn: HTMLSpanElement, cells: ChurnCells, text: string, from: number, reshuffle: boolean) {
  if (cells.basis === null || !text.startsWith(cells.basis) || from < cells.start) {
    churn.replaceChildren();
    cells.list = [];
    cells.start = from;
    cells.end = from;
  }
  let settled = 0;
  while (settled < cells.list.length && cells.list[settled]!.index < from) {
    churn.removeChild(cells.list[settled]!.node);
    settled += 1;
  }
  if (settled > 0) cells.list.splice(0, settled);
  cells.start = from;
  const doc = churn.ownerDocument;
  const arriving = doc.createDocumentFragment();
  for (let i = Math.max(cells.end, from); i < text.length; i += 1) {
    const ch = text[i]!;
    const kind = churnCellKind(ch);
    if (kind === "mark") continue;
    let node: Node;
    let cellKind: "letter" | "gap" | "text" = "text";
    if (kind === "blank") {
      if (ch === "\n" && text[i - 1] === "\n") {
        /* The second line break of a paragraph break. Two line breaks in this span would draw a
           whole empty line, but the markdown puts only a small margin there once the text settles,
           so the answer shrank as the break settled (plan 97, L4). A block as tall as that margin
           keeps the heights equal; a third line break adds nothing, as in markdown. */
        if (text[i - 2] === "\n") continue;
        node = doc.createElement("span");
        (node as HTMLElement).className = "bonsai-stream-scramble-gap";
        cellKind = "gap";
      } else {
        node = doc.createTextNode(ch === "\n" ? lineBreakDrawnAs(text, i) : ch);
      }
    } else {
      const letter = doc.createElement("span");
      letter.className = "bonsai-stream-scramble-char";
      letter.textContent = ch;
      letter.setAttribute("data-s", churnSymbol());
      node = letter;
      cellKind = "letter";
    }
    arriving.appendChild(node);
    cells.list.push({ index: i, node, kind: cellKind });
  }
  if (arriving.firstChild) churn.appendChild(arriving);
  cells.end = text.length;
  cells.basis = text;
  for (const cell of cells.list) {
    if (cell.kind === "letter") {
      if (reshuffle) (cell.node as Element).setAttribute("data-s", churnSymbol());
    } else if (cell.kind === "text" && text[cell.index] === "\n") {
      /* A line break drawn before the line after it had shown what it was: look again. */
      const drawn = lineBreakDrawnAs(text, cell.index);
      if ((cell.node as Text).data !== drawn) (cell.node as Text).data = drawn;
    }
  }
}
