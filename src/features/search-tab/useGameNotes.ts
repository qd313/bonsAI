/**
 * Title: The game notes for the picked word
 *
 * Purpose: Asks the knowledge library for the notes that hold the picked word (contract C7), narrowed by the
 * game row, and keeps only the newest answer: a word typed letter by letter makes a call after a short
 * pause, and an answer that arrives after the word has changed is thrown away. No word, or a word under two
 * letters, asks nothing.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Keeps the timing and the stale-answer rule out of the drawing code.
 *
 * Does not: Decide how a note is titled before it is opened (searchModel.ts, the spoiler rule).
 */
import { useEffect, useState } from "react";

import { searchRagCorpusNotes } from "./searchApi";
import type { GameNotesResult } from "./searchTypes";

/** The pause after the last keystroke before the library is asked, in ms. */
const TYPING_PAUSE_MS = 250;

/** The answer for `word` and `game` (null game is All), or null while none has come back. */
export function useGameNotes(word: string, game: string | null): GameNotesResult | null {
  const [answer, setAnswer] = useState<{ key: string; result: GameNotesResult } | null>(null);
  const key = `${word}\u0000${game ?? ""}`;

  useEffect(() => {
    if (word.length < 2) return;
    let current = true;
    const timer = window.setTimeout(() => {
      void searchRagCorpusNotes(word, game ?? "").then((result) => {
        if (current) setAnswer({ key, result });
      });
    }, TYPING_PAUSE_MS);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [word, game, key]);

  return word.length >= 2 && answer?.key === key ? answer.result : null;
}
