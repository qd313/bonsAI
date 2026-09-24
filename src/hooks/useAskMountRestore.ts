/**
 * Title: Resume a pending Ask after remount
 * Purpose: On mount, ask the backend once whether a question was still running when the
 *          plugin panel last closed, and pick polling back up if it was.
 * Used for: The Ask hook calls this once; nothing else calls it directly.
 * Solves: A question asked, then the panel closed before it finished, otherwise looks
 *         abandoned the next time the panel opens — this is what notices it is still
 *         running and puts the spinner and the poll back.
 * Does not: Poll on its own after the first check — startBackgroundStatusPolling (handed in)
 *           takes over from there, the same as every other pending status.
 * Caution: Lifted out of useBonsaiAskOrchestration on 2026-09-24. It must stay at exactly
 *          this point in the Ask hook's own hook list — React matches hooks by the order
 *          they run, not by name. Its effect deliberately runs only once (an empty
 *          dependency list): the callbacks it needs change identity on every render (they
 *          close over the Ask hook's own args object), and depending on them directly
 *          re-fires this effect every render — a status RPC, a re-apply, a state change,
 *          another render — a loop the original file's own comments say was measured
 *          directly (~15ms, 19k dbg log entries). Latest callbacks are read through a ref.
 */
import { useEffect, useRef } from "react";

import { callDeckyWithTimeout } from "../utils/deckyCall";
import { startAskCompletionWatch } from "../utils/bonsaiAskCompletionWatch";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";

export type UseAskMountRestoreArgs = {
  applyBackgroundStatusToUi: (status: BackgroundRequestStatus, fallbackQuestion?: string) => void;
  isRequestActive: (seq: number) => boolean;
  startBackgroundStatusPolling: (seq: number, question: string) => void;
  startNextRequest: () => number;
};

export function useAskMountRestore(a: UseAskMountRestoreArgs): void {
  const { applyBackgroundStatusToUi, isRequestActive, startBackgroundStatusPolling, startNextRequest } = a;

  const restoreFnsRef = useRef({ applyBackgroundStatusToUi, isRequestActive, startBackgroundStatusPolling, startNextRequest });
  restoreFnsRef.current = { applyBackgroundStatusToUi, isRequestActive, startBackgroundStatusPolling, startNextRequest };
  useEffect(() => {
    const fns = restoreFnsRef.current;
    const seq = fns.startNextRequest();

    callDeckyWithTimeout<[], BackgroundRequestStatus>("get_background_game_ai_status", [])
      .then((status) => {
        const f = restoreFnsRef.current;
        if (!f.isRequestActive(seq)) return;
        f.applyBackgroundStatusToUi(status);
        if (status.status === "pending") {
          f.startBackgroundStatusPolling(seq, status.question ?? "");
          startAskCompletionWatch();
        }
      })
      .catch(() => {
        // Best-effort restore only; keep startup quiet if backend status isn't available.
      });
  }, []);
}
