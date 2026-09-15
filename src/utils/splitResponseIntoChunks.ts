/**
 * Title: Breaking a long reply into D-pad-sized pieces
 *
 * Purpose: A finished Ask or Strategy reply can be long. Showing it as one solid block would
 * mean a single D-pad press scrolls through all of it with no stopping point along the way, so
 * this file breaks a reply up into a few pieces first, each becoming its own stop the D-pad can
 * land on. It never cuts a piece of code in the middle — a fenced code block (a part of a reply
 * wrapped in three backticks) always stays whole in one piece.
 *
 * Used for: `buildAnswerBubbleElement` and the answer bubble's up/down D-pad navigation.
 *
 * Solves: without this, a reply is either one long scroll with no stopping point, or, if split
 * too finely, a string of D-pad presses for what reads as a handful of short paragraphs.
 *
 * Does not: remove the model's own control tags from the text first — see
 * `stripAssistantDisplayTags.ts`, a separate cleanup step that runs before this one.
 *
 * How it works: paragraphs (chunks separated by a blank line) are the first split, as long as
 * doing so never cuts a fence in half. Paragraphs that are individually short are then merged
 * back together, up to about 900 characters — roughly half a screen's worth of the reply column
 * on the Deck — so a finished answer becomes a handful of D-pad stops rather than one per
 * paragraph. A single long paragraph with no natural breaks falls back to a length-based split
 * that looks for a natural place to cut — the end of a sentence, or else a gap between two words
 * — rather than cutting through the middle of one, again never cutting inside a fence.
 */
/**
 * True when a line starts a GFM/Markdown code fence (``` or ```json).
 * Used for fence state toggling, not to detect backticks in prose.
 */
function isFenceLine(line: string): boolean {
  return line.trimStart().startsWith("```");
}

/**
 * Per-line fence state up to a character index (treats each line in `before` as complete for toggles).
 */
function isIndexInsideCodeFence(text: string, index: number): boolean {
  if (index <= 0) {
    return false;
  }
  const before = text.slice(0, index);
  let inFence = false;
  for (const line of before.split("\n")) {
    if (isFenceLine(line)) {
      inFence = !inFence;
    }
  }
  return inFence;
}

/** Whether ``` fence markers are balanced (even number of fence lines). */
function hasBalancedFences(s: string): boolean {
  let inFence = false;
  for (const line of s.split("\n")) {
    if (isFenceLine(line)) {
      inFence = !inFence;
    }
  }
  return !inFence;
}

/**
 * Like text.split(/\\n\\n+/).filter(Boolean), but does not break apart fenced code
 * blocks (paragraph breaks inside a fence are ignored as split points).
 */
function splitByParagraphsRespectingFences(text: string): string[] {
  const re = /\n\n+/g;
  const segments: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!isIndexInsideCodeFence(text, m.index)) {
      const seg = text.slice(last, m.index).trim();
      if (seg) {
        segments.push(seg);
      }
      last = m.index + m[0]!.length;
    }
  }
  const tail = text.slice(last).trim();
  if (tail) {
    segments.push(tail);
  }
  return segments;
}

/**
 * Long-text splits at ~maxLen, preferring space/sentence breaks, never splitting
 * between unbalanced code fences.
 */
function splitLongRespectingFences(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) {
    return [text];
  }
  const out: string[] = [];
  let start = 0;
  while (text.length - start > maxLen) {
    const endBudget = start + maxLen;
    let cut = findSafeCutInRange(text, start, endBudget);
    if (cut <= start) {
      cut = Math.min(text.length, endBudget);
    }
    const piece = text.slice(start, cut).trim();
    if (piece) {
      out.push(piece);
    }
    start = cut;
    while (start < text.length && /\s/.test(text[start]!)) {
      start++;
    }
  }
  const rest = text.slice(start).trim();
  if (rest) {
    out.push(rest);
  }
  return out.length > 0 ? out : [text];
}

/**
 * Picks a cut in (start, maxEnd] so the slice [start, cut) has balanced fences, preferring
 * . / space boundaries.
 */
function findSafeCutInRange(text: string, start: number, maxEnd: number): number {
  const limit = Math.min(maxEnd, text.length);
  let c = text.lastIndexOf(". ", limit);
  /*
   * `lastIndexOf(". ", limit)` returns the index of the "." itself, not the boundary after it — used
   * as-is, the slice ends right before the period, so the sentence's own full stop is orphaned onto
   * the start of the next chunk ("...go BOOM" / ". The trick is..."). Advance past both characters so
   * the period stays with the sentence it closes.
   */
  if (c >= 0) {
    c += 2;
  }
  if (c < start + 80) {
    c = text.lastIndexOf(" ", limit);
  }
  if (c < start + 80) {
    c = limit;
  }
  for (let tryCut = c; tryCut > start; ) {
    if (hasBalancedFences(text.slice(start, tryCut))) {
      return tryCut;
    }
    tryCut = text.lastIndexOf(" ", tryCut - 1);
    if (tryCut <= start) {
      break;
    }
  }
  for (let tryCut = limit; tryCut < text.length; tryCut++) {
    if (hasBalancedFences(text.slice(start, tryCut))) {
      return tryCut;
    }
  }
  return limit;
}

/**
 * How much text one D-pad stop may hold, in characters.
 *
 * About half a screen of the Deck's reading area: the answer bubble is ~245px wide inside its
 * padding at 12px/1.4, which is roughly 45 characters a line, and the scrollable column is 667px
 * tall — call it 40 lines a screen, so ~1800 characters full and ~900 for half. Half rather than
 * full so a press still leaves some of the previous section on screen to keep your place.
 * Maintainer's call, 2026-09-06.
 *
 * Only the paragraph and line paths below merge. The density split (`splitLongRespectingFences`)
 * exists to break ONE long paragraph up, so merging its output would undo the thing it just did.
 */
const SECTION_MERGE_MAX_CHARS = 900;

/**
 * Feature: fewer D-pad stops on a finished reply.
 * Input: pieces from one split pass, and the separator that split produced them.
 * Output: the same words in the same order, in fewer pieces.
 *
 * Down only moves the ring to a section that is already on screen (answerBubbleNavigation.ts) —
 * an off-screen section makes it scroll instead — so merging removes the wasted presses that
 * happen when several short paragraphs share one screen. No text is skipped by it.
 *
 * A piece holding a code fence is left alone in both directions: fences stay whole and stay by
 * themselves, exactly as before.
 */
function mergeShortChunks(pieces: string[], joiner: string): string[] {
  if (pieces.length <= 1) {
    return pieces;
  }
  const out: string[] = [];
  let current: string | null = null;
  const flush = () => {
    if (current !== null) {
      out.push(current);
      current = null;
    }
  };
  for (const piece of pieces) {
    if (piece.includes("```") || piece.length >= SECTION_MERGE_MAX_CHARS) {
      flush();
      out.push(piece);
      continue;
    }
    if (current === null) {
      current = piece;
    } else if (current.length + joiner.length + piece.length <= SECTION_MERGE_MAX_CHARS) {
      current = current + joiner + piece;
    } else {
      flush();
      current = piece;
    }
  }
  flush();
  return out;
}

/**
 * Keep responses readable in Decky by splitting dense output into panel-sized chunks.
 * Code fences (```) are never split across chunks: paragraph/density splits are skipped
 * when they would break inside a block. Neighbouring short paragraphs (or lines) are then merged
 * back up to SECTION_MERGE_MAX_CHARS, so a finished answer is a few D-pad stops rather than one
 * per paragraph — see mergeShortChunks.
 */
export function splitResponseIntoChunks(text: string): string[] {
  const t = text.trim();
  if (!t) {
    return [];
  }

  const byParagraph = splitByParagraphsRespectingFences(t);
  if (byParagraph.length > 1) {
    return mergeShortChunks(byParagraph, "\n\n");
  }

  const block = byParagraph[0] ?? t;
  if (block.includes("```")) {
    if (block.length <= 8000) {
      return [block];
    }
    return splitLongRespectingFences(block, 300);
  }

  const byLine = block.split("\n").filter((l) => l.trim());
  if (byLine.length > 1) {
    /* A single newline, not a blank line: a bullet list rejoined with blank lines
       renders as a loose list with extra spacing, which would change how the answer
       looks. This change is only about how many stops there are. */
    return mergeShortChunks(byLine, "\n");
  }

  return splitLongRespectingFences(block, 300);
}
