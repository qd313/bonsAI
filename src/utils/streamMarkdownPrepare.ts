/**
 * Title: Stream markdown preparer
 * Purpose: Progressive markdown layout for token streaming with closed-block safety and wait chips.
 * Used for: buildAnswerBubbleElement live tail rendering during partial_response polls.
 * Solves: Open spoiler/code fences never leak body mid-stream; burst reveal after fence close.
 * Does not: Split chunks for D-pad navigation — see splitResponseIntoChunks.
 */

import { hasBalancedFenceMarkers, stepFence, type OpenFence } from "./markdownFenceReader";

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

/*
 * Fences are read the way the panel draws them (markdownFenceReader): ``` or ~~~, and a block ends
 * only on its own closing line holding the same mark, at least as long as the opener. So a blank
 * line inside a ~~~ block, or a ``` line inside a four-backtick one, never ends it.
 */

/** Whether the info text after an opening mark labels a hidden block. */
function isSpoilerInfo(info: string): boolean {
  return info.toLowerCase().startsWith("bonsai-spoiler");
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

/** Whether every fence marker is closed by the end of the text. */
export function hasBalancedFences(s: string): boolean {
  return hasBalancedFenceMarkers(s);
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
  return added.includes("```") || added.includes("~~~");
}

/**
 * Where the letter-by-letter reveal may stop in `target`, given it wants to stop at `cut`.
 *
 * Never half-way through a fence marker line: a half-typed "```bonsa" is read below as an
 * ordinary code fence and draws a "Code block incoming…" chip, so the cut moves to the end of that
 * line. Never inside a ```bonsai-spoiler fence the target has already closed: the cut moves past
 * its closer, so a cover is drawn as a finished cover from the moment it shows -- the back end's
 * live cover moves that closer on every flush as the covered sentence grows (plan 70), and a cut
 * inside it would drop the cover back to "hidden until complete" each time. A spoiler fence still
 * open in the target, and any ordinary code fence's body, are left to their wait chips below.
 */
export function settleRevealCut(target: string, cut: number): number {
  let end = Math.max(0, Math.min(cut, target.length));
  let open: { start: number; spoiler: boolean; fence: OpenFence } | null = null;
  let pos = 0;
  while (pos < target.length && (pos < end || open)) {
    const nl = target.indexOf("\n", pos);
    const next = nl === -1 ? target.length : nl + 1;
    const line = target.slice(pos, nl === -1 ? target.length : nl);
    const step = stepFence(line, open?.fence ?? null);
    if (step.kind !== "none") {
      if (end > pos && end < next) end = next;
      if (step.kind === "open") {
        open = { start: pos, spoiler: isSpoilerInfo(step.info), fence: step.open };
      } else if (open) {
        if (open.spoiler && end > open.start && end < next) end = next;
        open = null;
      }
    }
    pos = next;
  }
  return end;
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
  let openFence: OpenFence | null = null;
  let fenceIsSpoiler = false;
  const fenceLines: string[] = [];

  while (i < lines.length) {
    const line = lines[i]!;

    const step = stepFence(line, openFence);

    if (!openFence && step.kind === "open") {
      flushProseBuffer(proseBuffer, closedBlocks);
      openFence = step.open;
      fenceIsSpoiler = isSpoilerInfo(step.info);
      fenceLines.length = 0;
      fenceLines.push(line);
      i++;
      continue;
    }

    if (openFence) {
      fenceLines.push(line);
      if (step.kind === "close") {
        closedBlocks.push(fenceLines.join("\n"));
        openFence = null;
        fenceLines.length = 0;
      }
      i++;
      continue;
    }

    proseBuffer.push(line);
    i++;
  }

  if (openFence) {
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
