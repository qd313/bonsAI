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
 * Keep responses readable in Decky by splitting dense output into panel-sized chunks.
 * Code fences (```) are never split across chunks: paragraph/density splits are skipped
 * when they would break inside a block.
 */
export function splitResponseIntoChunks(text: string): string[] {
  const t = text.trim();
  if (!t) {
    return [];
  }

  const byParagraph = splitByParagraphsRespectingFences(t);
  if (byParagraph.length > 1) {
    return byParagraph;
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
    return byLine;
  }

  return splitLongRespectingFences(block, 300);
}
