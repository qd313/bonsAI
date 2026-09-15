/**
 * Title: Turning a saved chat back into question-and-answer pairs
 *
 * Purpose: A saved chat is stored on disk as a flat list of turns — a question, then an answer, then
 * the next question, and so on. The screen wants to show them paired up: each question next to its
 * own answer, in a row the player can open and close. This file does that pairing when a saved chat
 * is reopened. If the very last turn is a question with no answer yet (the chat was closed before the
 * AI replied), that question is kept and handed back separately, so it can be shown as still waiting
 * for a reply rather than silently dropped.
 *
 * Used for: useChatSlots, both when switching to a different saved chat and when reloading the
 * current one after an answer finishes.
 *
 * Solves: an earlier version of this pairing silently threw away a question left without an answer.
 * This version keeps it. It also works out which game each restored pair was asked about, instead of
 * leaving that blank.
 *
 * Does not: save turns to disk — the Python chat-slot service owns that; this file only reshapes what
 * comes back from it.
 *
 * Gotchas:
 *   - Which game a restored pair gets labelled with is a best guess for old saves. The current game
 *     is read first from the answer itself, then from the question if the answer does not have it (an
 *     answer saved before this field existed, or a cancelled question whose answer record never got
 *     written), and only if neither has it does it fall back to the game the whole chat was started
 *     under. That last fallback can be wrong — a saved chat can outlive the game it began in, so a
 *     question asked after switching to a different game would get labelled with the first game
 *     instead. It is still a better default than showing no game at all, which is what happened before
 *     this existed, and it never applies to a turn saved from now on — those always carry their own
 *     game already.
 */
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ChatSlotTurn } from "./chatSlotsApi";

export type CollapsedTurnsResult = {
  collapsed: AskThreadCollapsedTurn[];
  pendingQuestion: string | null;
};

/**
 * Which game a restored turn was about, best answer first.
 *
 * 1. The assistant turn's own AppID — what the backend recorded when the reply landed.
 * 2. The question's AppID, for a reply saved before the field existed but whose question
 *    was not, and for a cancel whose state dict had already been torn down.
 * 3. `fallbackAppId`, the slot's `origin_app_id` — the game the chat was started under.
 *
 * Step 3 is a guess and only step 3 is: a saved chat can outlive the game it began in, so a
 * turn asked after the player switched titles gets labelled with the wrong game. It is still
 * the better default. Chats are per-game in practice, and the alternative is what this
 * function used to do — hardcode "" and tell every consumer no game was running, which is
 * wrong in *every* case rather than an uncommon one. Turns written from here on carry their
 * own AppID and never reach step 3.
 */
function turnAppId(assistant: ChatSlotTurn, question: ChatSlotTurn, fallbackAppId: string): string {
  return (assistant.app_id || "").trim() || (question.app_id || "").trim() || fallbackAppId.trim();
}

/** Same best-answer-first order as `turnAppId` above, for the game's display name (plan 54 gap 1). */
function turnAppName(
  assistant: ChatSlotTurn,
  question: ChatSlotTurn,
  fallbackAppName: string
): string {
  return (
    (assistant.app_name || "").trim() ||
    (question.app_name || "").trim() ||
    fallbackAppName.trim()
  );
}

export function turnsToCollapsedTurns(
  turns: ChatSlotTurn[],
  fallbackAppId = "",
  fallbackAppName = ""
): CollapsedTurnsResult {
  const collapsed: AskThreadCollapsedTurn[] = [];
  let pendingQ: ChatSlotTurn | null = null;

  for (const turn of turns) {
    if (turn.role === "user") {
      pendingQ = turn;
    } else if (turn.role === "assistant" && pendingQ) {
      collapsed.push({
        id: pendingQ.id,
        question: pendingQ.text,
        // The friendly caption the user saw, when one was recorded (branch picks and preset
        // sends store it; a plain typed question saves "" and the header falls back to the text).
        questionDisplay: (pendingQ.display_text || "").trim() || undefined,
        answer: turn.text,
        transparency: turn.transparency ?? null,
        appId: turnAppId(turn, pendingQ, fallbackAppId),
        appName: turnAppName(turn, pendingQ, fallbackAppName),
        // Unlike appId/appName, no question or slot fallback: the backend only knows the named
        // thing once the question has been run, so it is only ever recorded on the assistant
        // turn. "" for a turn saved before this field existed, or one that named nothing.
        askedEntity: (turn.asked_entity || "").trim() || undefined,
        // Still hardcoded, and deliberately: spoiler consent is a live session decision, not
        // something the backend persists per turn. A restored turn re-fences by default.
        spoilerConsentEffective: false,
      });
      pendingQ = null;
    }
  }

  return {
    collapsed,
    // The pending question is pure display (the thread header while an answer is still owed),
    // so the friendly caption wins here outright.
    pendingQuestion: pendingQ ? (pendingQ.display_text || "").trim() || pendingQ.text : null,
  };
}
