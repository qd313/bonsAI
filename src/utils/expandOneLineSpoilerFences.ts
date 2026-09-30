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
 * both a streaming and a finished answer; and answerCopyText.ts / answerReadableText.ts, so Copy
 * and Read aloud hide such a block exactly as the screen does.
 *
 * A third shape (plan 77): the opening marker glued onto the end of a sentence, the block's text on
 * the lines below ("The```bonsai-spoiler"). Markdown reads a marker that is not at the start of a
 * line as the start of inline code, so the words below were drawn in plain view, and while the
 * answer streamed they showed as text. The marker gets its own line, so the block is a block.
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

export function expandOneLineSpoilerFences(text: string): string {
  if (!text.includes("```bonsai-spoiler")) return text;
  return text
    .replace(ONE_LINE_BLOCK_RE, (_m, body: string) => `\n\`\`\`bonsai-spoiler\n${body}\n\`\`\`\n`)
    .replace(OPENER_WITH_TEXT_RE, "\n```bonsai-spoiler\n")
    .replace(OPENER_ANYWHERE_RE, (whole, before: string) =>
      LINE_START_ONLY_RE.test(before) || before.endsWith("`") ? whole : `${before}\n\`\`\`bonsai-spoiler`
    );
}
