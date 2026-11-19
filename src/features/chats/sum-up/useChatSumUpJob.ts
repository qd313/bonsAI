/**
 * Title: The Sum up this chat button's job
 *
 * Purpose: Starts the back end's summary of the open chat when the Session tab's button is
 * pressed, follows it with the same status the Ask uses, and says when it is done, so the button
 * can show "Summing up · 12 s" and the card can appear under it (plan 68 step 5).
 *
 * Used for: useChatSlots.ts, which owns the open chat and hands the result on to the Session tab
 * on that chat's own row.
 *
 * Solves: The Session tab is rebuilt whenever Show details or the Quick Access menu closes, so a
 * timer kept in the tab would vanish mid-summary (plan 68 § 9). This lives above it, reads the
 * back end's own clock (`summing_up_seconds`), and on mount asks once whether a summary was still
 * running when the plugin was last closed — closing the plugin does not stop one.
 *
 * Does not: Decide whether there is anything to sum up (the back end sends `can_sum_up`), write the
 * summary, or paint anything in the transcript: this job saves no turn and has no answer.
 *
 * How it works:
 *   1. Starting it marks the chat busy at the press (the button reads "Summing up" at once, with no
 *      clock), then calls `sum_up_chat_slot`; a refusal or an error clears that and says why. An accepted
 *      job starts a poll of the one background status, every 1.2 s, the same pace the Ask's own poll
 *      uses while nothing is streaming.
 *   2. While the status says a `sum_up` job is pending, the poll keeps its seconds.
 *   3. Anything else ends it: `completed` asks the caller to reload the chat's summary, `failed`
 *      says so in one toast, `cancelled` (Stop) quietly ends it.
 *   4. Stopping it asks the back end to stop, exactly as Stop does for an answer; the poll then sees
 *      the cancelled status and ends on its own.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toaster } from "@decky/api";

import { callDeckyWithTimeout } from "../../../shared/deckyCall";
import { sumUpChatSlot } from "../slots/chatSlotsApi";
import type { BackgroundRequestStatus } from "../../../types/backgroundAsk";
import { REASON_ANSWER_IN_FLIGHT, TOAST_NOTHING_TO_SUM } from "./chatSumUpModel";

/** Same pace as the Ask's own status poll while no words are streaming (useBackgroundGameAi.ts). */
export const SUM_UP_POLL_MS = 1200;

/** The back end refused because loading the AI would leave the Deck too little free memory (plan 104 G1). */
export const SUM_UP_LOW_MEMORY_TOAST =
  "Not enough free memory on the Deck to sum up right now. Close the game or use the AI on a PC, then try again.";

export const SUM_UP_FAILED_TOAST = "Couldn't sum up the chat this time. The next question will try again.";

export type ChatSumUpJob = {
  /** The chat a summary is being written for right now, or null. */
  runningSlotId: string | null;
  seconds: number | null;
  /** `pcIp`: the AI server every Ask uses (blank = the Deck's own). */
  start: (slotId: string, pcIp?: string) => void;
  stop: () => void;
};

function isPendingSumUp(status: BackgroundRequestStatus | null | undefined): boolean {
  return Boolean(status && status.kind === "sum_up" && status.status === "pending");
}

/**
 * In: what to do once a summary has been written for a chat (read the chat's summary again).
 * Out: which chat is being summed up right now and for how many seconds, plus start and stop.
 * Can go wrong: a lost status poll is retried at the same pace rather than ending the job, and a
 * question running when the plugin reopens is never mistaken for a summary -- only a pending
 * status that says `kind: "sum_up"` is followed.
 */
export function useChatSumUpJob(onSummaryWritten: (slotId: string) => void): ChatSumUpJob {
  const [runningSlotId, setRunningSlotId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const onWrittenRef = useRef(onSummaryWritten);
  onWrittenRef.current = onSummaryWritten;

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const finish = useCallback((slotId: string, status: BackgroundRequestStatus | null) => {
    clearTimer();
    setRunningSlotId(null);
    setSeconds(null);
    if (status?.kind !== "sum_up") return;
    if (status.status === "completed") onWrittenRef.current(slotId);
    else if (status.status === "failed") toaster.toast({ title: "Sum up this chat", body: SUM_UP_FAILED_TOAST, duration: 4000 });
  }, []);

  const poll = useCallback(
    (slotId: string) => {
      clearTimer();
      timerRef.current = window.setTimeout(async () => {
        if (!mountedRef.current) return;
        let status: BackgroundRequestStatus | null = null;
        try {
          status = await callDeckyWithTimeout<[], BackgroundRequestStatus>("get_background_game_ai_status", []);
        } catch {
          // One lost poll is not the end of a job; try again at the same pace.
          if (mountedRef.current) poll(slotId);
          return;
        }
        if (!mountedRef.current) return;
        if (isPendingSumUp(status)) {
          if (typeof status?.summing_up_seconds === "number") setSeconds(status.summing_up_seconds);
          poll(slotId);
          return;
        }
        finish(slotId, status);
      }, SUM_UP_POLL_MS);
    },
    [finish],
  );

  /*
   * The chat a start is waiting on, set at the press. A ref, not state: two presses before the screen
   * redraws both see the same closure, and only a ref tells the second one that the first is on its way.
   */
  const startingRef = useRef<string | null>(null);

  const start = useCallback(
    (slotId: string, pcIp = "") => {
      if (!slotId || runningSlotId || startingRef.current) return;
      // Busy at the press: the button reads "Summing up" now, with no clock until the back end accepts.
      startingRef.current = slotId;
      setRunningSlotId(slotId);
      setSeconds(null);
      const refused = () => {
        startingRef.current = null;
        if (!mountedRef.current) return;
        setRunningSlotId(null);
        setSeconds(null);
      };
      void sumUpChatSlot(slotId, pcIp)
        .then((res) => {
          if (!mountedRef.current) return;
          if (res.accepted) {
            startingRef.current = null;
            setRunningSlotId(slotId);
            setSeconds(0);
            poll(slotId);
            return;
          }
          refused();
          // The button is greyed out in the first two of these cases already; this only covers a race.
          if (res.status === "busy") toaster.toast({ title: "Sum up this chat", body: REASON_ANSWER_IN_FLIGHT, duration: 3500 });
          else if (res.status === "nothing_to_do") toaster.toast({ title: "Sum up this chat", body: TOAST_NOTHING_TO_SUM, duration: 3500 });
          else if (res.status === "low_memory") toaster.toast({ title: "Sum up this chat", body: SUM_UP_LOW_MEMORY_TOAST, duration: 5000 });
        })
        .catch(() => {
          const wasMounted = mountedRef.current;
          refused();
          if (wasMounted) toaster.toast({ title: "Sum up this chat", body: SUM_UP_FAILED_TOAST, duration: 4000 });
        });
    },
    [poll, runningSlotId],
  );

  const stop = useCallback(() => {
    void callDeckyWithTimeout<[], { ok?: boolean }>("abort_background_game_ai", []).catch(() => {
      /* best-effort, the same as Stop on an answer */
    });
  }, []);

  // A summary still running when the plugin was last closed: pick its clock back up.
  useEffect(() => {
    mountedRef.current = true;
    void callDeckyWithTimeout<[], BackgroundRequestStatus>("get_background_game_ai_status", [])
      .then((status) => {
        if (!mountedRef.current || !isPendingSumUp(status)) return;
        const slotId = String(status.chat_slot_id ?? "");
        if (!slotId) return;
        setRunningSlotId(slotId);
        setSeconds(typeof status.summing_up_seconds === "number" ? status.summing_up_seconds : null);
        poll(slotId);
      })
      .catch(() => {
        /* best-effort restore, like the Ask's own */
      });
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [poll]);

  return { runningSlotId, seconds, start, stop };
}
