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
 * Does not: touch a block already written the usual way (the opening marker alone on its line),
 * or any other kind of fenced block.
 */

/** A whole one-line block: opening marker, a space, its text, closing marker, on one line. */
const ONE_LINE_BLOCK_RE = /```bonsai-spoiler[ \t]+([^\n`][^\n]*?)```/g;

/** An opening marker with text after it on its own line: the closing marker is on a later line or
 * has not arrived yet (mid-stream). */
const OPENER_WITH_TEXT_RE = /```bonsai-spoiler[ \t]+(?=[^\s`])/g;

export function expandOneLineSpoilerFences(text: string): string {
  if (!text.includes("```bonsai-spoiler")) return text;
  return text
    .replace(ONE_LINE_BLOCK_RE, (_m, body: string) => `\n\`\`\`bonsai-spoiler\n${body}\n\`\`\`\n`)
    .replace(OPENER_WITH_TEXT_RE, "\n```bonsai-spoiler\n");
}
