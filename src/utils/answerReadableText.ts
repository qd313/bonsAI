/**
 * Title: Answer readable text builder
 * Purpose: Turn a stored answer (the plugin's markdown, tags and fences) into plain spoken text.
 * Used for: useReadAloud, building the text handed to start_voice_read_aloud. Shaped so the
 *   plan 38 toast preview can reuse the same step order once it is built (strip tags, resolve
 *   spoiler fences, then flatten markdown) — that helper is not built yet; this file does not
 *   build it.
 * Solves: Reading internal control tags, a hidden spoiler's actual text, table cells, code, or
 *   markdown punctuation out loud instead of the words a person would read on screen.
 * Does not: Split the result into sentences — the background reader (Python) does that. Does not
 *   touch the Strategy branch-menu control; that is stripped along with the other internal tags.
 */
import { stripAssistantDisplayTags } from "./stripAssistantDisplayTags";
import { unwrapAskedEntitySpoilerFences, type UnwrapSpoilerOpts } from "./unwrapAskedEntitySpoilerFences";

const SPOILER_FENCE_RE = /```bonsai-spoiler\s*\n([\s\S]*?)```/gi;
const CODE_FENCE_RE = /```[^\n`]*\n[\s\S]*?```/g;

/** Said out loud in place of a spoiler block the screen keeps masked (D74 call 3). */
export const SPOILER_HIDDEN_SPOKEN_PHRASE = "A spoiler is hidden here.";
/** Said out loud in place of a markdown table. */
export const TABLE_SPOKEN_PHRASE = "There is a table on screen.";
/** Said out loud in place of a fenced code block. */
export const CODE_SPOKEN_PHRASE = "There is code on screen.";

export type BuildAnswerReadableTextArgs = {
  /** Raw turn body, same string passed to buildAnswerBubbleElement / buildAnswerCopyText. */
  body: string;
  /** Whether Settings has spoiler masking on. When off, every fence reads as plain text, the
   *  same rule buildAnswerCopyText follows. */
  spoilerMaskingEnabled?: boolean;
  askQuestion?: string;
  appId?: string | null;
  /** Active game's display name — for a title reachable only by name (plan 54 gap 1). */
  appName?: string | null;
  spoilerConsentEffective?: boolean;
};

function isTableRowLine(line: string): boolean {
  return line.includes("|") && line.trim().length > 0;
}

const TABLE_SEPARATOR_ROW_RE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/;

function isTableSeparatorLine(line: string): boolean {
  return TABLE_SEPARATOR_ROW_RE.test(line);
}

/** Replace each GFM pipe-table block with one spoken phrase. */
function replaceTables(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const next = lines[i + 1];
    if (isTableRowLine(line) && next !== undefined && isTableSeparatorLine(next)) {
      i += 2;
      while (i < lines.length && isTableRowLine(lines[i]!)) {
        i++;
      }
      out.push(TABLE_SPOKEN_PHRASE);
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join("\n");
}

/** Strip a leading heading/bullet/numbered-list marker from one line, keeping its words. */
function flattenLineMarkers(line: string): string {
  let l = line.replace(/^\s{0,3}#{1,6}\s+/, "");
  l = l.replace(/^\s*[-*+]\s+/, "");
  l = l.replace(/^\s*\d+[.)]\s+/, "");
  return l;
}

/** Flatten inline markdown (links, bold, italic, inline code) to plain words. */
function flattenInlineMarkdown(text: string): string {
  let t = text;
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/__([^_]+)__/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])/g, "$1");
  t = t.replace(/`([^`]+)`/g, "$1");
  return t;
}

/**
 * The plain text a Read-aloud press hands to the background speaker: internal tags out, the
 * Strategy branch menu out, spoiler fences resolved exactly as the screen resolves them (unwrapped
 * inline where the render would show them, said as one short phrase where the screen keeps them
 * masked), tables and code each announced with one phrase, and the remaining markdown flattened to
 * the words a person reading the bubble would say. Empty or marker-only text returns "".
 */
export function buildAnswerReadableText(args: BuildAnswerReadableTextArgs): string {
  const {
    body,
    spoilerMaskingEnabled = true,
    askQuestion = "",
    appId = null,
    appName = null,
    spoilerConsentEffective = false,
  } = args;

  let text = stripAssistantDisplayTags(body || "");
  if (!text.trim()) return "";

  const opts: UnwrapSpoilerOpts = { question: askQuestion, appId, appName, spoilerConsentEffective };
  text = unwrapAskedEntitySpoilerFences(text, opts);

  if (!spoilerMaskingEnabled) {
    text = text.replace(SPOILER_FENCE_RE, (_full, fenceBody: string) =>
      String(fenceBody).replace(/\n$/, "")
    );
  } else {
    text = text.replace(SPOILER_FENCE_RE, SPOILER_HIDDEN_SPOKEN_PHRASE);
  }

  text = text.replace(CODE_FENCE_RE, CODE_SPOKEN_PHRASE);
  text = replaceTables(text);

  text = text
    .split("\n")
    .map(flattenLineMarkers)
    .join("\n");
  text = flattenInlineMarkdown(text);

  text = text.replace(/\s+/g, " ").trim();
  return text;
}
