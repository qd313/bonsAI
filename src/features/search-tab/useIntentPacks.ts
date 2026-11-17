/**
 * Title: Intent packs
 *
 * Purpose: Intent packs are small, shareable files that teach the plugin's
 * search extra words for the same setting — so typing something the
 * built-in search does not recognize can still find the right toggle. This
 * hook loads a person's installed packs from the backend, and lets them
 * look them up for search.
 *
 * Used for: The intent packs section in Settings, and the search box that
 * looks things up across Settings.
 *
 * Solves: Lets a person add their own search words without the plugin
 * needing to ship a matching update.
 *
 * Does not: Decide how the extra words are matched against what someone
 * types — that search logic lives in `intentPackSearch`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { callDeckyWithTimeout } from "../../shared/deckyCall";
import {
  buildIntentPackSearchIndex,
  type IntentPack,
  type IntentPackSearchIndex,
} from "./intentPackSearch";

type IntentPackSummary = {
  id: string;
  label: string;
  enabled: boolean;
  source: string;
  entry_count: number;
  updated_at?: string;
};

export type IntentPacksState = {
  packs: IntentPack[];
  summaries: IntentPackSummary[];
  index: IntentPackSearchIndex;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type GetIntentPacksResponse = {
  schema_version?: number;
  summaries?: IntentPackSummary[];
  packs?: IntentPack[];
};

/**
 * In: the setter functions for the pack list and the summary list, plus a
 * backend response that may or may not carry fresh copies of either.
 * Out: nothing — it updates state in place.
 * Can go wrong: a response missing one of the two lists leaves that half
 * of the state untouched rather than clearing it, which is deliberate —
 * some backend calls only return one list, not both.
 */
function applyResponse(
  setPacks: React.Dispatch<React.SetStateAction<IntentPack[]>>,
  setSummaries: React.Dispatch<React.SetStateAction<IntentPackSummary[]>>,
  data: GetIntentPacksResponse | null | undefined
): void {
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data.packs)) {
    setPacks(data.packs as IntentPack[]);
  }
  if (Array.isArray(data.summaries)) {
    setSummaries(data.summaries as IntentPackSummary[]);
  }
}

/**
 * In: nothing — it loads its own data from the backend as soon as it
 * mounts.
 * Out: the current pack list, a search index built from it, loading and
 * error state, and a refresh action.
 * Can go wrong: `refresh()` runs once automatically on mount; every other
 * action leaves the caller to decide whether to refresh afterward, and
 * most do refresh their own state from the response they get back rather
 * than calling `refresh()` again.
 */
export function useIntentPacks(): IntentPacksState {
  const [packs, setPacks] = useState<IntentPack[]>([]);
  const [summaries, setSummaries] = useState<IntentPackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callDeckyWithTimeout<[], GetIntentPacksResponse>("get_intent_packs", []);
      applyResponse(setPacks, setSummaries, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const index = useMemo(() => buildIntentPackSearchIndex(packs), [packs]);

  return {
    packs,
    summaries,
    index,
    loading,
    error,
    refresh,
  };
}
