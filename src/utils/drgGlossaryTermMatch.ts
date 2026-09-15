/**
 * Title: Spotting DRG Survivor game terms inside a reply
 *
 * Purpose: For the game DRG Survivor, this plugin keeps a short hand-picked list of the game's own
 * jargon — words a new player might not know. This file finds every occurrence of one of those words
 * inside an AI reply's text, so the reply can be redrawn with those words turned into tappable chips
 * the player can open for a definition. It also has a small helper that recognizes DRG Survivor by
 * its Steam ID.
 *
 * Used for: the AI reply text renderer (MainTabBonsaiAiMarkdownChunk), which asks this file to split a
 * reply into plain text and matched-term pieces before drawing it, and this file's own tests.
 *
 * Solves: gives whole-word, spelling-case-insensitive matching against a small hand-picked list,
 * without needing any language-understanding library to do it.
 *
 * Does not: decide whether the current game is DRG Survivor in the first place — the caller checks
 * the running game's Steam ID first (using this file's own `isDrgSurvivorAppId`) and only calls the
 * matching functions here once that check has already passed.
 */
import { DRG_SURVIVOR_GLOSSARY_TERMS, DRG_SURVIVOR_APP_ID, type DrgGlossaryTerm } from "../data/drgGlossaryTerms";

/** True when `appId` is the running/attached game for a turn is DRG Survivor. */
export function isDrgSurvivorAppId(appId?: string | null): boolean {
  return (appId ?? "").trim() === DRG_SURVIVOR_APP_ID;
}

export type DrgGlossaryTermMatch = {
  term: DrgGlossaryTerm;
  index: number;
  length: number;
  matchedText: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPattern(): { pattern: RegExp; lookup: Map<string, DrgGlossaryTerm> } {
  const lookup = new Map<string, DrgGlossaryTerm>();
  const words: string[] = [];
  for (const term of DRG_SURVIVOR_GLOSSARY_TERMS) {
    for (const form of [term.term, ...(term.altForms ?? [])]) {
      const key = form.toLowerCase();
      if (lookup.has(key)) continue;
      lookup.set(key, term);
      words.push(escapeRegExp(form));
    }
  }
  // Longest first so "overclocks" is not truncated by an earlier match of "overclock".
  words.sort((a, b) => b.length - a.length);
  return { pattern: new RegExp(`\\b(${words.join("|")})\\b`, "gi"), lookup };
}

/** Non-overlapping matches of any curated DRG Survivor glossary term inside `text`, in order. */
export function findDrgGlossaryTermMatches(text: string): DrgGlossaryTermMatch[] {
  if (!text || DRG_SURVIVOR_GLOSSARY_TERMS.length === 0) return [];
  const { pattern, lookup } = buildPattern();
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
export function splitTextForDrgGlossaryTerms(text: string): DrgGlossaryTextSegment[] {
  const matches = findDrgGlossaryTermMatches(text);
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
