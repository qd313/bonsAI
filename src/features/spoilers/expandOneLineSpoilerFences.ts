/**
 * Title: A hidden block written on one line, turned into the usual shape
 *
 * Purpose: The model sometimes writes a hidden block on one line ("```bonsai-spoiler The Soul
 * Master teleports. ```"), the inline shape its own instructions show. Markdown reads text after
 * the opening backticks as the block's label, so the cover opened onto the word "undefined", and a
 * block glued to a sentence was not a block at all: its text showed as plain code. This gives the
 * opening marker and the closing marker their own lines, so the text is the block's content.
 *
 * Used for: buildAnswerBubbleElement.tsx, on the answer text before anything else reads it, for
 * both a streaming and a finished answer; and answerCopyText.ts, so Copy hides such a block
 * exactly as the screen does.
 *
 * A third shape (plan 77): the opening marker glued onto the end of a sentence, the block's text on
 * the lines below ("The```bonsai-spoiler"). Markdown reads a marker that is not at the start of a
 * line as the start of inline code, so the words below were drawn in plain view, and while the
 * answer streamed they showed as text. The marker gets its own line, so the block is a block.
 *
 * A fourth shape (plan 78): the label between two sets of backticks with nothing between them
 * ("```bonsai-spoiler```"), used by a small model as both the opening and the closing mark. The page
 * showed the word twice as plain text, drew no cover, and the words between were readable. Such a
 * mark is never text: outside a hidden block it opens one, inside it closes it. It is turned into
 * the usual opener or closer on its own line, before the rules above see the text.
 *
 * A fifth shape (plan 97): the hidden block sits inside bold marks on one line ("**7. ```bonsai-spoiler
 * Name```**"). The marker gets its own lines, which cut the bold pair in two, and Markdown then
 * drew both pairs of stars as plain text. The bold is closed just before the block and, if the line
 * closed it again after the block, reopened there (or dropped when nothing else follows).
 *
 * Does not: touch a block already written the usual way (the opening marker alone on its line, or
 * after only indent, quote marks or list markers), or any other kind of fenced block.
 */

/** A whole one-line block: opening marker, a space, its text, closing marker, on one line. */
const ONE_LINE_BLOCK_RE = /```bonsai-spoiler[ \t]+([^\n`][^\n]*?)```/g;

/** An opening marker with text after it on its own line: the closing marker is on a later line or
 * has not arrived yet (mid-stream). */
const OPENER_WITH_TEXT_RE = /```bonsai-spoiler[ \t]+(?=[^\s`])/g;

/** Every opening marker, with the text before it on its line. (A marker with another backtick
 *  right before it is the tail of a longer fence mark, not a glued one: left alone.) */
const OPENER_ANYWHERE_RE = /^(.*?)```bonsai-spoiler/gm;

/** What may stand before an opening marker on its own line: indent, quote marks, list markers. */
const LINE_START_ONLY_RE = /^[ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+[ \t>]*)*$/;

/** One token per backtick run that matters when telling whether a line is inside a hidden block:
 *  the empty-label mark, an ordinary opener, or a bare fence mark. The streaming form also takes a
 *  mark still being typed at the very end of the answer (one or two closing backticks so far). */
const MARK_TOKEN_RE = /(?<!`)```bonsai-spoiler[ \t]*```(?!`)|(?<!`)```bonsai-spoiler|(?<!`)```(?!`)/g;
const MARK_TOKEN_STREAMING_RE =
  /(?<!`)```bonsai-spoiler[ \t]*(?:```(?!`)|`{1,2}$)|(?<!`)```bonsai-spoiler|(?<!`)```(?!`)/g;
const EMPTY_LABEL_TOKEN_RE = /^```bonsai-spoiler[ \t]*`{1,3}$/;
const BARE_CLOSER_LINE_RE = /^[ \t>]*```[ \t]*$/;

/** Turn each empty-label mark into the opener or closer it stands for, each on its own line. */
function repairEmptyLabelMarks(text: string): string {
  if (!/```bonsai-spoiler[ \t]*`/.test(text)) return text;
  let inside = false;
  const lines = text.split("\n");
  const last = lines.length - 1;
  return lines
    .map((line, i) => {
      if (!line.includes("`")) return line;
      let out = "";
      let pos = 0;
      let openedHere = false;
      for (const m of line.matchAll(i === last ? MARK_TOKEN_STREAMING_RE : MARK_TOKEN_RE)) {
        const token = m[0];
        const end = m.index + token.length;
        if (EMPTY_LABEL_TOKEN_RE.test(token)) {
          const before = out + line.slice(pos, m.index);
          const tail = before.slice(before.lastIndexOf("\n") + 1);
          const mark = inside ? "```" : "```bonsai-spoiler";
          inside = !inside;
          out = before + (LINE_START_ONLY_RE.test(tail) ? "" : "\n") + mark;
          if (/\S/.test(line.slice(end))) out += "\n";
          pos = end;
        } else if (token === "```bonsai-spoiler") {
          if (!inside) openedHere = inside = true;
        } else if (inside && (openedHere || BARE_CLOSER_LINE_RE.test(line))) {
          inside = false;
        }
      }
      return out + line.slice(pos);
    })
    .join("\n");
}

/** A whole one-line block at the very start of the text. */
const ONE_LINE_BLOCK_AT_START_RE = /^```bonsai-spoiler[ \t]+[^\n`][^\n]*?```/;
const BOLD_MARK = "**";
const boldMarkCount = (s: string): number => s.split(BOLD_MARK).length - 1;

/** The text before the block with its bold shut: an opening pair with nothing inside is dropped. */
function shutBoldBefore(before: string): string {
  return before.endsWith(BOLD_MARK) ? before.slice(0, -2).trimEnd() : before + BOLD_MARK;
}

/** On a line whose bold opens before a hidden block, close it before the block, so the block's own
 *  lines cannot cut the pair in two; what follows the block gets the bold back, or loses a lone
 *  closing pair. A line whose bold is balanced before the block is left alone. */
function closeBoldBeforeBlock(line: string): string {
  const at = line.indexOf("```bonsai-spoiler");
  if (at <= 0 || boldMarkCount(line.slice(0, at)) % 2 === 0) return line;
  const before = shutBoldBefore(line.slice(0, at).trimEnd());
  const rest = line.slice(at);
  const closer = ONE_LINE_BLOCK_AT_START_RE.exec(rest);
  if (!closer) {
    // The closing marker has not arrived (mid-stream), or this is an empty-label mark.
    const bare = rest.trimEnd();
    return `${before}\n${bare.endsWith(BOLD_MARK) ? bare.slice(0, -2) : rest}`;
  }
  let after = rest.slice(closer[0].length);
  if (after.trim() === BOLD_MARK) after = "";
  else if (boldMarkCount(after) % 2 === 1) after = BOLD_MARK + after.trimStart();
  return `${before}\n${closer[0]}${after}`;
}

export function expandOneLineSpoilerFences(text: string): string {
  if (!text.includes("```bonsai-spoiler")) return text;
  const closed = text.includes(BOLD_MARK) ? text.split("\n").map(closeBoldBeforeBlock).join("\n") : text;
  return repairEmptyLabelMarks(closed)
    .replace(ONE_LINE_BLOCK_RE, (_m, body: string) => `\n\`\`\`bonsai-spoiler\n${body}\n\`\`\`\n`)
    .replace(OPENER_WITH_TEXT_RE, "\n```bonsai-spoiler\n")
    .replace(OPENER_ANYWHERE_RE, (whole, before: string) =>
      LINE_START_ONLY_RE.test(before) || before.endsWith("`") ? whole : `${before}\n\`\`\`bonsai-spoiler`
    );
}
