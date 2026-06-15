type PullModelCatalogRefreshListener = (force: boolean) => void;

const listeners = new Set<PullModelCatalogRefreshListener>();

/** Subscribe to catalog refresh requests (e.g. after Update AI & models). */
export function subscribePullModelCatalogRefresh(listener: PullModelCatalogRefreshListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Notify open Pull Models UI (and cache) to refresh the living catalog overlay. */
export function notifyPullModelCatalogRefresh(force = true): void {
  for (const listener of listeners) listener(force);
}
