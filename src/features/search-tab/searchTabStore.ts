/**
 * Title: What the Search tab remembers between rebuilds
 *
 * Purpose: Holds the word typed or picked, the game picked, the game note open and which match opened it,
 * outside the tab's own state. Opening a Steam popup or switching tabs throws the tab's screen away and
 * builds it again (lessons-learned.md, § 3: a come-back-here flag kept inside a component does not survive a
 * Decky popup), and a person who pressed A on a setting, or closed the panel, would find their word gone.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: The tab comes back as it was left: the same word, the same game, the same match under the ring.
 *
 * Does not: Persist anything to disk; it lives as long as the plugin does.
 */
import type { GameNote } from "./searchTypes";

export type SearchSaved = {
  /** What is in the find box. */
  typed: string;
  /** The picked game, or null for All. */
  game: string | null;
  /** The game note being read, or null. */
  openNote: GameNote | null;
  /** The key of the match that opened it, so closing it puts the ring back there. */
  returnKey: string | null;
};

const EMPTY: SearchSaved = { typed: "", game: null, openNote: null, returnKey: null };
let saved: SearchSaved = { ...EMPTY };

export function readSearchSaved(): SearchSaved {
  return saved;
}

export function writeSearchSaved(patch: Partial<SearchSaved>): void {
  saved = { ...saved, ...patch };
}

/** Back to a fresh tab; for the tests, and for Clear all plugin data should it ever need it. */
export function resetSearchSaved(): void {
  saved = { ...EMPTY };
}
