/**
 * Title: Pull models — refreshing installed tags and catalog metadata
 *
 * Purpose: Owns the round trip that learns which tags are actually on this Deck (a connection test
 * against local Ollama) and how big each catalog tag is (live size metadata), run together and run
 * once on mount, plus the small "is this screen still mounted" guard a few other pieces of the
 * screen use to cancel a deferred focus move safely.
 *
 * Used for: PullModelsModal.tsx's own mount effect, its manual refresh button, and every other
 * hook/handler on the screen that needs to schedule a focus move a tick after a state change.
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
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";
import { PULL_MODEL_CATALOG, bytesToGb } from "../data/pullModelCatalog";
import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP } from "../data/bonsaiSettingsSchema";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { getCatalogTags, mergePullModelCatalog } from "../utils/mergePullModelCatalog";
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
  /** Runs `fn` on the next animation frame, guarded against a since-unmounted screen. */
  scheduleFocusFrame: (fn: () => void) => void;
};

/** Own the mounted guard and the installed-tags/catalog-metadata refresh, run once on mount. */
export function usePullModelCatalogRefresh(a: UsePullModelCatalogRefreshArgs): PullModelCatalogRefresh {
  const { refreshCatalog, setInstalledTags, setSizeSource, setLiveSizeGbByTag, setLoadingMeta, setRefreshingMeta } =
    a;

  /**
   * Several places here (opening/closing the Filters panel, opening/closing the custom-tag
   * field) schedule a `requestAnimationFrame` to move focus one tick after a state change, so
   * the target actually exists in the DOM first. None of those are effects, so there is no
   * natural cleanup slot to cancel them in -- and an uncancelled one firing after this screen has
   * already unmounted would call `.focus()` on a stale ref. Guarded on this instead: the frame
   * still fires, but does nothing once unmounted.
   */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  function scheduleFocusFrame(fn: () => void): void {
    window.requestAnimationFrame(() => {
      if (mountedRef.current) fn();
    });
  }

  const refreshInstalledAndMeta = useCallback(
    async (forceCatalog = false) => {
      if (forceCatalog) setRefreshingMeta(true);
      else setLoadingMeta(true);
      try {
        const overlayRes = await refreshCatalog(forceCatalog);
        const tags = getCatalogTags(mergePullModelCatalog(PULL_MODEL_CATALOG, overlayRes ?? undefined));

        const tasks: Promise<unknown>[] = [
          callDeckyWithTimeout<[string, number], ConnectionTestResult>(
            "test_ollama_connection",
            [OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP, TEST_CONNECTION_TIMEOUT_SECONDS],
            TEST_CONNECTION_TIMEOUT_SECONDS * 1000 + LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS
          ).then((res) => {
            if (res.reachable && Array.isArray(res.models)) {
              setInstalledTags(normalizeInstalledSet(res.models));
            }
          }),
          callDeckyWithTimeout<[string[]], CatalogMetadataResponse>(
            "fetch_ollama_catalog_metadata",
            [tags],
            DECKY_RPC_TIMEOUT_MS
          ).then((meta) => {
            const src = meta.source === "live" ? "live" : "offline";
            setSizeSource(src);
            const next: Record<string, number> = {};
            const tagMap = meta.tags ?? {};
            for (const [tag, info] of Object.entries(tagMap)) {
              const b = info?.size_bytes;
              if (typeof b === "number" && b > 0) next[tag] = bytesToGb(b);
            }
            setLiveSizeGbByTag(next);
          }),
        ];
        await Promise.all(tasks);
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

  return { refreshInstalledAndMeta, scheduleFocusFrame };
}
