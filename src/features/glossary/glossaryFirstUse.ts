/**
 * Title: Only the first mention of a glossary word is underlined
 *
 * Purpose: In one AI answer, a game word the library can define (a "glossary word") is drawn as a
 * tappable chip only where it first appears, in reading order. Every later mention, in any spelling
 * of the same word (charm, charms, Charms), stays plain text. The maintainer saw one Hollow Knight
 * answer with eleven underlines and asked for the first mention only.
 *
 * Used for: MainTabBonsaiAiMarkdownChunk (draws each piece of an answer), and its tests.
 *
 * Solves: Decides "which mention is first" from the text itself, never from the order React happens
 * to draw things in, so the same text always gives the same chips.
 *
 * Does not: Find words in text (glossaryTermMatch.ts does), draw a chip (GlossaryTermChip.tsx), or
 * split an answer into pieces. Does not count a word inside a spoiler block: that block is parsed on
 * its own and starts with nothing used, because a block that is still covered shows no chips, and a
 * word the player cannot see must not use up the first mention for the visible text around it.
 *
 * How it works:
 * 1. The answer is drawn in separate pieces (sections, streaming pieces), each its own markdown
 *    parse. The caller hands each piece the text of the pieces before it (`before`), joined by
 *    GLOSSARY_BEFORE_SEPARATOR into ONE string, so a memoised piece still compares by value.
 * 2. usedGlossaryIds() reads those earlier pieces one at a time with the same markdown parser and
 *    the same rule below, and returns the set of words they already underlined.
 * 3. rehypeGlossaryFirstUse() is a step inside that parse. It walks the parsed tree in reading
 *    order, and in the places a chip is allowed (text straight inside a paragraph or list item, or
 *    one level into bold or italic there; never links, inline code, headings or fenced blocks) it
 *    replaces the first mention of each unused word with a span the chunk draws as a chip. A word
 *    the earlier pieces used, or one used earlier in this piece, is left as plain text.
 * Why a tree step and not a counter in the draw code: the drawing order of React components is not
 * a promise, and the memoised pieces draw (or skip drawing) independently. The text is the only
 * thing that is the same every time.
 *
 * Gotchas:
 * - While an answer streams, text only grows at the end, so the first mention stays first; the only
 *   move is a half-written word at the very end that turns out to be a different word.
 */
import ReactMarkdown from "react-markdown";

import type { DrgGlossaryTerm } from "./glossaryStore";
import { splitTextForDrgGlossaryTerms } from "./glossaryTermMatch";

/** Joins the earlier pieces' text into one string; a character no answer carries. */
const GLOSSARY_BEFORE_SEPARATOR = "\u0001";

/** The class on the span that stands for a chip until the chunk draws it. */
export const GLOSSARY_HIT_CLASS = "bonsai-glossary-hit";

/** The span property (drawn as data-glossary-id) carrying the word's id. */
const GLOSSARY_HIT_ID_PROP = "dataGlossaryId";

/** The little of a parsed-markdown node this file reads and writes. */
type Node = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const CONTAINERS = new Set(["p", "li"]);
const INLINE_WRAPPERS = new Set(["strong", "em"]);

/** Text split around its not-yet-used glossary words; each such word is marked and added to `used`. */
function splitFresh(text: string, terms: readonly DrgGlossaryTerm[], used: Set<string>): Node[] {
  const out: Node[] = [];
  for (const seg of splitTextForDrgGlossaryTerms(text, terms)) {
    if (seg.kind === "term" && !used.has(seg.term.id)) {
      used.add(seg.term.id);
      out.push({
        type: "element",
        tagName: "span",
        properties: { className: [GLOSSARY_HIT_CLASS], [GLOSSARY_HIT_ID_PROP]: seg.term.id },
        children: [{ type: "text", value: seg.value }],
      });
    } else {
      out.push({ type: "text", value: seg.value });
    }
  }
  return out;
}

/**
 * Mark the first mentions inside one paragraph or list item's children, in order. Bold and italic
 * directly in it are read for their own text; any other element is searched for paragraphs and list
 * items of its own (a nested list), and its text is left alone.
 */
function markContainer(node: Node, terms: readonly DrgGlossaryTerm[], used: Set<string>): void {
  const next: Node[] = [];
  for (const child of node.children ?? []) {
    if (child.type === "text" && child.value) {
      next.push(...splitFresh(child.value, terms, used));
    } else if (child.type === "element" && INLINE_WRAPPERS.has(child.tagName ?? "")) {
      child.children = (child.children ?? []).flatMap((inner) =>
        inner.type === "text" && inner.value ? splitFresh(inner.value, terms, used) : [inner]
      );
      next.push(child);
    } else {
      walk(child, terms, used);
      next.push(child);
    }
  }
  node.children = next;
}

/** Visit every node in reading order; paragraphs and list items are where chips may be made. */
function walk(node: Node, terms: readonly DrgGlossaryTerm[], used: Set<string>): void {
  if (node.type === "element" && CONTAINERS.has(node.tagName ?? "")) {
    markContainer(node, terms, used);
    return;
  }
  for (const child of node.children ?? []) walk(child, terms, used);
}

/**
 * The markdown-parse step. `alreadyUsed` is the words earlier pieces used; `onDone` (if given) gets
 * the words used after this piece. The set is copied on every run, so parsing the same text twice
 * gives the same answer.
 */
export function rehypeGlossaryFirstUse(
  terms: readonly DrgGlossaryTerm[],
  alreadyUsed: ReadonlySet<string>,
  onDone?: (used: ReadonlySet<string>) => void
) {
  return () => (tree: Node) => {
    const used = new Set(alreadyUsed);
    if (terms.length > 0) walk(tree, terms, used);
    onDone?.(used);
  };
}

/**
 * The words the pieces in `before` (see GLOSSARY_BEFORE_SEPARATOR) already underlined. Each piece is
 * parsed with react-markdown's own parser and the same step as the drawn piece, so the two cannot
 * disagree about what counts. Nothing is drawn: the markdown component is only called as a function
 * for the parse, and its picture is thrown away.
 */
export function usedGlossaryIds(before: string, terms: readonly DrgGlossaryTerm[]): ReadonlySet<string> {
  let used: ReadonlySet<string> = new Set();
  if (!before || terms.length === 0) return used;
  for (const piece of before.split(GLOSSARY_BEFORE_SEPARATOR)) {
    if (!piece) continue;
    ReactMarkdown({
      children: piece,
      rehypePlugins: [rehypeGlossaryFirstUse(terms, used, (after) => (used = after))],
    });
  }
  return used;
}

/** `earlier` pieces' text then `piece`, joined for the next piece's `before`. */
export function appendGlossaryBefore(earlier: string | undefined, piece: string): string {
  return earlier ? `${earlier}${GLOSSARY_BEFORE_SEPARATOR}${piece}` : piece;
}
