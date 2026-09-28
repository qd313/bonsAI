/**
 * Title: The answer's first words, cut to fit Steam's two notification lines
 * Purpose: Turn a finished answer into the two lines the reply-ready notification shows: the
 *   start of the answer on the title line, the answer carrying on across the body line. Every fenced
 *   block (hidden spoiler, branch menu, checklist, citation, code) is left out first, internal tags
 *   are removed, and markdown is flattened to plain words.
 * Used for: bonsaiReplyReadyToast.
 * Solves: The notification said only "Reply ready"; a short answer can now be read without
 *   leaving the game, and a hidden spoiler is never put on screen over the game.
 * Does not: Know the Ask mode, read settings, or decide whether to notify. Returns null when no
 *   safe text is left, and the caller then shows the plain notification.
 * Gotchas:
 *   - Steam draws each line on one row and cuts it with its own ellipsis. Measured on the Deck and
 *     on a monitor (plan 38 § 3, same on both): the title line held `T01-T02-…-T11` (43 characters)
 *     and the body line `w01 w02 … w09` (35 characters). The font is proportional, so the budgets
 *     below are widths worked out from those two strings, not letter counts, with 10 percent to spare.
 *   - Lines break at a space, so Steam's cut never lands in the middle of a word. The one exception
 *     is a single word wider than a whole line (a web address); it is cut and marked with an ellipsis.
 *   - Fences are found line by line with the panel's own markdown reader, not by pairing backtick
 *     runs anywhere, so the notification never shows a word the panel keeps inside a block.
 *   - Anything doubtful is left out, never shown: an unclosed fence drops everything after it, and
 *     a leftover fence marker inside a sentence drops its words too.
 */
import ReactMarkdown, { type Options } from "react-markdown";
import { replaceMarkdownTables } from "./answerReadableText";
import { expandOneLineSpoilerFences } from "./expandOneLineSpoilerFences";
import { stripAssistantDisplayTags } from "./stripAssistantDisplayTags";

export type ToastAnswerLines = { title: string; body: string };

/** Body line when the whole answer already fits on the title line. */
export const TOAST_TAP_HINT = "Tap to open";

const ELLIPSIS = "…";

/** Rough width of one character, in units where a digit is 1. */
function charWidth(ch: string): number {
  if (/[0-9]/.test(ch)) return 1;
  if (/[mwMW@%]/.test(ch)) return ch === "m" || ch === "w" ? 1.45 : 1.75;
  if (/[A-Z]/.test(ch)) return 1.2;
  if (/[ijlIt.,;:'!|]/.test(ch)) return 0.5;
  if (/[fr\-()\[\]"]/.test(ch)) return 0.65;
  if (ch === " ") return 0.5;
  return 1;
}

function textWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch);
  return w;
}

function countingString(prefix: string, sep: string, count: number): string {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`).join(sep);
}

const SAFETY = 0.9;
/** What the title line held on the Deck: T01-T02-...-T11. */
export const TITLE_LINE_BUDGET = textWidth(countingString("T", "-", 11)) * SAFETY;
/** What the body line held on the Deck: w01 w02 ... w09. */
export const BODY_LINE_BUDGET = textWidth(countingString("w", " ", 9)) * SAFETY;

/** The little of a markdown tree this file reads (the reader's own types are not a direct
 *  dependency here). Offsets are into the text that was parsed. */
type MdNode = {
  type: string;
  value?: string;
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
function parseLikeThePanel(text: string): MdNode {
  let tree: MdNode = { type: "root", children: [] };
  const keepTree = () => (parsed: MdNode) => {
    tree = parsed;
    return { type: "root", children: [] };
  };
  ReactMarkdown({ children: text, remarkPlugins: [keepTree] as unknown as Options["remarkPlugins"] });
  return tree;
}

/**
 * True when a fenced block never closes. The panel then draws the rest of its container as code;
 * here everything after it is left out, the safe direction. An indented code block is not fenced.
 * A block the reader gave no position for counts as unclosed.
 */
function isUnclosedFence(node: MdNode, source: string): boolean {
  const from = node.position?.start.offset;
  const to = node.position?.end.offset;
  if (from == null || to == null) return true;
  const lines = source.slice(from, to).split("\n");
  const opener = /^(`{3,}|~{3,})/.exec(lines[0]!);
  if (!opener) return false;
  if (lines.length < 2) return true;
  // The closing line, with any quote marks and indent in front of it taken off.
  const last = lines[lines.length - 1]!.replace(/^[\s>]*/, "").trimEnd();
  const run = opener[1]!;
  return !(last.length >= run.length && /^(`+|~+)$/.test(last) && last[0] === run[0]);
}

/** Blocks that never reach the notification: every fence and indented code, raw HTML, rules. */
const DROPPED_BLOCKS = new Set(["code", "html", "thematicBreak", "definition"]);

/** The plain words of one paragraph or heading. */
function inlineText(node: MdNode): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value ?? "";
    case "image":
      return node.alt ?? "";
    case "break":
    case "html":
      return " ";
    default:
      return (node.children ?? []).map(inlineText).join("");
  }
}

/** Walk the blocks in order, keeping each paragraph's and heading's words. */
function collectBlocks(node: MdNode, source: string, out: string[], state: { stopped: boolean }): void {
  for (const child of node.children ?? []) {
    if (state.stopped) return;
    if (child.type === "code" && isUnclosedFence(child, source)) {
      state.stopped = true;
      return;
    }
    if (DROPPED_BLOCKS.has(child.type)) continue;
    if (child.type === "paragraph" || child.type === "heading") {
      out.push(inlineText(child));
      continue;
    }
    collectBlocks(child, source, out, state);
  }
}

/** Plain words left after dropping fences and tags, or "" when nothing safe remains. */
export function toastSafeText(raw: string): string {
  // The same first steps the panel takes: tags out, a one-line hidden block given its own lines.
  let source = expandOneLineSpoilerFences(stripAssistantDisplayTags(raw || ""));
  source = replaceMarkdownTables(source, "")
    .split("\n")
    .filter((line) => !/^\s*\|/.test(line))
    .join("\n");

  const blocks: string[] = [];
  collectBlocks(parseLikeThePanel(source), source, blocks, { stopped: false });
  let text = blocks.join("\n");

  // Stricter than the panel, never looser: a fence marker left inside a sentence (a one-line
  // ~~~ block, a glued opener) still takes its words, and one with no partner takes the rest.
  text = text.replace(/`{3,}[\s\S]*?`{3,}|~{3,}[\s\S]*?~{3,}/g, " ");
  const stray = text.search(/`{3,}|~{3,}/);
  if (stray >= 0) text = text.slice(0, stray);
  text = text.replace(/~~([^~\n]+)~~/g, "$1").replace(/`/g, "");

  text = text.replace(/\s+/g, " ").trim();
  // Only marks left ("...", "**", "#"): nothing worth showing.
  return /[\p{L}\p{N}]/u.test(text) ? text : "";
}

/** Fit words into one line. Returns the line and the words not used. */
function fillLine(
  words: string[],
  budget: number,
): { line: string; rest: string[]; hardCut: boolean } {
  const used: string[] = [];
  let width = 0;
  let i = 0;
  for (; i < words.length; i++) {
    const add = textWidth(words[i]!) + (used.length ? charWidth(" ") : 0);
    if (width + add > budget) break;
    used.push(words[i]!);
    width += add;
  }
  if (used.length > 0) return { line: used.join(" "), rest: words.slice(i), hardCut: false };
  // One word wider than the whole line: cut it, mark it, drop its tail.
  let cut = "";
  for (const ch of words[0]!) {
    if (textWidth(cut + ch + ELLIPSIS) > budget) break;
    cut += ch;
  }
  return { line: cut + ELLIPSIS, rest: words.slice(1), hardCut: true };
}

/**
 * The two notification lines for a finished answer, or null when there is nothing safe to show.
 * The title carries the first words, the body carries on; a short answer that fits the title line
 * gets the "Tap to open" hint underneath, and a long one ends its body with an ellipsis.
 */
export function buildToastAnswerLines(raw: string): ToastAnswerLines | null {
  const words = toastSafeText(raw).split(" ").filter(Boolean);
  if (words.length === 0) return null;

  const first = fillLine(words, TITLE_LINE_BUDGET);
  if (first.rest.length === 0) {
    return { title: first.line, body: TOAST_TAP_HINT };
  }

  // Body: keep room for the ellipsis in case the answer does not end on this line.
  const wholeRest = fillLine(first.rest, BODY_LINE_BUDGET);
  if (wholeRest.rest.length === 0 && !wholeRest.hardCut) {
    return { title: first.line, body: wholeRest.line };
  }
  const room = BODY_LINE_BUDGET - textWidth(ELLIPSIS);
  const cut = fillLine(first.rest, room);
  if (cut.hardCut) return { title: first.line, body: cut.line };
  return { title: first.line, body: cut.line + ELLIPSIS };
}
