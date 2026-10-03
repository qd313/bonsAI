/**
 * Title: Pull models — refreshing installed tags and catalog metadata
 *
 * Purpose: Owns the round trip that learns which tags are actually on this Deck (a connection test
 * against local Ollama) and how big each catalog tag is (live size metadata), run together and run
 * once on mount, plus `focusAfterRedraw`, which a few other pieces of the screen use to move the
 * ring onto something their own state change is about to draw.
 *
 * Used for: PullModelsModal.tsx's own mount effect, its manual refresh button, and every other
 * hook/handler on the screen that needs to move the ring once a state change has been drawn.
 *
 * Solves: keeps the two RPCs, run in parallel, and their shared busy/error handling in one place,
 * since they always run together and always fall back to the offline catalog the same way on
 * failure.
 *
 * Does not: decide when to run — the caller's own "Refresh" button and its mount effect are both
 * just calls to the returned function.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after the component's own refs and right before the pinned-tag and New-badge
 * effects. Keep it there.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";
import { PULL_MODEL_CATALOG, bytesToGb } from "../data/pullModelCatalog";
import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP } from "../data/bonsaiSettingsSchema";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { loadSavedIp } from "../features/plugin-shell/pluginStorage";
import { getCatalogTags, isCatalogModelTagInList, mergePullModelCatalog } from "../utils/mergePullModelCatalog";
import { normalizeInstalledSet } from "../utils/pullModelFilters";
import type { CatalogMetadataResponse, ConnectionTestResult } from "../components/PullModelsModal.types";

const TEST_CONNECTION_TIMEOUT_SECONDS = 10;
const LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS = 42000;

export type UsePullModelCatalogRefreshArgs = {
  refreshCatalog: (force: boolean) => Promise<unknown>;
  setInstalledTags: Dispatch<SetStateAction<Set<string>>>;
  setSizeSource: Dispatch<SetStateAction<"live" | "offline">>;
  setLiveSizeGbByTag: Dispatch<SetStateAction<Record<string, number>>>;
  setLoadingMeta: Dispatch<SetStateAction<boolean>>;
  setRefreshingMeta: Dispatch<SetStateAction<boolean>>;
};

export type PullModelCatalogRefresh = {
  refreshInstalledAndMeta: (forceCatalog?: boolean) => Promise<void>;
  /** Runs `fn` right after the redraw the caller's own state change asked for (see below). */
  focusAfterRedraw: (fn: () => void) => void;
};

/** Own the after-redraw focus move and the installed-tags/catalog-metadata refresh. */
export function usePullModelCatalogRefresh(a: UsePullModelCatalogRefreshArgs): PullModelCatalogRefresh {
  const { refreshCatalog, setInstalledTags, setSizeSource, setLiveSizeGbByTag, setLoadingMeta, setRefreshingMeta } =
    a;

  /**
   * Several places here (opening/closing the Filters panel, opening/closing the custom-tag field)
   * change state and then move the ring onto something that change draws. The move used to wait
   * for the next animation frame and assume the redraw had landed by then. When the frame came
   * first -- a busy machine, or a press Steam delivers outside React's own batching -- the target
   * did not exist yet, the move found nothing, and nothing tried again: the ring landed nowhere
   * (plan 70: PullModelsModal.filtersPanel.test.tsx failed about one full run in three that way).
   *
   * Now the move is kept until the very commit the caller's state change produces, and runs in a
   * layout effect right after it: the tick bump below is batched with that state change, so the
   * commit that runs the effect is the one that drew the target. An unmounted screen runs no
   * effects, which is the guard the old frame needed a mounted flag for.
   */
  const pendingFocusRef = useRef<(() => void) | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  useLayoutEffect(() => {
    const fn = pendingFocusRef.current;
    pendingFocusRef.current = null;
    fn?.();
  }, [focusTick]);
  function focusAfterRedraw(fn: () => void): void {
    pendingFocusRef.current = fn;
    setFocusTick((t) => t + 1);
  }

  const refreshInstalledAndMeta = useCallback(
    async (forceCatalog = false) => {
      if (forceCatalog) setRefreshingMeta(true);
      else setLoadingMeta(true);
      try {
        const overlayRes = await refreshCatalog(forceCatalog);
        const catalog = mergePullModelCatalog(PULL_MODEL_CATALOG, overlayRes ?? undefined);
        const catalogTags = getCatalogTags(catalog);

        // Which tags are actually on this Deck has to come before the size lookup: a model
        // installed outside the curated catalog (typed by hand, or pulled from an old overlay
        // entry that has since been removed) still needs a real size, or the confirm-to-remove
        // box and the header's own total both undercount it as 0 -- "< 0.1 GB" for a 17 GB model,
        // seen on the Deck (docs/test-evidence/plan64-ROUTING-MERGE-01-top-try2.json). Sequencing
        // these two RPCs (instead of Promise.all) is the cost of asking for the right tags.
        const connRes = await callDeckyWithTimeout<[string, number], ConnectionTestResult>(
          "test_ollama_connection",
          [OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP, TEST_CONNECTION_TIMEOUT_SECONDS],
          TEST_CONNECTION_TIMEOUT_SECONDS * 1000 + LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS
        );
        let installedList: string[] = [];
        if (connRes.reachable && Array.isArray(connRes.models)) {
          installedList = connRes.models;
          setInstalledTags(normalizeInstalledSet(connRes.models));
        }
        const otherInstalled = installedList.filter((t) => !isCatalogModelTagInList(catalog, t));
        const metaTags = Array.from(new Set([...catalogTags, ...otherInstalled]));

        // The PC address this Deck last saved travels with the look: the back end trims the saved try
        // order to what the Deck holds here, and must keep a name that PC still has (it is not in the
        // saved hosts, so only the screen knows it). Without it this look undid a removal's keep.
        const meta = await callDeckyWithTimeout<[string[], string], CatalogMetadataResponse>(
          "fetch_ollama_catalog_metadata",
          [metaTags, loadSavedIp().trim()],
          DECKY_RPC_TIMEOUT_MS
        );
        const src = meta.source === "live" ? "live" : "offline";
        setSizeSource(src);
        const next: Record<string, number> = {};
        const tagMap = meta.tags ?? {};
        for (const [tag, info] of Object.entries(tagMap)) {
          const b = info?.size_bytes;
          if (typeof b === "number" && b > 0) next[tag] = bytesToGb(b);
        }
        setLiveSizeGbByTag(next);
      } catch (e) {
        setSizeSource("offline");
        toaster.toast({
          title: "Could not refresh models",
          body: formatDeckyRpcError(e),
          duration: 5000,
        });
      } finally {
        setLoadingMeta(false);
        setRefreshingMeta(false);
      }
    },
    [refreshCatalog]
  );

  useEffect(() => {
    void refreshInstalledAndMeta(false);
  }, [refreshInstalledAndMeta]);

  return { refreshInstalledAndMeta, focusAfterRedraw };
}
