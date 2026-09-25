/**
 * Title: Stream markdown preparer
 * Purpose: Progressive markdown layout for token streaming with closed-block safety and wait chips.
 * Used for: buildAnswerBubbleElement live tail rendering during partial_response polls.
 * Solves: Open spoiler/code fences never leak body mid-stream; burst reveal after fence close.
 * Does not: Split chunks for D-pad navigation — see splitResponseIntoChunks.
 */

export const SPOILER_STREAM_MASK_LABEL = "Spoiler hidden until complete…";
export const FENCE_STREAM_WAIT_LABEL = "Code block incoming…";

type StreamWaitKind = "fence" | "spoiler";

type StreamWaitChip = {
  kind: StreamWaitKind;
  label: string;
};

export type StreamMarkdownPrepareResult = {
  /** Safe frozen prefix segments (complete prose paragraphs / closed fences). */
  closedBlocks: string[];
  /** Live open prose tail (stay-open inline normalized); null when wait chip owns the open region. */
  liveTail: string | null;
  /** The same tail before the inline closers are added -- what the scramble times letter by letter. */
  liveTailRaw: string | null;
  waitChip: StreamWaitChip | null;
};

export type PrepareStreamMarkdownOpts = {
  /** Returns true when an *open* bonsai-spoiler fence should stream as prose, not a mask chip. */
  unwrapOpenSpoilerFence?: (openFenceText: string) => boolean;
};

function isFenceLine(line: string): boolean {
  return line.trimStart().startsWith("```");
}

function isSpoilerFenceOpenLine(line: string): boolean {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("```")) return false;
  const info = trimmed.slice(3).trim().toLowerCase();
  return info === "bonsai-spoiler" || info.startsWith("bonsai-spoiler");
}

/**
 * Stay-open until closer for `**`, `*`, `` ` ``, and `[text](…` (discovery S1/Q5).
 */
export function normalizeIncompleteInline(source: string): string {
  let t = source;
  const doubleStars = (t.match(/\*\*/g) || []).length;
  if (doubleStars % 2 === 1) t += "**";
  const withoutDouble = t.replace(/\*\*/g, "");
  const singleStars = (withoutDouble.match(/\*/g) || []).length;
  if (singleStars % 2 === 1) t += "*";
  const backticks = (t.match(/`/g) || []).length;
  if (backticks % 2 === 1) t += "`";
  const linkOpen = /\[[^\]]*\]\([^)]*$/.test(t);
  if (linkOpen) t += ")";
  return t;
}

/** Whether ``` fence markers are balanced (even number of fence lines). */
export function hasBalancedFences(s: string): boolean {
  let inFence = false;
  for (const line of s.split("\n")) {
    if (isFenceLine(line)) inFence = !inFence;
  }
  return !inFence;
}

/**
 * True when the latest target growth closed a previously open non-spoiler fence.
 * Used by smooth reveal to burst fence body at ~3× prose rate.
 */
export function didNonSpoilerFenceJustClose(prevTarget: string, nextTarget: string): boolean {
  if (nextTarget.length <= prevTarget.length) return false;
  if (!hasBalancedFences(nextTarget)) return false;
  if (hasBalancedFences(prevTarget)) return false;
  const added = nextTarget.slice(prevTarget.length);
  return added.includes("```");
}

function flushProseBuffer(buffer: string[], closedBlocks: string[]): void {
  const joined = buffer.join("\n").trim();
  if (joined) closedBlocks.push(joined);
  buffer.length = 0;
}

/**
 * Partition revealed assistant text for R2 live markdown rendering.
 */
export function prepareStreamMarkdown(
  source: string,
  opts: PrepareStreamMarkdownOpts = {}
): StreamMarkdownPrepareResult {
  const text = source;
  if (!text.trim()) {
    return { closedBlocks: [], liveTail: null, liveTailRaw: null, waitChip: null };
  }

  const lines = text.split("\n");
  const closedBlocks: string[] = [];
  const proseBuffer: string[] = [];

  let i = 0;
  let inFence = false;
  let fenceIsSpoiler = false;
  const fenceLines: string[] = [];

  while (i < lines.length) {
    const line = lines[i]!;

    if (!inFence && isFenceLine(line)) {
      flushProseBuffer(proseBuffer, closedBlocks);
      inFence = true;
      fenceIsSpoiler = isSpoilerFenceOpenLine(line);
      fenceLines.length = 0;
      fenceLines.push(line);
      i++;
      continue;
    }

    if (inFence) {
      fenceLines.push(line);
      if (isFenceLine(line) && fenceLines.length > 1) {
        closedBlocks.push(fenceLines.join("\n"));
        inFence = false;
        fenceLines.length = 0;
      }
      i++;
      continue;
    }

    proseBuffer.push(line);
    i++;
  }

  if (inFence) {
    if (fenceIsSpoiler) {
      const openFenceText = fenceLines.join("\n");
      if (opts.unwrapOpenSpoilerFence?.(openFenceText)) {
        const body = fenceLines.slice(1).join("\n").trim();
        const liveTail = body.length > 0 ? normalizeIncompleteInline(body) : null;
        return { closedBlocks, liveTail, liveTailRaw: liveTail ? body : null, waitChip: null };
      }
      return {
        closedBlocks,
        liveTail: null,
        liveTailRaw: null,
        waitChip: { kind: "spoiler", label: SPOILER_STREAM_MASK_LABEL },
      };
    }
    return {
      closedBlocks,
      liveTail: null,
      liveTailRaw: null,
      waitChip: { kind: "fence", label: FENCE_STREAM_WAIT_LABEL },
    };
  }

  const tailRaw = proseBuffer.join("\n").trim();
  const liveTail = tailRaw.length > 0 ? normalizeIncompleteInline(tailRaw) : null;
  return { closedBlocks, liveTail, liveTailRaw: liveTail ? tailRaw : null, waitChip: null };
}
