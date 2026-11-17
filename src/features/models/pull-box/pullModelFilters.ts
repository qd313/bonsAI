/**
 * Title: Pull models table checks
 *
 * Purpose: The pure checks PullModelsModal.tsx runs a catalog entry through (installed? inside the licence
 * setting, so drawn dimmed when it is not? on the live registry?).
 *
 * Used for: the table in PullModelsModal.tsx, usePullModelTableData.ts's counts and the try-order group.
 *
 * Solves: keeps "does this entry match?" as one small set of pure functions, testable and readable apart from
 * the screen's state and rendering.
 *
 * Does not: hold any screen state (which filters are on, which tags are installed) — those stay in
 * PullModelsModal.tsx, which calls these with its own state on every render.
 */
import type { PullModelEntry } from "../pullModelCatalog";
import type { ModelPolicyTierId } from "../modelPolicy";
import type { CatalogMetadataResponse } from "./PullModelsModal.types";

/**
 * Which of the requested tags the Ollama registry does not actually publish.
 *
 * `pull_ollama_models` (`main.py:_start_custom_ollama_pull`) already runs this exact check on the
 * back end before starting anything, but when the request mixes good and bad names it starts the
 * good ones and only logs the bad ones -- the screen used to say "Pull started" for every name
 * with no sign one was dropped. Running the same live-registry lookup here first means the queued
 * "Pull selected" request can leave the bad name out and say so, instead of the person finding out
 * only when that model is never there to use. Mirrors `partition_pull_tags_by_registry`
 * (`ollama_catalog_service.py`): a tag missing from the response, or without `exists: true`, counts
 * as unavailable; an offline check (no live source) cannot tell either way, so nothing is flagged.
 */
export function findUnavailableRegistryTags(
  tags: string[],
  meta: CatalogMetadataResponse | null | undefined
): string[] {
  if (!meta || meta.source !== "live") return [];
  const tagMeta = meta.tags ?? {};
  return tags.filter((tag) => tagMeta[tag]?.exists !== true);
}

export function normalizeInstalledSet(models: string[]): Set<string> {
  const s = new Set<string>();
  for (const m of models) {
    const t = (m || "").trim();
    if (t) s.add(t);
  }
  return s;
}

export function isTagInstalled(tag: string, installed: Set<string>): boolean {
  if (installed.has(tag)) return true;
  if (installed.has(`${tag}:latest`)) return true;
  const base = tag.split(":")[0];
  for (const inst of installed) {
    if (inst === tag || inst.startsWith(`${tag}:`)) return true;
    if (tag.includes(":") && inst.split(":")[0] === base && inst === tag) return true;
  }
  return false;
}

export function resolveRowSizeGb(entry: PullModelEntry, liveSizes: Record<string, number | undefined>): number {
  const live = liveSizes[entry.tag];
  if (typeof live === "number" && live > 0) return live;
  return entry.sizeGb;
}

/**
 * The Licence filter, replacing the old standalone Policy tier buttons (plan 62, § 3d) — it is
 * the point of the change, so it filters the list exactly the way the three tiers read: Tier 1
 * shows only FOSS tags, Tier 2 adds open-weight, Tier 3 ("Any installed model") holds nothing
 * back. Each tier is a superset of the one before it.
 */
export function entryMatchesLicenceTier(entry: PullModelEntry, tier: ModelPolicyTierId): boolean {
  if (tier === "open_source_only") return entry.licenseClass === "foss";
  if (tier === "open_weight") return entry.licenseClass === "foss" || entry.licenseClass === "open_weight";
  return true;
}
