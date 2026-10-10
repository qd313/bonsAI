/**
 * Title: The "No close match" line leaves when a note was used
 *
 * Purpose: The back end appends "No close match in my notes, this answer leans on the model's own
 * knowledge." to a reply whose attached notes were a weak match. The gold "From the notes" block
 * under the same reply lists the notes the answer actually used (kbNoteUsedByAnswer.ts). When both
 * are true of one reply, the line is false: it says the answer leans on the model alone while the
 * block names a note the answer repeated. This takes the line off the answer shown on screen in
 * that one case, so the line and the block never share a reply.
 *
 * Used for: MainTabChatTranscript.tsx's answer bubble, the copy text and the read-aloud text of an
 * answer (live and saved).
 * Solves: Found in the maintainer's saved chats: the shotgun answer built on the Gravity Gun note
 * and the Hollow Knight boss answer naming Broken Vessel both carried the line under a block that
 * listed the note (kbNoteUsedByAnswer.fixtures.json). The 2026-10-08 Deck report of the line with
 * "notes attached" in the log is the other half and needs no change here: notes were attached
 * but the answer used none, so the line is true and no block shows.
 *
 * Does not: Change what the back end saves, decide whether a match was close, or touch any other
 * footer ("Not in my notes", the safety notice). The saved chat keeps the full text.
 *
 * How it works:
 * 1. Ask kbNotesUsedByAnswer which attached notes the answer used. None used: the answer is
 *    returned as it came.
 * 2. Some used: cut the footer (a rule line holding only a dash, then the italic "No close match"
 *    line) out of the answer, and trim the blank space it leaves behind.
 */
import { kbNotesUsedByAnswer } from "./kbNoteUsedByAnswer";
import type { KbAttachedNote } from "./inputTransparency";

/** The footer as kb_not_in_notes_notice.py writes it: blank line, a lone dash, the italic line. */
const CLOSE_MATCH_FOOTER_RE = /\s*\n\s*—\s*\n\s*\*No close match in my notes,[^\n]*\*[ \t]*/g;

/**
 * In: an answer as the back end saved it, the question it answered and the notes attached to
 * that turn. Out: the answer without its "No close match" line when a note was used, else the
 * answer unchanged.
 */
export function answerWithoutContradictedCloseMatchLine(
  answer: string,
  question: string | null | undefined,
  notes: KbAttachedNote[]
): string {
  if (!answer || !notes.length) return answer;
  const stripped = answer.replace(CLOSE_MATCH_FOOTER_RE, "");
  if (stripped === answer) return answer;
  if (!kbNotesUsedByAnswer(notes, answer, question).length) return answer;
  return stripped.trimEnd();
}
