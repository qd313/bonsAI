import { useCallback, useEffect, useMemo, useState } from "react";
import { call } from "@decky/api";
import {
  buildIntentPackSearchIndex,
  type IntentPack,
  type IntentPackSearchIndex,
} from "../utils/intentPackSearch";

export type IntentPackSummary = {
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
  setPackEnabled: (packId: string, enabled: boolean) => Promise<boolean>;
  exportPack: (packId: string) => Promise<{ ok: boolean; json?: string; error?: string }>;
  importPack: (
    json: string,
    confirm: boolean
  ) => Promise<{
    ok: boolean;
    error?: string;
    conflicts?: Array<{ term: string; existing_target: string; incoming_target: string }>;
    stats?: { added_entries?: number; merged_entries?: number; conflicts?: number };
    pack?: { id?: string; label?: string };
    dry_run?: boolean;
  }>;
  removePack: (packId: string) => Promise<boolean>;
};

type GetIntentPacksResponse = {
  schema_version?: number;
  summaries?: IntentPackSummary[];
  packs?: IntentPack[];
};

type MutationResponse = GetIntentPacksResponse & {
  ok?: boolean;
  error?: string;
  conflicts?: Array<{ term: string; existing_target: string; incoming_target: string }>;
  stats?: { added_entries?: number; merged_entries?: number; conflicts?: number };
  pack?: IntentPack;
  dry_run?: boolean;
  json?: string;
};

function applyResponse(
  setPacks: React.Dispatch<React.SetStateAction<IntentPack[]>>,
  setSummaries: React.Dispatch<React.SetStateAction<IntentPackSummary[]>>,
  data: GetIntentPacksResponse | MutationResponse | null | undefined
): void {
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data.packs)) {
    setPacks(data.packs as IntentPack[]);
  }
  if (Array.isArray(data.summaries)) {
    setSummaries(data.summaries as IntentPackSummary[]);
  }
}

export function useIntentPacks(): IntentPacksState {
  const [packs, setPacks] = useState<IntentPack[]>([]);
  const [summaries, setSummaries] = useState<IntentPackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call<[], GetIntentPacksResponse>("get_intent_packs");
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

  const setPackEnabled = useCallback(async (packId: string, enabled: boolean) => {
    try {
      const data = await call<[string, boolean], MutationResponse>("set_intent_pack_enabled", packId, enabled);
      if (data?.ok === false) {
        setError(typeof data.error === "string" ? data.error : "Failed to update pack");
        return false;
      }
      applyResponse(setPacks, setSummaries, data);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const exportPack = useCallback(async (packId: string) => {
    try {
      const data = await call<[string], MutationResponse>("export_intent_pack", packId);
      if (data?.ok === false) {
        return { ok: false, error: typeof data.error === "string" ? data.error : "Export failed" };
      }
      if (typeof data.json === "string") {
        return { ok: true, json: data.json };
      }
      return { ok: false, error: "Empty export" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  const importPack = useCallback(async (json: string, confirm: boolean) => {
    try {
      const data = await call<[{ json: string; confirm: boolean }], MutationResponse>("import_intent_pack", {
        json,
        confirm,
      });
      if (data?.ok === false) {
        return { ok: false, error: typeof data.error === "string" ? data.error : "Import failed" };
      }
      if (confirm) {
        applyResponse(setPacks, setSummaries, data);
      }
      return {
        ok: true,
        conflicts: data.conflicts,
        stats: data.stats,
        pack: data.pack as { id?: string; label?: string } | undefined,
        dry_run: data.dry_run,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  const removePack = useCallback(async (packId: string) => {
    try {
      const data = await call<[string], MutationResponse>("remove_intent_pack", packId);
      if (data?.ok === false) {
        setError(typeof data.error === "string" ? data.error : "Remove failed");
        return false;
      }
      applyResponse(setPacks, setSummaries, data);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  return {
    packs,
    summaries,
    index,
    loading,
    error,
    refresh,
    setPackEnabled,
    exportPack,
    importPack,
    removePack,
  };
}
