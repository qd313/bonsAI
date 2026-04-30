import { useCallback, useEffect, useRef } from "react";
import { call } from "@decky/api";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";

/** Poll interval while backend ``status`` stays ``pending`` (matches Steam Deck cadence vs RPC load). */
export const BACKGROUND_STATUS_POLL_MS = 1200;

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
          const status = await call<[], BackgroundRequestStatus>("get_background_game_ai_status");
          if (!isRequestActive(seq)) return;
          applyBackgroundStatusToUi(status, fallbackQuestion);

          if (status.status === "pending") {
            backgroundPollTimerRef.current = window.setTimeout(() => {
              void pollOnce();
            }, BACKGROUND_STATUS_POLL_MS);
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
