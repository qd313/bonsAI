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
import type { LastExchangeSnapshot } from "../types/backgroundAsk";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { isStopNoticeResponse } from "./askThinkingPhases";
import type { ChatSlotTurn } from "./chatSlotsApi";
import { normalizeTurnReasoning } from "./reasoningDisplay";

/**
 * A saved answer, plus the thinking record the computer side writes beside it.
 *
 * Read through this narrow view rather than declared on `ChatSlotTurn` itself: the saved-turn
 * shape is owned elsewhere, and the record is checked field by field on the way in anyway, since
 * an older saved chat has no such key at all.
 */
type SavedTurnWithReasoning = ChatSlotTurn & { reasoning?: unknown };

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
        // Read back from the saved turn (plan 77, CONST-SPOIL-CONSENT-01). It used to be a
        // hardcoded false, so the reload that follows every finished reply drew the turn again
        // with its spoiler boxes covered even though the person had said spoilers were okay. A
        // turn saved before the field existed reads false and re-fences by default.
        spoilerConsentEffective: turn.spoiler_consent === true,
        // What the model thought before this answer, when it was kept. Left off entirely for a
        // turn saved before thinking existed, or one answered with thinking off — the reopened
        // turn then draws exactly as it did before, with no fold row.
        reasoning: normalizeTurnReasoning((turn as SavedTurnWithReasoning).reasoning),
        // Plan 68 step 2: whether this answer summed the chat up first, straight off the saved
        // assistant turn. Only ever set there (see chatSlotsApi.ts), so the question turn is never
        // consulted -- unlike appId/appName there is no slot-level fallback to fall back to.
        chatSummary: turn.chat_summary,
        // When the question was asked, for grouping the "N earlier" list by day (plan 79). The
        // question's own time, else the answer's; left off when the saved turn has neither.
        createdAt: pendingQ.created_at || turn.created_at || undefined,
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

/**
 * Whether the newest saved answer is a finished one. A stopped partial answer and a saved error are
 * kept as turns too, marked by the back end (`outcome`), and neither is something to rate or retry
 * as if it were an answer. A turn saved before the mark existed has none, so it counts as finished.
 */
export function newestSavedAnswerIsFinished(turns: ChatSlotTurn[]): boolean {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i]!;
    if (turn.role === "assistant") return !turn.outcome;
  }
  return true;
}

/**
 * A saved question and answer, read back as the "last exchange" the reply row is drawn from.
 *
 * A chat opened from disk has no exchange of its own -- the live one is only set when an answer
 * lands in this session -- so its newest answer came up without the Helpful row (plan 76 lane 4,
 * roadmap: "Older answers lose their 'Was this helpful?' row after switching chats"). The screen
 * hands this to that row when a chat is opened.
 *
 * `question` is the raw saved question, not the friendly caption: Retry re-asks what was really
 * asked, and the flush at the next Ask matches the turn already in the thread by that text. What
 * the saved turn does not record -- the model, the attachments, the ask mode -- is left off; the
 * chips fall back to the mode the panel is in. Gives nothing for a blank answer or the back end's
 * own stop placeholder, which is a status and not an answer to rate.
 */
export function lastExchangeFromSavedTurn(
  turn: AskThreadCollapsedTurn | undefined | null
): LastExchangeSnapshot | null {
  if (!turn || isStopNoticeResponse(turn.answer)) return null;
  return {
    question: turn.question,
    answer: turn.answer,
    originalQuestion: turn.question,
    appName: turn.appName || undefined,
    askedEntity: turn.askedEntity || undefined,
    spoilerConsentEffective: turn.spoilerConsentEffective === true,
    reasoning: turn.reasoning,
  };
}
