/**
 * Title: Reply rating and follow-up chips
 * Purpose: Own the thumbs up or down on the reply that is on screen, and the small chips that
 *          rewrite your question for you so you can send a better one.
 * Used for: The Ask hook calls this; the Main tab draws the rating state and wires the buttons.
 * Solves: Reacting to a finished reply is its own job. Neither of these asks anything — one saves
 *         what you thought of the reply, the other fills the Ask box with a reworded question and
 *         leaves sending it to you.
 * Does not: Hold Retry. Retry asks again straight away, so it stays with the code that asks.
 *           It does not own the shared note of a pending follow-up either: the submit path clears
 *           that in three places, so it stays with the Ask hook and is handed in here.
 * Caution: Lifted out of useBonsaiAskOrchestration on 2026-09-15. Two things fix where this is
 *          called from, and both were checked before the move: it must come after the request id
 *          it saves alongside exists, and before the Ask bar's clear button, which wipes the chip
 *          error. Nothing between the old and new position reads or writes any of this state.
 *
 *          The rating and "a chip was used" are also remembered outside the hook, per reply (see
 *          rememberedFeedback below): the panel remounts every time Steam's side panel closes and
 *          opens again, and a rating kept only in hook state came back as "not rated".
 */
import { useCallback, useEffect, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { toaster } from "@decky/api";

import type { AskModeId } from "../data/bonsaiSettingsSchema";
import {
  composeChipAutofillPrefix,
  replyMicroActionById,
  type ReplyMicroActionId,
} from "../data/replyMicroActions";
import type { LastExchangeSnapshot, ReplyFollowUpPending } from "../types/backgroundAsk";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";

export type UseReplyFeedbackChipsArgs = {
  /** The reply on screen. Everything here reacts to it, and a new one clears the rating. */
  lastExchange: LastExchangeSnapshot | null;
  /** Which request produced it, saved alongside the rating. */
  lastRequestId: number | null;
  /** A chip writes the reworded question straight into the Ask box. */
  setUnifiedInput: (value: string) => void;
  /** Falls back to this when the reply does not record which mode produced it. */
  askMode: AskModeId;
  /**
   * Shared with the Ask hook: a chip writes the parent question and answer here and the submit
   * path reads and clears it. It stays out there because submitting clears it in three places.
   */
  pendingReplyFollowUpRef: RefObject<ReplyFollowUpPending | null>;
};

export interface ReplyFeedbackChips {
  onReplyFeedback: (rating: "up" | "down") => Promise<void>;
  onReplyMicroAction: (chipId: ReplyMicroActionId) => Promise<void>;
  liveReplyFeedbackRating: "up" | "down" | null;
  liveReplyChipUsed: boolean;
  liveReplyChipError: string | null;
  setLiveReplyChipError: Dispatch<SetStateAction<string | null>>;
  /** Clear all three at once, for the Ask-bar clear button and the session reset. */
  resetReplyFeedback: () => void;
}

type RememberedFeedback = { rating: "up" | "down" | null; chipUsed: boolean };

/*
 * The rating given to each recent reply, kept for as long as the plugin's screen code is loaded.
 * Hook state starts over whenever the panel remounts -- Steam closes and reopens its side panel
 * for its own windows (the chat row's save icon does this), and on every QAM close and reopen --
 * while the answer itself comes back from the session-survival snapshot. Without this the
 * restored answer drew as never rated: thumbs live again and the "What went wrong?" chips gone
 * (plan 72, docs/test-evidence/plan72-F-ROW.json). A chat switch away and back is the same
 * story. Keyed by request id as well as the words, so the same words served again for a new
 * question (the answer cache) start unrated. A plugin reload still forgets; the rating is not
 * written into the chat's saved file.
 */
const REMEMBERED_LIMIT = 32;
const rememberedFeedback = new Map<string, RememberedFeedback>();

function feedbackKey(exchange: LastExchangeSnapshot | null, requestId: number | null): string | null {
  if (!exchange?.answer?.trim()) return null;
  return JSON.stringify([requestId ?? null, exchange.question, exchange.answer]);
}

function recall(key: string | null): RememberedFeedback {
  return (key && rememberedFeedback.get(key)) || { rating: null, chipUsed: false };
}

function remember(key: string | null, patch: Partial<RememberedFeedback>): void {
  if (!key) return;
  const next = { ...recall(key), ...patch };
  rememberedFeedback.delete(key);
  rememberedFeedback.set(key, next);
  while (rememberedFeedback.size > REMEMBERED_LIMIT) {
    const oldest = rememberedFeedback.keys().next().value;
    if (oldest === undefined) break;
    rememberedFeedback.delete(oldest);
  }
}

/** Tests only: forget every remembered rating, so one test's rating cannot leak into the next. */
export function resetRememberedReplyFeedbackForTests(): void {
  rememberedFeedback.clear();
}

/**
 * Own the rating on the reply that is on screen, and the chips that reword the question.
 *
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useReplyFeedbackChips(a: UseReplyFeedbackChipsArgs): ReplyFeedbackChips {
  const { lastExchange, lastRequestId, setUnifiedInput, askMode, pendingReplyFollowUpRef } = a;

  const replyKey = feedbackKey(lastExchange, lastRequestId);
  /* Started from what this reply was already given, so a remount draws the row as it was left. */
  const [liveReplyFeedbackRating, setLiveReplyFeedbackRating] = useState<"up" | "down" | null>(
    () => recall(replyKey).rating
  );
  const [liveReplyChipUsed, setLiveReplyChipUsed] = useState(() => recall(replyKey).chipUsed);
  const [liveReplyChipError, setLiveReplyChipError] = useState<string | null>(null);

  /* Clears what is drawn, not what is remembered: a chat switch runs this, and switching back to
     the same reply should find its rating again. */
  const resetReplyFeedback = useCallback(() => {
    setLiveReplyFeedbackRating(null);
    setLiveReplyChipUsed(false);
    setLiveReplyChipError(null);
  }, []);

  useEffect(() => {
    const kept = recall(replyKey);
    setLiveReplyFeedbackRating(kept.rating);
    setLiveReplyChipUsed(kept.chipUsed);
    setLiveReplyChipError(null);
  }, [replyKey]);

  const onReplyFeedback = useCallback(
    async (rating: "up" | "down") => {
      setLiveReplyFeedbackRating(rating);
      remember(replyKey, { rating });
      setLiveReplyChipError(null);
      try {
        await callDeckyWithTimeout<[string, number, number, boolean, string], { ok?: boolean }>(
          "save_ask_feedback",
          [rating, lastRequestId ?? 0, lastExchange?.question?.length ?? 0, true, ""],
          DECKY_RPC_TIMEOUT_MS
        );
        toaster.toast({
          title:
            rating === "up"
              ? "Feedback saved on this Deck"
              : "Feedback saved — use a chip to refine and resend",
          body: "",
          duration: 3000,
        });
      } catch (e: unknown) {
        toaster.toast({ title: "Feedback not saved", body: formatDeckyRpcError(e), duration: 4000 });
      }
    },
    [lastExchange?.question, lastRequestId, replyKey]
  );

  const onReplyMicroAction = useCallback(
    async (chipId: ReplyMicroActionId) => {
      const action = replyMicroActionById(chipId);
      if (!action || !lastExchange?.answer?.trim()) return;
      const originalQ = (lastExchange.originalQuestion || lastExchange.question).trim();
      if (!originalQ) return;

      pendingReplyFollowUpRef.current = {
        chipId,
        parentQuestion: originalQ,
        parentAnswer: lastExchange.answer,
        preferredModel: lastExchange.model ?? null,
        attachments: lastExchange.attachments ?? [],
        spoilerConsentEffective: lastExchange.spoilerConsentEffective ?? false,
        askMode: lastExchange.askMode ?? askMode,
      };
      setLiveReplyChipUsed(true);
      remember(feedbackKey(lastExchange, lastRequestId), { chipUsed: true });
      setLiveReplyChipError(null);
      setUnifiedInput(composeChipAutofillPrefix(action, originalQ));

      try {
        await callDeckyWithTimeout<[string, number, number, boolean, string], { ok?: boolean }>(
          "save_ask_feedback",
          ["down", lastRequestId ?? 0, originalQ.length, true, chipId],
          DECKY_RPC_TIMEOUT_MS
        );
        toaster.toast({
          title: "Prompt updated — edit and send when ready",
          body: "",
          duration: 3500,
        });
      } catch (e: unknown) {
        setLiveReplyChipError(formatDeckyRpcError(e));
      }
    },
    [askMode, setUnifiedInput, lastExchange, lastRequestId, pendingReplyFollowUpRef]
  );

  return {
    onReplyFeedback,
    onReplyMicroAction,
    liveReplyFeedbackRating,
    liveReplyChipUsed,
    liveReplyChipError,
    setLiveReplyChipError,
    resetReplyFeedback,
  };
}
