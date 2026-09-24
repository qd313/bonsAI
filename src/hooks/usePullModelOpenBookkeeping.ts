/**
 * Title: Pull models — bookkeeping that runs on open
 *
 * Purpose: Two small effects that run without any button press: seeding which tag is shown as
 * "used for Ask" from the saved routing order, and updating the client-side "New" badge record
 * whenever the installed-tags list changes.
 *
 * Used for: PullModelsModal.tsx, right after the catalog/installed-tags refresh it both depend on.
 *
 * Solves: keeps two unrelated but small on-open effects out of the component body, since neither
 * has anything to do with a person's own action on this screen.
 *
 * Does not: decide the New-badge record math itself — see utils/pullModelNewBadge.ts for the
 * first-run rule this effect has to respect.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after the catalog-refresh hook and right before the table-data hook. Keep it
 * there.
 */
import { useEffect, type Dispatch, type SetStateAction } from "react";
import { PULL_MODEL_NEW_BADGE_STORAGE_KEY } from "../data/storageKeys";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../utils/deckyCall";
import { computeUpdatedPullRecord, type PullModelPullRecord } from "../utils/pullModelNewBadge";
import type { PullModelsRoutingOrderSettings } from "../components/PullModelsModal.types";

export type UsePullModelOpenBookkeepingArgs = {
  installedTags: Set<string>;
  setPinnedAskTag: Dispatch<SetStateAction<string | null>>;
  setPullRecord: Dispatch<SetStateAction<PullModelPullRecord>>;
};

/** Own the two effects that run on open rather than on any person's own action. */
export function usePullModelOpenBookkeeping(a: UsePullModelOpenBookkeepingArgs): void {
  const { installedTags, setPinnedAskTag, setPullRecord } = a;

  // Seed "which model is Ask using" once on open, from the saved text try-order's first entry —
  // the same field ModelRoutingOrderModal edits and merge_pulled_tags_into_routing_orders appends
  // to. Best-effort: a failed load just leaves nothing pinned rather than blocking the picker.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await callDeckyWithTimeout<[], PullModelsRoutingOrderSettings>(
          "load_settings",
          [],
          DECKY_RPC_TIMEOUT_MS
        );
        const order = Array.isArray(settings.text_model_routing_order) ? settings.text_model_routing_order : [];
        const head = typeof order[0] === "string" ? order[0].trim() : "";
        if (!cancelled) setPinnedAskTag(head || null);
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // "New" badge bookkeeping — see the block comment above computeUpdatedPullRecord.
  useEffect(() => {
    /* Nothing to record before the connection test answers, and writing an empty record here is
       what caused the Deck failure described above — so do not write one. */
    if (installedTags.size === 0) return;
    try {
      const raw = window.localStorage.getItem(PULL_MODEL_NEW_BADGE_STORAGE_KEY);
      const stored: PullModelPullRecord | null = raw === null ? null : (JSON.parse(raw) as PullModelPullRecord);
      const updated = computeUpdatedPullRecord(installedTags, stored, Date.now());
      window.localStorage.setItem(PULL_MODEL_NEW_BADGE_STORAGE_KEY, JSON.stringify(updated));
      setPullRecord(updated);
    } catch {
      /* localStorage unavailable or corrupt — the badge just doesn't show */
    }
  }, [installedTags]);
}
