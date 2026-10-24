/**
 * Title: The shapes the Search tab reads
 *
 * Purpose: One place for the data shapes the Search tab passes around: a saved chat with its questions
 * (plan 92's contract C6), a note the person kept (C1), a game note from the knowledge library (C7), and
 * the rows the tab draws from them. They are copied from the contract word for word, so the back end and
 * the screen cannot drift without a type noticing.
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

/** A note the person kept for Ask to read (contract C1). */
export type UserNote = {
  id: string;
  text: string;
  /** "" with an empty `game_title` means every game. */
  app_id: string;
  game_title: string;
  on: boolean;
  created_at: string;
  source_turn_id: string;
};

/** A note from the knowledge library (contract C7). */
export type GameNote = {
  name: string;
  kind: string;
  game_title: string;
  snippet: string;
  /** The note's own words, up to 4,000 characters; shown when the person presses A. */
  text: string;
  /** True when the word is in the note's name. A note where it is not may be a spoiler. */
  name_matches: boolean;
};

/** The answer of the game-notes search (contract C7). */
export type GameNotesResult = {
  installed: boolean;
  notes: GameNote[];
  reason: string;
};

/** A question with the chat it came from, flattened for searching. */
export type SearchQuestion = {
  turnId: string;
  slotId: string;
  chatLabel: string;
  text: string;
  createdAt: number;
  appId: string;
  gameTitle: string;
};

/** A word button: the word and how many questions hold it. */
export type SearchWord = { word: string; count: number };

/** A Steam settings match, split the way the old card drew it. */
export type SettingMatch = {
  path: string;
  title: string;
  breadcrumb: string;
  qam: boolean;
};

/** How a game note is drawn before the person opens it (contract C7, "Spoilers"). */
export type GameNoteLabel = {
  title: string;
  /** "" while the note is hidden. */
  snippet: string;
  /** True when the title is the neutral one and the snippet is withheld. */
  hidden: boolean;
};
