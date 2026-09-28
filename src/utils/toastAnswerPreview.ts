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
 *   - Anything doubtful is left out, never shown: an unclosed fence drops everything after it.
 */
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

/** Plain words left after dropping fences and tags, or "" when nothing safe remains. */
export function toastSafeText(raw: string): string {
  let text = stripAssistantDisplayTags(raw || "");
  // Whole fenced blocks, one-line or many, whatever their label.
  text = text.replace(/```[\s\S]*?```/g, "\n\n");
  // An unclosed fence: drop it and everything after it.
  const open = text.indexOf("```");
  if (open >= 0) text = text.slice(0, open);
  text = text
    .split("\n")
    .filter((line) => !(line.includes("|") && /^\s*\|/.test(line)))
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^\s*>+\s?/, "")
        .replace(/^\s*[-*+]\s+/, "")
        .replace(/^\s*\d+[.)]\s+/, ""),
    )
    .join("\n");
  text = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<\/?[a-z][^>]*>/gi, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[`*#]/g, "");
  return text.replace(/\s+/g, " ").trim();
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
