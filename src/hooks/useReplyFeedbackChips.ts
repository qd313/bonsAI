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

/**
 * Own the rating on the reply that is on screen, and the chips that reword the question.
 *
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useReplyFeedbackChips(a: UseReplyFeedbackChipsArgs): ReplyFeedbackChips {
  const { lastExchange, lastRequestId, setUnifiedInput, askMode, pendingReplyFollowUpRef } = a;

  const [liveReplyFeedbackRating, setLiveReplyFeedbackRating] = useState<"up" | "down" | null>(null);
  const [liveReplyChipUsed, setLiveReplyChipUsed] = useState(false);
  const [liveReplyChipError, setLiveReplyChipError] = useState<string | null>(null);

  const resetReplyFeedback = useCallback(() => {
    setLiveReplyFeedbackRating(null);
    setLiveReplyChipUsed(false);
    setLiveReplyChipError(null);
  }, []);

  useEffect(() => {
    setLiveReplyFeedbackRating(null);
    setLiveReplyChipUsed(false);
    setLiveReplyChipError(null);
  }, [lastExchange?.question, lastExchange?.answer]);

  const onReplyFeedback = useCallback(
    async (rating: "up" | "down") => {
      setLiveReplyFeedbackRating(rating);
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
    [lastExchange?.question, lastRequestId]
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
