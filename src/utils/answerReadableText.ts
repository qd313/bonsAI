/**
 * Title: Markdown table finder
 * Purpose: Find the pipe tables in an answer's markdown and swap each one for a replacement.
 * Used for: the reply-ready notification's text (toastAnswerPreview), which drops the table.
 * Solves: A table's bars and dashes showing up as clutter in a one-line preview.
 * Does not: Touch anything but tables. The file's name is left over from the removed read-aloud
 *   feature; moving the finder next to toastAnswerPreview is a later step.
 */

/** A row with a bar in it. A fence marker line never counts, even with a bar in its label, so
 *  taking a table out can never take out a fence's opening line and bare what it hides. */
function isTableRowLine(line: string): boolean {
  return line.includes("|") && line.trim().length > 0 && !/^\s*(`{3,}|~{3,})/.test(line);
}

const TABLE_SEPARATOR_ROW_RE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/;

function isTableSeparatorLine(line: string): boolean {
  return TABLE_SEPARATOR_ROW_RE.test(line);
}

/**
 * Replace each GFM pipe-table block (a row with a bar, then a dashes row, then more rows with a
 * bar) with `replacement`. The header row needs no leading bar. The reply-ready notification
 * passes "" to drop the table.
 */
export function replaceMarkdownTables(text: string, replacement: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const next = lines[i + 1];
    if (isTableRowLine(line) && next !== undefined && isTableSeparatorLine(next)) {
      i += 2;
      while (i < lines.length && isTableRowLine(lines[i]!)) {
        i++;
      }
      out.push(replacement);
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join("\n");
}
