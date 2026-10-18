/**
 * Title: Thinking blurb italic segments
 * Purpose: Split thinking status copy so emoji graphemes stay upright while prose stays italic.
 * Used for: MainTabChatTranscript live Ask thinking line rendering.
 * Solves: Parent-row `fontStyle: italic` slants emoji-only and inline emoji blurbs.
 * Does not: Change blurb copy pools — Python owns them, see bonsai_stream_tags.py.
 */

export type ThinkingBlurbItalicSegment = {
  text: string;
  italic: boolean;
};

/*
 * Emoji clusters, plus runs of the redaction glyph. Both are drawn shapes rather than prose, and
 * both look wrong slanted \u2014 a leaning redaction bar reads as a rendering fault rather than as
 * something deliberately hidden.
 */
const UPRIGHT_RUN_RE =
  /\u2588+|\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*/gu;

function appendSegment(
  segments: ThinkingBlurbItalicSegment[],
  text: string,
  italic: boolean,
): void {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && last.italic === italic) {
    last.text += text;
    return;
  }
  segments.push({ text, italic });
}

/** Merge adjacent graphemes that share the same italic flag. */
export function splitThinkingBlurbItalicSegments(text: string): ThinkingBlurbItalicSegment[] {
  const raw = text ?? "";
  if (!raw) return [];

  const segments: ThinkingBlurbItalicSegment[] = [];
  let lastIndex = 0;
  UPRIGHT_RUN_RE.lastIndex = 0;

  for (const match of raw.matchAll(UPRIGHT_RUN_RE)) {
    const start = match.index ?? 0;
    appendSegment(segments, raw.slice(lastIndex, start), true);
    appendSegment(segments, match[0], false);
    lastIndex = start + match[0].length;
  }

  appendSegment(segments, raw.slice(lastIndex), true);
  return segments;
}
