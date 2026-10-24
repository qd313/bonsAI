/**
 * Title: Spotting a game's glossary words inside a reply
 *
 * Purpose: A game can have a short list of its own jargon in the knowledge library — words a new
 * player might not know. This file finds every occurrence of one of those words inside an AI reply's
 * text, so the reply can be redrawn with those words turned into tappable chips the player can open
 * for a definition.
 *
 * Used for: the AI reply text renderer (MainTabBonsaiAiMarkdownChunk), which asks this file to split a
 * reply into plain text and matched-term pieces before drawing it, and this file's own tests.
 *
 * Solves: gives whole-word, spelling-case-insensitive matching against a small hand-picked list,
 * without needing any language-understanding library to do it.
 *
 * Does not: know which game it is, or fetch the words — the caller passes the running game's list
 * (from glossaryStore) and only calls the matching functions here when that list has words.
 */
import type { DrgGlossaryTerm } from "./glossaryStore";

export type DrgGlossaryTermMatch = {
  term: DrgGlossaryTerm;
  index: number;
  length: number;
  matchedText: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type BuiltPattern = { pattern: RegExp; lookup: Map<string, DrgGlossaryTerm> };

/** Built once per word list: the list object only changes when the library's words do. */
const builtPatterns = new WeakMap<readonly DrgGlossaryTerm[], BuiltPattern>();

function buildPattern(terms: readonly DrgGlossaryTerm[]): BuiltPattern {
  const cached = builtPatterns.get(terms);
  if (cached) return cached;
  const lookup = new Map<string, DrgGlossaryTerm>();
  const words: string[] = [];
  for (const term of terms) {
    for (const form of [term.term, ...(term.altForms ?? [])]) {
      const key = form.toLowerCase();
      if (lookup.has(key)) continue;
      lookup.set(key, term);
      words.push(escapeRegExp(form));
    }
  }
  // Longest first so "overclocks" is not truncated by an earlier match of "overclock".
  words.sort((a, b) => b.length - a.length);
  const built = { pattern: new RegExp(`\\b(${words.join("|")})\\b`, "gi"), lookup };
  builtPatterns.set(terms, built);
  return built;
}

/** Non-overlapping matches of any of the game's glossary terms inside `text`, in order. */
export function findDrgGlossaryTermMatches(text: string, terms: readonly DrgGlossaryTerm[]): DrgGlossaryTermMatch[] {
  if (!text || terms.length === 0) return [];
  const { pattern, lookup } = buildPattern(terms);
  // The pattern is shared between calls (it is built once per list), so start from the top.
  pattern.lastIndex = 0;
  const matches: DrgGlossaryTermMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const matchedText = m[1];
    const term = lookup.get(matchedText.toLowerCase());
    if (term) {
      matches.push({ term, index: m.index, length: matchedText.length, matchedText });
    }
    // Defensive: a zero-length match would spin `exec` forever. None of the curated forms are
    // empty strings, so this never fires today, but the loop should not hang if one ever is.
    if (matchedText.length === 0) pattern.lastIndex += 1;
  }
  return matches;
}

export type DrgGlossaryTextSegment =
  | { kind: "text"; value: string }
  | { kind: "term"; value: string; term: DrgGlossaryTerm };

/** Split `text` into plain and glossary-term segments, in order, covering the whole string. */
export function splitTextForDrgGlossaryTerms(
  text: string,
  terms: readonly DrgGlossaryTerm[]
): DrgGlossaryTextSegment[] {
  const matches = findDrgGlossaryTermMatches(text, terms);
  if (matches.length === 0) return [{ kind: "text", value: text }];
  const segments: DrgGlossaryTextSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.index > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, match.index) });
    }
    segments.push({ kind: "term", value: match.matchedText, term: match.term });
    cursor = match.index + match.length;
  }
  if (cursor < text.length) {
    segments.push({ kind: "text", value: text.slice(cursor) });
  }
  return segments;
}
