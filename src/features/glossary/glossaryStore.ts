/**
 * Title: The tap-to-define words for the running game, kept for the screen
 *
 * Purpose: A game's jargon (a short peek and a full definition for each word) now lives in the
 * downloaded knowledge library, not in the plugin. This file asks the back end for a game's words
 * once, keeps the answer, and lets the reply renderer read it. `ensureGlossaryLoaded(appId)` starts
 * the one call; `useGlossaryTerms(appId)` reads what has arrived.
 *
 * Used for: MainTabChatTranscript (starts the call when a question appears, before its answer
 * streams in) and MainTabBonsaiAiMarkdownChunk (reads the words to underline); the type is shared
 * with the chip, the matcher and the "Explain further" question.
 *
 * Solves: Keeps the call out of the renderer. The first time a game's words arrive a paragraph
 * changes from a `p` to a `div` and the drawn pieces are rebuilt, and a rebuild closes an opened
 * spoiler cover (workshop:test-evidence/plan76-P76-M-COVER-RECLOSE.json); so the words are asked
 * for when the question appears and the renderer only reads. One call per game: a good answer is
 * kept even when it is empty (a game with no words, or no library), a failure is not kept and is
 * asked again next time. A library installed, updated or removed makes the store ask again for every
 * game it holds; when nothing was on screen to hear it, the kept words are marked old and asked for
 * again the next time a question appears. The old words stay drawn until the new ones arrive.
 *
 * Does not: Find words inside a reply (drgGlossaryTermMatch), draw them (DrgGlossaryTermChip), or
 * decide whether the "Use local knowledge base" switch is on (the back end reads it). It never
 * throws and never shows an error: no words is the answer to every kind of trouble.
 */
import { useSyncExternalStore } from "react";

import { callDeckyWithTimeout } from "../../utils/deckyCall";
import { addKbLibraryListener } from "../knowledge-library/kbLibrarySignal";

export type DrgGlossaryTerm = {
  /** Stable id, also used as the React key / registry key root. */
  id: string;
  /** Canonical display form, matched case-insensitively on a word boundary. */
  term: string;
  /** Extra surface forms matched the same way, in addition to `term` (e.g. plurals, tenses). */
  altForms?: string[];
  /**
   * Shown on focus alone, before any button is pressed — kept to a handful of words on purpose
   * (hand-written, not a truncation of `full`, so it never trails off mid-clause).
   */
  peek: string;
  /** Shown once the term is activated (A / tap). */
  full: string;
  /** The game's name as the library spells it; the "Explain further" question uses it. */
  gameTitle: string;
};

type GlossaryRpcTerm = { id?: string; term?: string; alt_forms?: string[]; peek?: string; full?: string };
type GlossaryRpc = { ok?: boolean; game_title?: string; terms?: GlossaryRpcTerm[] };

const NO_TERMS: readonly DrgGlossaryTerm[] = Object.freeze([]);

const termsByApp = new Map<string, readonly DrgGlossaryTerm[]>();
const askedNow = new Set<string>();
/** Games whose kept words may be out of date: nothing on screen was listening for a library change. */
const maybeOld = new Set<string>();
const subscribers = new Set<() => void>();
let stopListeningToLibrary: (() => void) | null = null;
/** Bumped when the store empties, so an answer that was in flight at the time is thrown away. */
let generation = 0;

function appKey(appId?: string | null): string {
  return (appId ?? "").trim();
}

function notify(): void {
  subscribers.forEach((fn) => fn());
}

function emptyStore(): void {
  generation += 1;
  termsByApp.clear();
  askedNow.clear();
  maybeOld.clear();
  notify();
}

/** The library changed while words are on screen: ask again for every game held, keeping the old words drawn until the answers land. */
function refreshAll(): void {
  generation += 1;
  askedNow.clear();
  const held = [...termsByApp.keys()];
  held.forEach((key) => maybeOld.add(key));
  held.forEach((key) => ensureGlossaryLoaded(key));
}

function toTerms(res: GlossaryRpc): DrgGlossaryTerm[] {
  const gameTitle = typeof res.game_title === "string" ? res.game_title : "";
  const out: DrgGlossaryTerm[] = [];
  for (const raw of Array.isArray(res.terms) ? res.terms : []) {
    if (typeof raw?.term !== "string" || !raw.term.trim()) continue;
    if (typeof raw.peek !== "string" || typeof raw.full !== "string") continue;
    out.push({
      id: typeof raw.id === "string" && raw.id ? raw.id : raw.term,
      term: raw.term,
      altForms: Array.isArray(raw.alt_forms) ? raw.alt_forms.filter((a) => typeof a === "string") : [],
      peek: raw.peek,
      full: raw.full,
      gameTitle,
    });
  }
  return out;
}

function sameTerms(a: readonly DrgGlossaryTerm[], b: readonly DrgGlossaryTerm[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Start the one call for this game's words, unless they are already here (and fresh) or on their way. */
export function ensureGlossaryLoaded(appId?: string | null): void {
  const key = appKey(appId);
  if (!key || askedNow.has(key) || (termsByApp.has(key) && !maybeOld.has(key))) return;
  askedNow.add(key);
  const startedIn = generation;
  void callDeckyWithTimeout<[string], GlossaryRpc>("get_rag_corpus_glossary", [key])
    .then((res) => {
      if (startedIn !== generation) return;
      askedNow.delete(key);
      // A failed answer is not kept: the next ensure asks again.
      if (!res || res.ok !== true) return;
      maybeOld.delete(key);
      const fresh = toTerms(res);
      const kept = termsByApp.get(key);
      if (kept && sameTerms(kept, fresh)) return;
      termsByApp.set(key, fresh);
      notify();
    })
    .catch(() => {
      if (startedIn === generation) askedNow.delete(key);
    });
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  // Listen to the library only while something on screen reads the words: the library signal hands
  // an announcement nobody heard to the first listener, which the Ollama tab's section must get.
  if (!stopListeningToLibrary) stopListeningToLibrary = addKbLibraryListener(() => refreshAll());
  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0 && stopListeningToLibrary) {
      stopListeningToLibrary();
      stopListeningToLibrary = null;
      // A library change from here on goes unheard by this store.
      termsByApp.forEach((_terms, key) => maybeOld.add(key));
    }
  };
}

/** The words that have arrived for this game; the same list object until they change. */
export function useGlossaryTerms(appId?: string | null): readonly DrgGlossaryTerm[] {
  const key = appKey(appId);
  return useSyncExternalStore(subscribe, () => (key ? termsByApp.get(key) ?? NO_TERMS : NO_TERMS));
}

/** Test seam: forget everything, and stop listening. */
export function resetGlossaryStore(): void {
  emptyStore();
  stopListeningToLibrary?.();
  stopListeningToLibrary = null;
}

/** Test seam: put a game's words straight in, as if the call had answered. */
export function setGlossaryTermsForTests(appId: string, terms: readonly DrgGlossaryTerm[]): void {
  termsByApp.set(appKey(appId), terms);
  maybeOld.delete(appKey(appId));
  notify();
}
