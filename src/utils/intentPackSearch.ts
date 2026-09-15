/**
 * Title: Finding a setting by a word that is not its actual name
 *
 * Purpose: Searching Settings normally matches the setting's own name against what was typed. That
 * misses a player typing a word they know instead — "temperature" instead of "thermal", say. An
 * "intent pack" is a small, offline list mapping words like that to the real setting name. This file
 * builds a fast lookup out of a loaded pack, and uses it to widen a search: it first checks for a
 * plain, ordinary match against the setting names themselves, then adds any extra settings the intent
 * pack's alternate words point to.
 *
 * Used for: useIntentPacks, useSteamSettingsSearch, and the Settings tab's own search box.
 *
 * Solves: lets a player find a setting by a word they actually think of, in addition to the setting's
 * own name, without changing the shape of what a search normally returns.
 *
 * Does not: save or load intent packs from disk — see useIntentPacks for the back-end calls that
 * import and export them. This file only searches with whatever pack it is handed.
 */

import { SETTINGS_SEARCH_MIN_QUERY_LENGTH } from "../features/unified-input/constants";

type IntentPackEntry = {
  target: string;
  aliases?: string[];
  synonyms?: string[];
  expansions?: string[];
};

export type IntentPack = {
  id: string;
  label: string;
  enabled?: boolean;
  source?: string;
  updated_at?: string;
  entries: IntentPackEntry[];
};
export type IntentPackSearchIndex = {
  aliasSynonym: Array<{ term: string; target: string; kind: "alias" | "synonym" }>;
  expansion: Array<{ term: string; target: string }>;
};

export function buildIntentPackSearchIndex(packs: readonly IntentPack[]): IntentPackSearchIndex {
  const aliasSynonym: IntentPackSearchIndex["aliasSynonym"] = [];
  const expansion: IntentPackSearchIndex["expansion"] = [];

  for (const pack of packs) {
    if (pack.enabled === false) continue;
    for (const entry of pack.entries ?? []) {
      const target = entry.target?.trim();
      if (!target) continue;
      for (const term of entry.aliases ?? []) {
        const t = term.trim().toLowerCase();
        if (t.length >= SETTINGS_SEARCH_MIN_QUERY_LENGTH) {
          aliasSynonym.push({ term: t, target, kind: "alias" });
        }
      }
      for (const term of entry.synonyms ?? []) {
        const t = term.trim().toLowerCase();
        if (t.length >= SETTINGS_SEARCH_MIN_QUERY_LENGTH) {
          aliasSynonym.push({ term: t, target, kind: "synonym" });
        }
      }
      for (const term of entry.expansions ?? []) {
        const t = term.trim().toLowerCase();
        if (t.length >= SETTINGS_SEARCH_MIN_QUERY_LENGTH) {
          expansion.push({ term: t, target });
        }
      }
    }
  }

  return { aliasSynonym, expansion };
}

function nativeMatches(query: string, database: readonly string[]): string[] {
  const lower = query.toLowerCase();
  return database.filter((setting) => setting.toLowerCase().includes(lower));
}

function packMatches(
  query: string,
  index: IntentPackSearchIndex,
  exclude: Set<string>
): string[] {
  const lower = query.toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (target: string) => {
    if (exclude.has(target) || seen.has(target)) return;
    seen.add(target);
    out.push(target);
  };

  for (const row of index.aliasSynonym) {
    if (lower.includes(row.term)) {
      push(row.target);
    }
  }
  for (const row of index.expansion) {
    if (lower.includes(row.term)) {
      push(row.target);
    }
  }

  return out;
}

/** Unified settings search: native substring matches first, then intent pack hits. */
export function searchSettingsWithIntentPacks(
  query: string,
  database: readonly string[],
  index: IntentPackSearchIndex | null | undefined
): string[] {
  const q = query.trim();
  if (q.length < SETTINGS_SEARCH_MIN_QUERY_LENGTH) return [];

  const native = nativeMatches(q, database);
  if (!index) return native;

  const nativeSet = new Set(native);
  const packHits = packMatches(q, index, nativeSet);
  return [...native, ...packHits];
}
