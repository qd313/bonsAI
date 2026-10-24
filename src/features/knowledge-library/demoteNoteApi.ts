/**
 * Title: Ranking a note lower from the screen
 *
 * Purpose: The one call the thumbs-down rows make when the person says a note or shared tip was wrong
 * for their question: it sends the note's library number, whether it is a note or a tip, and the reason,
 * and says how many marks the note holds now. The same call with `undo` takes the newest mark back.
 *
 * Used for: The "Wrong tip", "Outdated" and "Wrong edition" choices under an answer that used notes (plan 98).
 *
 * Solves: Keeps the call name and the answer shape of the back end's `demote_rag_corpus_note` in one file,
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
