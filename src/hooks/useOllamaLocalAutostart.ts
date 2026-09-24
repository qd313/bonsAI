/**
 * Title: The "Start the AI with the Deck" startup entry
 *
 * Purpose: Reads and flips the per-user Deck startup entry that starts the
 * local AI (and the note-searching part) when the Deck itself starts, so
 * questions come back sooner without a manual step each boot.
 *
 * Used for: OllamaWhereAiRunsSection's "Start the AI with the Deck" toggle.
 *
 * Solves: Keeps the panel's own file shorter by moving one self-contained
 * concern — reading the real state on mount and applying a flip — out on
 * its own, since nothing else in the panel reads or writes this state.
 *
 * Does not: Own the toggle's checked value, the saved setting
 * (`ollamaLocalAutostart`), or the `autostartStatus`/`autostartBusy` state
 * itself — those stay in the panel (the panel still shows them in its own
 * JSX) and are handed in here as setters, so this hook's own hook calls
 * stay exactly the three the panel used to make at this spot: the two
 * useState calls for that state still happen in the panel, at the same
 * position they always did.
 *
 * Does not: touch the "Run AI on this Deck" toggle or the local-install
 * flow next to it.
 *
 * Caution: Lifted out of OllamaWhereAiRunsSection on 2026-09-24. The block
 * it came from was the last three hooks in the component, called with
 * nothing after them but the JSX return, so the move keeps the same
 * position in the hook call order relative to everything before it.
 */
import { useCallback, useEffect } from "react";
import { toaster } from "@decky/api";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import type { OllamaLocalAutostartStatus } from "../components/OllamaWhereAiRunsSection.types";

/**
 * Refresh on mount, then apply a flip. Every hook below must keep its position — React
 * matches hooks by the order they run in.
 */
export function useOllamaLocalAutostart({
  setAutostartStatus,
  setAutostartBusy,
  setOllamaLocalAutostart,
}: {
  setAutostartStatus: (v: OllamaLocalAutostartStatus | null) => void;
  setAutostartBusy: (v: boolean) => void;
  setOllamaLocalAutostart: (v: boolean) => void;
}) {
  const refreshAutostartStatus = useCallback(() => {
    callDeckyWithTimeout<[], OllamaLocalAutostartStatus>(
      "get_ollama_local_autostart_status",
      [],
      DECKY_RPC_TIMEOUT_MS
    )
      .then(setAutostartStatus)
      .catch(() => {
        // Best-effort: the toggle itself still reflects the saved setting either way.
      });
  }, []);

  // Mount-once: shows the real state (installed/enabled/running) under the toggle without
  // waiting for the person to flip it first.
  useEffect(() => {
    refreshAutostartStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot on section mount
  }, []);

  const handleToggleAutostart = useCallback(
    (next: boolean) => {
      setOllamaLocalAutostart(next);
      setAutostartBusy(true);
      callDeckyWithTimeout<[boolean], { ok?: boolean; changed?: boolean; message?: string; reason?: string }>(
        "apply_ollama_local_autostart",
        [next],
        DECKY_RPC_TIMEOUT_MS
      )
        .then((out) => {
          toaster.toast({
            title: next ? "Start the AI with the Deck" : "Startup entry turned off",
            body: out?.message ?? out?.reason ?? "Done.",
            duration: 5000,
          });
        })
        .catch((e: unknown) => {
          toaster.toast({
            title: "Could not change the startup entry",
            body: formatDeckyRpcError(e),
            duration: 6000,
          });
        })
        .finally(() => {
          setAutostartBusy(false);
          refreshAutostartStatus();
        });
    },
    [refreshAutostartStatus, setOllamaLocalAutostart]
  );

  return { handleToggleAutostart };
}
