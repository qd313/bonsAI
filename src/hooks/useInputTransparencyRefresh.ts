/**
 * Title: Show-details refresh
 * Purpose: Fetch the input-transparency snapshot behind the transcript's "Show details" chip
 *          and hand it to the state that draws it.
 * Used for: The Ask hook calls this once and calls the function it gets back after every
 *           terminal or cancelled status, so the chip always reflects the turn just finished.
 * Solves: The fetch, its failure handling, and stamping the snapshot onto the turn still being
 *         archived are one small job, separate from deciding when to run it.
 * Does not: Decide when to refresh — every call site is still in the Ask hook, which knows
 *           which turn just finished. Does not own the archived-turn ref itself; it only
 *           writes the transparency field onto whatever the Ask hook is currently pointing it at.
 * Caution: Lifted out of useBonsaiAskOrchestration on 2026-09-24. It must stay at exactly
 *          this point in the Ask hook's own hook list — React matches hooks by the order
 *          they run, not by name.
 */
import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";

import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../utils/deckyCall";
import type { InputTransparencyRpcResult, TransparencySnapshot } from "../utils/inputTransparency";

export type UseInputTransparencyRefreshArgs = {
  setLastTransparency: Dispatch<SetStateAction<TransparencySnapshot | null>>;
  /**
   * Shared with the Ask hook: when a turn is mid-archive, the fresh snapshot is stamped onto
   * it here so the turn that lands in askThreadCollapsed carries its own transparency data
   * rather than whatever the previous turn's was.
   */
  pendingArchiveTurnRef: RefObject<{ transparency?: TransparencySnapshot | null } | null>;
};

export function useInputTransparencyRefresh(a: UseInputTransparencyRefreshArgs): () => Promise<void> {
  const { setLastTransparency, pendingArchiveTurnRef } = a;

  const refreshInputTransparency = useCallback(async () => {
    try {
      const r = await callDeckyWithTimeout<[], InputTransparencyRpcResult>(
        "get_input_transparency",
        [],
        DECKY_RPC_TIMEOUT_MS,
      );
      if (r.available && "snapshot" in r) {
        setLastTransparency(r.snapshot);
        if (pendingArchiveTurnRef.current) {
          pendingArchiveTurnRef.current = {
            ...pendingArchiveTurnRef.current,
            transparency: r.snapshot,
          };
        }
      } else {
        setLastTransparency(null);
      }
    } catch {
      setLastTransparency(null);
    }
  }, []);

  return refreshInputTransparency;
}
