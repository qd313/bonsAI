/**
 * Title: The scramble's unsettled letters, kept in line with the text
 *
 * Purpose: Writes the churn span of an answer still settling (ScrambledAnswerText.tsx): one cell
 * per unsettled character, kept in step with the text as letters arrive at the back and settle
 * from the front, touching only what changed.
 *
 * Used for: ScrambledAnswerText.tsx, from its last layout effect (`paint`).
 *
 * Solves: Moved out of ScrambledAnswerText.tsx unchanged (plan 97, L4) so that file stays under
 * its size limit while the cells learn to lay breaks out as the settled markdown will.
 *
 * Does not: Decide what is settled, own any timer, or know about React: it is handed the span, the
 * cells it kept, the text and the settle point.
 *
 * How it works:
 * 1. `freshCells()` is an empty record; `basis` null means "build the span again from scratch".
 * 2. `syncChurnCells()` drops the cells settled since the last call from the front of the span,
 *    appends cells for characters that arrived, and, when asked, gives every letter a new symbol.
 */
import { churnCellKind, churnSymbol } from "./streamScrambleMath";

/**
 * What the churn span holds: one node per unsettled character from `start` to `end` of `basis`
 * (a letter is a span, a space or line break a text node, a bold or code mark nothing). `basis`
 * null means the nodes no longer match anything and must be built again.
 */
export type ChurnCells = { basis: string | null; start: number; end: number; list: Array<{ index: number; node: Node }> };

export function freshCells(): ChurnCells {
  return { basis: null, start: 0, end: 0, list: [] };
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
    if (kind === "blank") {
      node = doc.createTextNode(ch);
    } else {
      const letter = doc.createElement("span");
      letter.className = "bonsai-stream-scramble-char";
      letter.textContent = ch;
      letter.setAttribute("data-s", churnSymbol());
      node = letter;
    }
    arriving.appendChild(node);
    cells.list.push({ index: i, node });
  }
  if (arriving.firstChild) churn.appendChild(arriving);
  cells.end = text.length;
  cells.basis = text;
  if (reshuffle) {
    for (const cell of cells.list) {
      if (cell.node.nodeType === 1) (cell.node as Element).setAttribute("data-s", churnSymbol());
    }
  }
}
