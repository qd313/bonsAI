/**
 * Title: What the "the note was wrong" rows hold for the answer on screen
 *
 * Purpose: Holds where the Wrong tip / Outdated / Wrong edition rows are for the newest answer (the reasons,
 * "Which note was it?", or marked with Undo) and makes the plugin call that ranks a note lower or takes the
 * mark back (plan 98). kbDemoteRows.tsx draws the rows from what this returns.
 *
 * Used for: MainTabChatTranscript.tsx, which hands what this returns to both of its reply rows.
 *
 * Solves: The rows need state that outlives a redraw and the panel closing and opening, without threading two
 * more values from the Ask hook down through the main screen to the transcript, which already has the answer
 * and its request id.
 *
 * Does not: Draw anything, or decide what a mark does to the next question (the back end does). It does not
 * hold the thumbs or the five older reasons (useReplyFeedbackChips.ts does).
 *
 * Caution: Remembered outside the hook per answer, as the rating is: the panel remounts every time Steam's
 * side panel closes and opens again, and a mark kept only in hook state came back as "not marked".
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { KbAttachedNote } from "../../../types/inputTransparency";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../../shared/deckyCall";
import { demoteRagCorpusNote } from "../../knowledge-library/demoteNoteApi";
import {
  DEMOTE_START,
  demotableNotes,
  sendDemotes,
  type DemoteNoteFn,
  type DemoteReasonId,
  type ReplyDemoteActions,
  type ReplyDemoteState,
} from "./kbDemoteRows";

export type UseReplyDemoteArgs = {
  /** The answer on screen. A new one starts the rows over. */
  lastExchange: LastExchangeSnapshot | null;
  /** Which request produced it, saved with the reason in the feedback log. */
  lastRequestId: number | null;
  /** The plugin call; the real one unless a test hands in a stand-in. */
  demoteNote?: DemoteNoteFn;
};

export type ReplyDemote = { state: ReplyDemoteState; actions: ReplyDemoteActions };

const REMEMBERED_LIMIT = 64;
const remembered = new Map<string, ReplyDemoteState>();

/** The same answer, live or read back from the saved chat, under its request id when it has one. */
function answerKey(exchange: LastExchangeSnapshot | null, requestId: number | null): string | null {
  if (!exchange?.answer?.trim()) return null;
  return JSON.stringify([requestId ?? null, (exchange.originalQuestion || exchange.question).trim(), exchange.answer.trim()]);
}

function recall(key: string | null): ReplyDemoteState {
  return (key && remembered.get(key)) || DEMOTE_START;
}

function remember(key: string | null, state: ReplyDemoteState): void {
  if (!key) return;
  remembered.delete(key);
  remembered.set(key, state);
  while (remembered.size > REMEMBERED_LIMIT) {
    const oldest = remembered.keys().next().value;
    if (oldest === undefined) break;
    remembered.delete(oldest);
  }
}

/** Tests only: forget every remembered mark. */
export function resetRememberedReplyDemoteForTests(): void {
  remembered.clear();
}

/**
 * In: the answer on screen, its request id, and (tests only) a stand-in for the plugin call.
 * Out: where the rows are, and what a press on them does.
 * Can go wrong: a call that fails or times out puts the reasons back with its words (the ring goes back onto
 * the reason that was picked); nothing throws into a press.
 */
export function useReplyDemote(a: UseReplyDemoteArgs): ReplyDemote {
  const { lastExchange, lastRequestId } = a;
  const demoteNote = a.demoteNote ?? demoteRagCorpusNote;
  const replyKey = answerKey(lastExchange, lastRequestId);
  const [state, setState] = useState<ReplyDemoteState>(() => recall(replyKey));
  /* The answer on screen and its rows, for a call that answers after the person has moved on. */
  const replyKeyNow = useRef(replyKey);
  replyKeyNow.current = replyKey;
  const stateNow = useRef(state);

  useEffect(() => {
    const kept = recall(replyKey);
    stateNow.current = kept;
    setState(kept);
  }, [replyKey]);

  /* Remembered for the answer it belongs to; drawn only while that answer is still the one on screen. */
  const show = useCallback((key: string | null, next: ReplyDemoteState) => {
    remember(key, next);
    if (key !== replyKeyNow.current) return;
    stateNow.current = next;
    setState(next);
  }, []);

  /* Mark the picked notes. Drawn as marked at once, so the ring can move onto Undo; a refusal puts the
     reasons back with its words. When only some were kept ("All of them" with one call failing), the
     marked line stays for the ones that were, with the words, so Undo takes back exactly those. The
     feedback log gets the reason as it gets the other five. */
  const confirm = useCallback(
    async (reason: DemoteReasonId, picked: KbAttachedNote[]) => {
      const key = replyKey;
      show(key, { phase: "done", reason, picked });
      void callDeckyWithTimeout<[string, number, number, boolean, string], { ok?: boolean }>(
        "save_ask_feedback",
        ["down", lastRequestId ?? 0, lastExchange?.question?.length ?? 0, true, reason],
        DECKY_RPC_TIMEOUT_MS
      ).catch(() => {
        /* The mark is what the person asked for; a lost log line is not worth a message. */
      });
      const { problem, took } = await sendDemotes(demoteNote, picked, reason, false);
      if (!problem) return;
      if (took.length) show(key, { phase: "done", reason, picked: took, error: `Could not mark every note: ${problem}` });
      else show(key, { phase: "reasons", reason, error: `Could not mark the note: ${problem}` });
    },
    [demoteNote, lastExchange?.question, lastRequestId, replyKey, show]
  );

  const actions: ReplyDemoteActions = {
    choose: (reason, notes) => {
      const usable = demotableNotes(notes);
      if (usable.length === 1) void confirm(reason, usable);
      else if (usable.length > 1) show(replyKey, { phase: "which", reason });
    },
    pick: (notes) => {
      const was = stateNow.current;
      const usable = demotableNotes(notes);
      if (was.phase === "which" && usable.length) void confirm(was.reason, usable);
    },
    back: () => {
      const was = stateNow.current;
      if (was.phase === "which") show(replyKey, { phase: "reasons", reason: was.reason });
    },
    undo: () => {
      const was = stateNow.current;
      if (was.phase !== "done") return;
      const key = replyKey;
      show(key, { phase: "reasons", reason: was.reason });
      /* A failed undo keeps the marked line for the notes still marked, so a second Undo takes back only those. */
      void sendDemotes(demoteNote, was.picked, was.reason, true).then(({ problem, failed }) => {
        if (problem) show(key, { phase: "done", reason: was.reason, picked: failed, error: `Could not undo: ${problem}` });
      });
    },
  };
  return { state, actions };
}
