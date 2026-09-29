/**
 * Title: Reading fenced blocks the way the panel draws them
 * Purpose: One place that says what a fenced block is, so the pieces of the plugin that must agree
 *   with the screen about where a hidden (spoiler) block starts and stops all read it the same way.
 *   Two readers live here: a whole-text reader built on the markdown reader the panel draws
 *   answers with, and a line-by-line scanner for text that is still arriving or being cut up.
 * Used for: answerCopyText and answerReadableText (Copy and Read aloud replace hidden blocks),
 *   toastAnswerPreview (the reply-ready notification drops every fenced block),
 *   splitResponseIntoChunks (never cut a block in the middle) and streamMarkdownPrepare (a
 *   half-written block waits behind a chip).
 * Solves: Copy and Read aloud paired backtick runs anywhere and knew nothing of `~~~` fences, so a
 *   `~~~` hidden block, or one whose closing marker was glued onto the end of a sentence, could be
 *   copied or read aloud; the splitter and the live parser knew only three backticks, so a `~~~`
 *   block with a blank line inside was cut in two and half of it drawn as plain text.
 * Does not: Decide whether a hidden block is shown (that is the unwrap step, run first), and does
 *   not draw anything.
 * Gotchas:
 *   - The panel follows the markdown standard: a fence opens with three or more backticks or
 *     tildes, and closes only on a line of its own holding the same mark, at least as long as the
 *     opener, with nothing else on it. A closing mark glued to a sentence closes nothing, and the
 *     block then runs to the end of the text, hidden. The line scanner follows the same rule.
 *   - The line scanner is deliberately quicker to see an opener than the standard (any text after
 *     three backticks, any indent): it can only hold text back or keep a block whole, never show
 *     a block's words.
 */
import ReactMarkdown, { type Options } from "react-markdown";

/** The little of a markdown tree this file reads (the reader's own types are not a direct
 *  dependency here). Offsets are into the text that was parsed. */
export type MdNode = {
  type: string;
  value?: string;
  lang?: string | null;
  alt?: string | null;
  children?: MdNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};

/**
 * Read the text with the markdown reader the panel draws answers with (react-markdown, with no
 * extra reading plugins, as MainTabBonsaiAiMarkdownChunk uses it), so a line is inside a fence
 * here exactly when the panel draws it inside one: ``` or ~~~ fences, four-backtick fences, a
 * closer glued onto a sentence that does not close anything. The step below keeps the parsed
 * tree and hands the renderer an empty one, so nothing is drawn.
 */
export function parseLikeThePanel(text: string): MdNode {
  let tree: MdNode = { type: "root", children: [] };
  const keepTree = () => (parsed: MdNode) => {
    tree = parsed;
    return { type: "root", children: [] };
  };
  ReactMarkdown({ children: text, remarkPlugins: [keepTree] as unknown as Options["remarkPlugins"] });
  return tree;
}

/** A hidden block the panel draws: where it is in the text, and the words inside it. */
type SpoilerSpan = { from: number; to: number; body: string };

function collectSpoilerSpans(node: MdNode, out: SpoilerSpan[]): void {
  for (const child of node.children ?? []) {
    const from = child.position?.start.offset;
    const to = child.position?.end.offset;
    if (
      child.type === "code" &&
      typeof child.lang === "string" &&
      child.lang.toLowerCase() === "bonsai-spoiler" &&
      from != null &&
      to != null
    ) {
      out.push({ from, to, body: child.value ?? "" });
      continue;
    }
    collectSpoilerSpans(child, out);
  }
}

/** The old finder: a backtick fence labelled bonsai-spoiler, up to the next run of three. Kept
 *  only as a safety net for what the reading below leaves behind. */
const LEFTOVER_SPOILER_FENCE_RE = /```bonsai-spoiler\s*\n([\s\S]*?)```/gi;

/**
 * Replace every hidden block the panel would draw with `hiddenText`, or, when `hiddenText` is
 * null (spoiler hiding is off, so the panel draws the words inline), with the words themselves.
 *
 * The blocks are found with the panel's own markdown reader, so a `~~~` block, a longer fence, a
 * block with a blank line inside, and a block whose closing mark is glued onto a sentence (it then
 * runs to the end, hidden) are all found exactly as the screen finds them. Anything still marked
 * as a hidden block afterwards (an opening mark glued to running text, which the panel itself
 * draws as ordinary code) is then caught by the older, stricter pairing, so this is never looser
 * than what it replaced.
 */
export function replaceSpoilerFences(text: string, hiddenText: string | null): string {
  let out = text;
  if (/bonsai-spoiler/i.test(text)) {
    const spans: SpoilerSpan[] = [];
    try {
      collectSpoilerSpans(parseLikeThePanel(text), spans);
    } catch {
      spans.length = 0;
    }
    if (spans.length > 0) {
      let result = "";
      let at = 0;
      for (const span of spans) {
        if (span.from < at) continue;
        result += text.slice(at, span.from) + (hiddenText ?? span.body.replace(/\n$/, ""));
        at = span.to;
      }
      out = result + text.slice(at);
    }
  }
  return out.replace(LEFTOVER_SPOILER_FENCE_RE, (_full, body: string) =>
    hiddenText ?? String(body).replace(/\n$/, "")
  );
}

/** True when the text holds a fence marker: three backticks anywhere, or a line starting with
 *  three tildes. The quick test for "may this text hold a block". */
export function mayHoldFence(text: string): boolean {
  return text.includes("```") || /^\s*~~~/m.test(text);
}


/** A fence that is open: the mark it opened with and how many of them. */
export type OpenFence = { mark: "`" | "~"; length: number };

const OPENER_RE = /^\s*(`{3,}|~{3,})([^\n]*)$/;

/** What a line does to the fence state. `info` is the text after the opening marks. */
export type FenceStep =
  | { kind: "open"; open: OpenFence; info: string }
  | { kind: "close"; open: null }
  | { kind: "none"; open: OpenFence | null };

/**
 * One line's effect on a fence, given the fence open before it (null for none). Outside a fence,
 * a line starting with three or more backticks or tildes opens one. Inside, only a line holding
 * nothing but the same mark, at least as long as the opener, closes it; every other line, another
 * kind of fence marker included, is the block's own text.
 */
export function stepFence(line: string, open: OpenFence | null): FenceStep {
  if (!open) {
    const m = OPENER_RE.exec(line);
    if (!m) return { kind: "none", open: null };
    const run = m[1]!;
    return { kind: "open", open: { mark: run[0] as "`" | "~", length: run.length }, info: m[2]!.trim() };
  }
  // Quote marks and indent in front of a closer are taken off, as the panel's reader does.
  const t = line.replace(/^[\s>]*/, "").trimEnd();
  if (t.length >= open.length && t.split(open.mark).join("") === "") {
    return { kind: "close", open: null };
  }
  return { kind: "none", open };
}

/** Whether every fence in the text is closed by its end. */
export function hasBalancedFenceMarkers(text: string): boolean {
  let open: OpenFence | null = null;
  for (const line of text.split("\n")) open = stepFence(line, open).open;
  return open === null;
}
