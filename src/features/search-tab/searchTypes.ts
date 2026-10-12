/**
 * Title: The shapes the Search tab reads
 *
 * Purpose: One place for the data shapes the Search tab passes around. Today that is a saved chat with its
 * questions (plan 92's contract C6), copied word for word so the back end and the screen cannot drift
 * without a type noticing; the note and game-note shapes join it with the tab's body.
 *
 * Used for: searchModel.ts, searchApi.ts, useSearchIndex.ts and the tab's components.
 *
 * Solves: Keeps the field names in one file, as the back end writes them (snake_case), so a rename is a
 * one-file change.
 *
 * Does not: Fetch or search anything; see searchApi.ts and searchModel.ts.
 */

/** One question the person typed in a saved chat (contract C6). `created_at` is in seconds. */
export type SearchChatQuestion = {
  turn_id: string;
  text: string;
  created_at: number;
  app_id: string;
  game_title: string;
};

/** A saved chat with the questions asked in it, oldest first (contract C6). */
export type SearchChat = {
  slot_id: string;
  label: string;
  updated_at: number;
  questions: SearchChatQuestion[];
};
