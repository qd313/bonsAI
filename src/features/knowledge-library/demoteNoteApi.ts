/**
 * Title: Ranking a note lower from the screen
 *
 * Purpose: The one call the thumbs-down rows make when the person says a note or shared tip was wrong
 * for their question: it sends the note's library number, whether it is a note or a tip, and the reason,
 * and says how many marks the note holds now. The same call with `undo` takes the newest mark back. Two more
 * calls count every note holding a mark and clear them all at once.
 *
 * Used for: The "Wrong tip", "Outdated" and "Wrong edition" choices under an answer that used notes (plan 98),
 * and the Knowledge base section's "Lowered notes: N" row with its Clear button (plan 100).
 *
 * Solves: Keeps the call names and the answer shapes of the back end's `demote_rag_corpus_note`,
 * `list_rag_corpus_demotes` and `clear_rag_corpus_demotes` in one file,
 * and turns a failed call into a plain "not ok" the caller can show, so no screen has to catch an error.
 *
 * Does not: Decide which notes to offer or how the rows look; the back end decides what a mark does to the
 * next question.
 */
import { callDeckyWithTimeout } from "../../shared/deckyCall";

/** The three reasons the back end accepts for a note or tip. */
export type DemoteReason = "wrong_tip" | "outdated" | "wrong_edition";

/** What the back end answers: how many marks the note holds now, and whether that leaves it out of answers. */
export type DemoteResult = { ok: true; downs: number; excluded: boolean } | { ok: false };

type DemoteRpc = { ok?: boolean; downs?: number; excluded?: boolean };

/**
 * Add one mark to a note or tip, or (with `undo`) take the newest back. `kind` is "tip" for a shared tip, else
 * "note": their numbers overlap, so the number alone never names one.
 */
export async function demoteRagCorpusNote(
  sectionId: number,
  kind: "note" | "tip",
  reason: DemoteReason,
  undo = false,
): Promise<DemoteResult> {
  try {
    const res = await callDeckyWithTimeout<[number, string, string, boolean], DemoteRpc>(
      "demote_rag_corpus_note",
      [sectionId, kind, reason, undo],
    );
    if (res?.ok !== true || typeof res.downs !== "number") return { ok: false };
    return { ok: true, downs: res.downs, excluded: res.excluded === true };
  } catch {
    return { ok: false };
  }
}

/** How many notes and tips hold at least one mark, or null when the back end could not say (the row then hides). */
export async function countLoweredNotes(): Promise<number | null> {
  try {
    const res = await callDeckyWithTimeout<[], { ok?: boolean; count?: number }>("list_rag_corpus_demotes", []);
    if (res?.ok !== true || typeof res.count !== "number") return null;
    return res.count;
  } catch {
    return null;
  }
}

/** Take back every mark at once; answers how many notes and tips held one, or a plain "not ok". */
export async function clearLoweredNotes(): Promise<{ ok: true; cleared: number } | { ok: false }> {
  try {
    const res = await callDeckyWithTimeout<[], { ok?: boolean; cleared?: number }>("clear_rag_corpus_demotes", []);
    if (res?.ok !== true || typeof res.cleared !== "number") return { ok: false };
    return { ok: true, cleared: res.cleared };
  } catch {
    return { ok: false };
  }
}
