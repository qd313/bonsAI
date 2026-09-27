/**
 * Title: The live answer's text, in pieces that stop changing
 * Purpose: Splits the growing text of an answer that is still arriving into pieces at blank lines
 * between top-level blocks, so each finished paragraph, heading or list is its own piece whose
 * text never changes again, and only the last piece grows.
 * Used for: ScrambledAnswerText, for the live tail of a streaming answer: each piece is drawn by
 * its own memoised markdown renderer, so an update parses and draws only the last piece.
 * Solves: Each update of an arriving answer used to parse and draw the whole answer again, so the
 * cost of an update grew with the answer. Deck, 2026-09-27, Deep Rock Galactic: Survivor running:
 * the panel started each answer at about 38 frames a second and sank to 21-28 once it passed about
 * 1,200 letters. On the PC, one update of the chat took 1.8 ms at 300 letters and 4.3 ms at 3,600.
 * Does not: Change how anything looks. A split is made only where parsing the pieces one by one
 * gives the same blocks as parsing the whole: never inside a code fence, never before an indented
 * line (a list item's next paragraph, indented code), never between two list items (a loose
 * list). Each piece keeps its leading blank lines, so the pieces join back to the exact text, and
 * a piece's text is the same from one update to the next once a later piece has started.
 */

/** The whole feature's off switch: false draws the live answer as one piece, as before. */
export const SPLIT_LIVE_ANSWER_INTO_PIECES: boolean = true;

const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,9}[.)])(\s|$)/;
const INDENTED = /^( {2,}|\t)/;
const FENCE = /^\s{0,3}(```|~~~)/;

function isBlank(line: string): boolean {
  return line.trim() === "";
}

/**
 * The pieces of `text`, in order; joined they are `text`. A text with no safe split is one piece.
 */
export function splitStreamMarkdownPieces(text: string): string[] {
  const lines = text.split("\n");
  const pieces: string[] = [];
  let start = 0; // character offset where the current piece starts
  let offset = 0; // character offset of line i
  let inFence = false;
  let lastContent: string | null = null; // the last non-blank line before a blank run
  let blankRunStart = -1; // character offset of the newline that starts the blank run

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const lineStart = offset;
    offset += line.length + 1;

    if (inFence) {
      if (FENCE.test(line)) inFence = false;
      lastContent = line;
      continue;
    }
    if (isBlank(line)) {
      if (blankRunStart < 0 && lastContent !== null) blankRunStart = lineStart - 1;
      continue;
    }
    if (blankRunStart >= 0 && lastContent !== null) {
      const prevInList = LIST_ITEM.test(lastContent) || INDENTED.test(lastContent);
      const unsafe = INDENTED.test(line) || (prevInList && LIST_ITEM.test(line));
      if (!unsafe) {
        pieces.push(text.slice(start, blankRunStart));
        start = blankRunStart;
      }
    }
    blankRunStart = -1;
    if (FENCE.test(line)) inFence = true;
    lastContent = line;
  }
  pieces.push(text.slice(start));
  return pieces;
}
