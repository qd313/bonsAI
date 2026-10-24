/**
 * Title: Asking the back end to keep, change or remove a note
 *
 * Purpose: The calls the note card and the notes sheet make (plan 92, contract C3): save a new note
 * from an offer, switch a note on or off, and remove one. The list call is the Search tab's own
 * (`listUserNotes` in search-tab/searchApi.ts), reused here so there is one place that knows its shape.
 * Every call goes through the same deadline wrapper as the rest, and a refusal comes back with the back
 * end's own plain words (for example "That's one note too many. Remove one first.") so the card can show
 * them as they are.
 *
 * Used for: NoteOfferCard.tsx (Keep), UserNotesSheet.tsx (the switch and Remove).
 *
 * Solves: Keeps the three call names and the answer shapes in one file on the notes screens' side.
 *
 * Does not: Hold any state (userNotesStore.ts does) or draw anything.
 */
import { callDeckyWithTimeout } from "../../shared/deckyCall";
import type { NoteOffer } from "../../types/backgroundAsk";
import type { UserNote } from "../search-tab/searchTypes";

export { listUserNotes } from "../search-tab/searchApi";

type SaveRpc = { ok?: boolean; note?: UserNote; error?: string };
type DeleteRpc = { ok?: boolean; error?: string };

/** What the person is told when a call fails and the back end gave no words of its own. */
const SAVE_FAILED = "That note could not be saved.";
const REMOVE_FAILED = "That note could not be removed.";

export type NoteCallResult = { ok: true; note?: UserNote } | { ok: false; error: string };

function words(res: { error?: string } | null | undefined, fallback: string): string {
  return typeof res?.error === "string" && res.error ? res.error : fallback;
}

/** Keep an offer as a new note: its words (possibly edited), for this game or, with `game` null, every game. */
export async function keepNote(args: { text: string; game: NoteOffer | null; sourceTurnId: string }): Promise<NoteCallResult> {
  const payload = {
    id: "",
    text: args.text,
    app_id: args.game?.app_id ?? "",
    game_title: args.game?.game_title ?? "",
    on: true,
    source_turn_id: args.sourceTurnId,
  };
  try {
    const res = await callDeckyWithTimeout<[typeof payload], SaveRpc>("save_user_note", [payload]);
    return res?.ok === true && res.note ? { ok: true, note: res.note } : { ok: false, error: words(res, SAVE_FAILED) };
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }
}

/** Turn one note on or off. */
export async function switchNote(id: string, on: boolean): Promise<NoteCallResult> {
  try {
    const res = await callDeckyWithTimeout<[{ id: string; on: boolean }], SaveRpc>("save_user_note", [{ id, on }]);
    return res?.ok === true && res.note ? { ok: true, note: res.note } : { ok: false, error: words(res, SAVE_FAILED) };
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }
}

/** Remove one note for good. */
export async function removeNote(id: string): Promise<NoteCallResult> {
  try {
    const res = await callDeckyWithTimeout<[string], DeleteRpc>("delete_user_note", [id]);
    return res?.ok === true ? { ok: true } : { ok: false, error: words(res, REMOVE_FAILED) };
  } catch {
    return { ok: false, error: REMOVE_FAILED };
  }
}
