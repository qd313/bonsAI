/**
 * Title: Checking in on an answer that is still being worked on
 *
 * Purpose: Once a question has been handed to the back end, the answer does
 * not arrive all at once — it comes together over the next while. This file
 * checks in on it, about once a second (faster, several times a second,
 * while the answer's text is actively streaming in), until it is finished
 * or has failed. Each check hands what it learned to a function the caller
 * supplies, which turns it into what the screen actually shows. It also
 * tells the read-aloud feature the moment an answer finishes or fails, so a
 * reply set to read itself out loud can start without anyone pressing play.
 *
 * Used for: useBonsaiAskOrchestration, right after it hands a question to
 * the back end.
 *
 * Solves: If the person asks a new question, or leaves the tab, while an
 * older check-in is still waiting to fire, that old one has to be thrown
 * away rather than allowed to write a stale answer over a newer one. This
 * file is what keeps track of which check-in is still the current one.
 *
 * Does not: Decide what the screen shows for a given answer — that is the
 * function the caller passes in.
 */
import { useCallback, useEffect, useRef } from "react";
import { callDeckyWithTimeout } from "../utils/deckyCall";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import { handleAskTerminalForReadAloud } from "./useReadAloud";

/** Poll interval while backend ``status`` stays ``pending`` (matches Steam Deck cadence vs RPC load). */
export const BACKGROUND_STATUS_POLL_MS = 1200;
/** Faster poll while token streaming exposes partial_response on pending asks. */
export const BACKGROUND_STREAM_POLL_MS = 150;

/**
 * Background ask lifecycle: invalidates stale polls when the user submits again or unmounts,
 * and fans out ``get_background_game_ai_status`` until a terminal state.
 */
export function useBackgroundGameAi(
  applyBackgroundStatusToUi: (status: BackgroundRequestStatus, fallbackQuestion?: string) => void,
  onPollError: (error: unknown) => void,
) {
  const askRequestSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const backgroundPollTimerRef = useRef<number | null>(null);

  const clearBackgroundPollTimer = useCallback(() => {
    if (backgroundPollTimerRef.current != null) {
      window.clearTimeout(backgroundPollTimerRef.current);
      backgroundPollTimerRef.current = null;
    }
  }, []);

  const isRequestActive = useCallback((seq: number) => {
    return isMountedRef.current && seq === askRequestSeqRef.current;
  }, []);

  const startNextRequest = useCallback(() => {
    askRequestSeqRef.current += 1;
    return askRequestSeqRef.current;
  }, []);

  const invalidateRequests = useCallback(() => {
    askRequestSeqRef.current += 1;
    clearBackgroundPollTimer();
  }, [clearBackgroundPollTimer]);

  const startBackgroundStatusPolling = useCallback(
    (seq: number, fallbackQuestion: string = "") => {
      clearBackgroundPollTimer();

      const pollOnce = async () => {
        if (!isRequestActive(seq)) return;
        try {
          const status = await callDeckyWithTimeout<[], BackgroundRequestStatus>(
            "get_background_game_ai_status",
            []
          );
          if (!isRequestActive(seq)) return;
          applyBackgroundStatusToUi(status, fallbackQuestion);
          /*
           * Read on its own (D99 call 3), when the Main tab is the one watching this poll rather
           * than bonsaiAskCompletionWatch's module-level loop (that runs only once the person has
           * left the tab). Deduped by request_id inside the handler, so whichever path sees a given
           * request's terminal status first is the one that fires it.
           */
          if (status.status === "completed" || status.status === "failed") {
            handleAskTerminalForReadAloud(status);
          }

          if (status.status === "pending") {
            /*
             * Only while tokens are actually arriving. Keying this on the *setting* instead meant a
             * 150ms poll for the whole pending window — including prep phases (KB search, Proton
             * logs, screenshot prep) that publish no partial text, so the extra ~8 RPCs/sec bought
             * nothing while a game was running.
             */
            const delayMs =
              status.streaming === true ? BACKGROUND_STREAM_POLL_MS : BACKGROUND_STATUS_POLL_MS;
            backgroundPollTimerRef.current = window.setTimeout(() => {
              void pollOnce();
            }, delayMs);
          }
        } catch (e: unknown) {
          if (!isRequestActive(seq)) return;
          onPollError(e);
        }
      };

      void pollOnce();
    },
    [applyBackgroundStatusToUi, clearBackgroundPollTimer, isRequestActive, onPollError],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      askRequestSeqRef.current += 1;
      clearBackgroundPollTimer();
    };
  }, [clearBackgroundPollTimer]);

  return {
    startNextRequest,
    invalidateRequests,
    startBackgroundStatusPolling,
    isRequestActive,
  };
}
