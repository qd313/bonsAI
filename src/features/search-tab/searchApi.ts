/**
 * Title: Asking the back end for what the Search tab searches
 *
 * Purpose: The calls the Search tab makes: the questions asked in every saved chat (contract C6), the notes
 * the person kept and the switch on each (C3), and the knowledge library's game notes for a word (C7). They go
 * through the same deadline wrapper as every other call and come back as plain lists, with a failed call
 * reading as "nothing found" rather than an error the tab has to handle; a failed save comes back with the
 * back end's own plain words so the tab can show them.
 *
 * Used for: useSearchIndex.ts, useGameNotes.ts and this file's own test.
 *
 * Solves: Keeps the call names and the answer shapes of plan 92's contract in one file.
 *
 * Does not: Search or sort anything; searchModel.ts does that.
 */
import { callDeckyWithTimeout } from "../../utils/deckyCall";
import type { GameNotesResult, SearchChat, UserNote } from "./searchTypes";

type ChatQuestionsRpc = { ok?: boolean; chats?: SearchChat[] };
type NotesRpc = { ok?: boolean; notes?: UserNote[] };
type SaveNoteRpc = { ok?: boolean; note?: UserNote; error?: string };
type GameNotesRpc = { ok?: boolean; installed?: boolean; notes?: GameNotesResult["notes"]; reason?: string };

/** What the person is told when a save fails and the back end gave no words of its own. */
const SAVE_FAILED = "That note could not be saved.";

/** Every saved chat with the questions the person typed in it; [] when the call fails. */
export async function listChatSlotQuestions(): Promise<SearchChat[]> {
  try {
    const res = await callDeckyWithTimeout<[], ChatQuestionsRpc>("list_chat_slot_questions", []);
    return res?.ok === true && Array.isArray(res.chats) ? res.chats : [];
  } catch {
    return [];
  }
}

/* The next three names are added to the back end by lanes N1 and N4 of plan 92; until the generated list of
   method names in this copy holds them, the line before each call keeps the type check quiet. */

/** Every note the person kept, newest first; [] when the call fails. */
export async function listUserNotes(): Promise<UserNote[]> {
  try {
    // @ts-ignore -- "list_user_notes" joins the generated method list when lane N1 lands
    const res = await callDeckyWithTimeout<[], NotesRpc>("list_user_notes", []);
    return res?.ok === true && Array.isArray(res.notes) ? res.notes : [];
  } catch {
    return [];
  }
}

export type SaveNoteResult = { ok: true; note: UserNote } | { ok: false; error: string };

/** Turn a note on or off (contract C3: `{id, on}` edits only what is present). */
export async function saveUserNote(patch: { id: string; on: boolean }): Promise<SaveNoteResult> {
  try {
    // @ts-ignore -- "save_user_note" joins the generated method list when lane N1 lands
    const res = await callDeckyWithTimeout<[{ id: string; on: boolean }], SaveNoteRpc>("save_user_note", [patch]);
    if (res?.ok === true && res.note) return { ok: true, note: res.note };
    return { ok: false, error: typeof res?.error === "string" && res.error ? res.error : SAVE_FAILED };
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }
}

/** The knowledge library's game notes that hold `word` (contract C7); an uninstalled library is a plain empty answer. */
export async function searchRagCorpusNotes(word: string, gameTitle: string): Promise<GameNotesResult> {
  try {
    // @ts-ignore -- "search_rag_corpus_notes" joins the generated method list when lane N4 lands
    const res = await callDeckyWithTimeout<[string, string], GameNotesRpc>("search_rag_corpus_notes", [word, gameTitle]);
    if (res?.ok !== true) return { installed: false, notes: [], reason: "" };
    return {
      installed: res.installed === true,
      notes: Array.isArray(res.notes) ? res.notes : [],
      reason: typeof res.reason === "string" ? res.reason : "",
    };
  } catch {
    return { installed: false, notes: [], reason: "" };
  }
}
