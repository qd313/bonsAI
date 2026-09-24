/**
 * Title: Pull models table filtering and the Filters panel row model
 *
 * Purpose: The pure matching checks PullModelsModal.tsx runs a catalog entry through (installed?
 * matches the licence tier? matches an Ask-mode filter? on the live registry?), plus the flat,
 * ordered row list that drives the Filters panel itself and the labels each row shows.
 *
 * Used for: PullModelsModal.tsx's table filtering (filteredCatalog) and its Filters panel
 * (FILTER_PANEL_ROWS and the D-pad walk over it).
 *
 * Solves: keeps "does this entry match?" and "what does this filter row say?" as one small set of
 * pure functions, testable and readable apart from the screen's state and rendering.
 *
 * Does not: hold any screen state (which filters are on, which tags are installed) — those stay in
 * PullModelsModal.tsx, which calls these with its own state on every render.
 */
import { PULL_MODEL_MODE_FILTER_OPTIONS, type PullModelEntry, type PullModelModeFilterId } from "../data/pullModelCatalog";
import { MODEL_POLICY_TIER_IDS, MODEL_POLICY_TIER_LABELS_PLAIN, type ModelPolicyTierId } from "../data/modelPolicy";
import type { CatalogMetadataResponse } from "../components/PullModelsModal.types";

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

function entryMatchesModeFilter(entry: PullModelEntry, mode: PullModelModeFilterId): boolean {
  if (mode === "speed") return entry.tags.includes("chat");
  if (mode === "strategy") return entry.tags.includes("strategy");
  if (mode === "expert") return entry.group === "stretch" || (entry.tags.includes("strategy") && entry.rating >= 5);
  return entry.tags.includes("vision") || entry.tags.includes("ocr");
}

/** No mode ticked shows everything; one or more ticked shows anything that fits *any* of them. */
export function entryMatchesModeFilters(entry: PullModelEntry, modes: ReadonlySet<PullModelModeFilterId>): boolean {
  if (modes.size === 0) return true;
  for (const mode of modes) {
    if (entryMatchesModeFilter(entry, mode)) return true;
  }
  return false;
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

/**
 * One row in the Filters panel (plan 62, § 3d) — the six filters, grouped under three headings.
 * Licence is a three-way pick (like the old Policy buttons); the rest are independent toggles.
 * A flat, ordered array rather than nested objects because every piece of D-pad wiring below
 * (Up/Down between rows, and the panel's own entry/exit) walks it by a single row index.
 */
export type FilterPanelRow =
  | { kind: "licence"; tier: ModelPolicyTierId }
  | { kind: "mode"; id: PullModelModeFilterId }
  | { kind: "installedOnly" }
  | { kind: "essentialsOnly" }
  | { kind: "recentlyAdded" };

export const FILTER_PANEL_ROWS: readonly FilterPanelRow[] = [
  ...MODEL_POLICY_TIER_IDS.map((tier): FilterPanelRow => ({ kind: "licence", tier })),
  ...PULL_MODEL_MODE_FILTER_OPTIONS.map((opt): FilterPanelRow => ({ kind: "mode", id: opt.id })),
  { kind: "installedOnly" },
  { kind: "essentialsOnly" },
  { kind: "recentlyAdded" },
];

export function filterPanelRowKey(row: FilterPanelRow): string {
  if (row.kind === "licence") return `licence-${row.tier}`;
  if (row.kind === "mode") return `mode-${row.id}`;
  return row.kind;
}

export function filterPanelRowGroupHeading(row: FilterPanelRow): string {
  if (row.kind === "licence") return "Licence";
  if (row.kind === "mode") return "Matches Ask mode";
  return "Show";
}

export function filterPanelRowLabel(row: FilterPanelRow): string {
  if (row.kind === "licence") return MODEL_POLICY_TIER_LABELS_PLAIN[row.tier];
  if (row.kind === "mode") {
    return PULL_MODEL_MODE_FILTER_OPTIONS.find((opt) => opt.id === row.id)?.label ?? row.id;
  }
  if (row.kind === "installedOnly") return "Installed only";
  if (row.kind === "essentialsOnly") return "Essentials only";
  return "Recently added";
}

/** Same text as filterPanelRowLabel, except Essentials only keeps its longer spoken description. */
export function filterPanelRowAriaLabel(row: FilterPanelRow): string {
  if (row.kind === "essentialsOnly") return "Essentials only — show Tier 1 and Tier 2 one-model presets";
  return filterPanelRowLabel(row);
}
