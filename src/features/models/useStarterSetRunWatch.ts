/**
 * Title: Notice when the starter-set run ends while the Browse models screen is still open
 *
 * Purpose: "Install the starter set" starts a background run and returns at once. The screen decided whether
 * to keep drawing the button from facts read when it opened, so after a run finished the button stayed on the
 * open screen until it was closed and reopened (Deck, 2026-10-14, plan93-P93-B3-STARTER-DECK-D3.json). This
 * watches the run's status and calls back once, with the phase it ended in.
 *
 * Used for: PullModelsStarterSetChip.tsx.
 *
 * Solves: The button reflects the run that just ended without leaving the screen.
 *
 * Does not: Start or cancel a run, or read what was installed (the caller does, when told the run ended).
 * It counts only an ending of a starter-set run (an idle status also reads as "done", and so does another
 * kind of run); a run that finishes before the first look (everything was already there) still counts. If
 * no starter-set run is ever seen (a refused start) it gives up after a short while and calls back with nothing.
 */
import { useCallback, useEffect, useRef } from "react";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../utils/deckyCall";

const STARTER_RUN_POLL_MS = 1500;
const GIVE_UP_WITHOUT_A_RUN_LOOKS = 10;

type RunStatus = { phase?: string; done?: boolean; profile?: string };

const STARTER_PROFILE = "tier1_essentials";
const ENDED = new Set(["done", "failed", "cancelled"]);

/** Returns `watch`: call it right after a run was started; `onEnd` hears the ending phase ("" if no run was seen). */
export function useStarterSetRunWatch(onEnd: (phase: string) => void): () => void {
  const timerRef = useRef<number | undefined>(undefined);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => () => window.clearInterval(timerRef.current), []);

  return useCallback(() => {
    window.clearInterval(timerRef.current);
    let looks = 0;
    const finish = (phase: string) => {
      window.clearInterval(timerRef.current);
      onEndRef.current(phase);
    };
    timerRef.current = window.setInterval(() => {
      looks += 1;
      void callDeckyWithTimeout<[], RunStatus>("get_local_ollama_setup_status", [], DECKY_RPC_TIMEOUT_MS)
        .then((st) => {
          const ours = st?.profile === STARTER_PROFILE;
          if (ours && st?.done && ENDED.has(String(st.phase))) finish(String(st.phase));
          else if (!(ours && st?.phase === "running") && looks >= GIVE_UP_WITHOUT_A_RUN_LOOKS) finish("");
        })
        .catch(() => {
          if (looks >= GIVE_UP_WITHOUT_A_RUN_LOOKS) finish("");
        });
    }, STARTER_RUN_POLL_MS);
  }, []);
}
