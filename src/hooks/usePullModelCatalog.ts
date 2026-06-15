import { useCallback, useEffect, useMemo, useState } from "react";
import { PULL_MODEL_CATALOG } from "../data/pullModelCatalog";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../utils/deckyCall";
import {
  mergePullModelCatalog,
  type FetchPullModelCatalogResponse,
  type PullModelCatalogSource,
} from "../utils/mergePullModelCatalog";
import { subscribePullModelCatalogRefresh } from "../utils/pullModelCatalogRefresh";

export function usePullModelCatalog() {
  const [overlayPayload, setOverlayPayload] = useState<FetchPullModelCatalogResponse | null>(null);
  const [catalogSource, setCatalogSource] = useState<PullModelCatalogSource>("bundled");
  const [catalogLoading, setCatalogLoading] = useState(false);

  const mergedCatalog = useMemo(
    () => mergePullModelCatalog(PULL_MODEL_CATALOG, overlayPayload),
    [overlayPayload]
  );

  const refreshCatalog = useCallback(async (force = false): Promise<FetchPullModelCatalogResponse | null> => {
    setCatalogLoading(true);
    try {
      const res = await callDeckyWithTimeout<[{ force?: boolean }], FetchPullModelCatalogResponse>(
        "fetch_pull_model_catalog",
        [{ force }],
        DECKY_RPC_TIMEOUT_MS
      );
      setOverlayPayload(res);
      setCatalogSource(res.source === "live" || res.source === "cached" ? res.source : "bundled");
      return res;
    } catch {
      setCatalogSource("bundled");
      return null;
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    return subscribePullModelCatalogRefresh((force: boolean) => {
      void refreshCatalog(force);
    });
  }, [refreshCatalog]);

  return {
    mergedCatalog,
    catalogSource,
    catalogLoading,
    refreshCatalog,
    overlayPayload,
  };
}
