/**
 * Title: Pull models — the catalog table's derived data
 *
 * Purpose: Turns the raw merged catalog and the screen's filter/installed state into everything
 * the table itself renders: the grouped, sectioned row list, the flat row list the D-pad walks by
 * index, and the header's installed/queued counts and sizes.
 *
 * Used for: PullModelsModal.tsx's table body and its header summary line.
 *
 * Solves: keeps one clear pipeline — filter, group, section, flatten, total — instead of scattering
 * these derivations through the render body, and keeps each step's own dependency list next to it.
 *
 * Does not: decide the filters themselves (the Filters panel and its state stay in the screen) or
 * fetch the catalog (usePullModelCatalog does that). This only reshapes what it is handed.
 *
 * Caution: Lifted out of PullModelsModal.tsx with the order of its own hooks unchanged, because
 * React only tolerates a fixed hook order. It is called from exactly the position the block used
 * to occupy, right after the "New badge" bookkeeping effect and right before the focus helpers.
 * Keep it there.
 */
import { useMemo } from "react";
import {
  PULL_MODEL_GROUP_LABELS,
  PULL_MODEL_GROUP_ORDER,
  comparePullModelEntriesNewestFirst,
  comparePullModelEntriesStretchOrder,
  type PullModelEntry,
  type PullModelGroup,
  type PullModelModeFilterId,
} from "../data/pullModelCatalog";
import type { ModelPolicyTierId } from "../data/modelPolicy";
import { isCatalogModelTagInList } from "../utils/mergePullModelCatalog";
import {
  entryMatchesLicenceTier,
  entryMatchesModeFilters,
  isTagInstalled,
  resolveRowSizeGb,
} from "../utils/pullModelFilters";
import { isRecentPullModelTag, type PullModelPullRecord } from "../utils/pullModelNewBadge";
import type { TableSection } from "../components/PullModelsModal.types";
import { isDeckEssentialsPullModel } from "../data/pullModelCatalog";

export type UsePullModelTableDataArgs = {
  mergedCatalog: readonly PullModelEntry[];
  installedTags: Set<string>;
  modeFilters: ReadonlySet<PullModelModeFilterId>;
  installedOnly: boolean;
  essentialsOnly: boolean;
  recentlyAddedOnly: boolean;
  pullRecord: PullModelPullRecord;
  modelPolicyTier: ModelPolicyTierId;
  liveSizeGbByTag: Record<string, number>;
  selectedTags: Set<string>;
};

export type PullModelTableData = {
  tableSections: TableSection[];
  flatRows: TableSection["rows"];
  installedCatalogCount: number;
  installedTotalGb: number;
  selectedTotalGb: number;
};

/** Own the filter -> group -> section -> flatten -> total pipeline behind the table. */
export function usePullModelTableData(a: UsePullModelTableDataArgs): PullModelTableData {
  const {
    mergedCatalog,
    installedTags,
    modeFilters,
    installedOnly,
    essentialsOnly,
    recentlyAddedOnly,
    pullRecord,
    modelPolicyTier,
    liveSizeGbByTag,
    selectedTags,
  } = a;

  const otherInstalledTags = useMemo(() => {
    const out: string[] = [];
    for (const t of installedTags) {
      if (!isCatalogModelTagInList(mergedCatalog, t)) out.push(t);
    }
    // Not in the curated catalog, so there is no license or mode data to check the Licence /
    // Ask-mode filters against -- only "Recently added" (the New badge, tracked by tag alone)
    // applies to this section, same as it always applied to these rows' own badge.
    const filtered = recentlyAddedOnly
      ? out.filter((t) => isRecentPullModelTag(pullRecord, t, Date.now()))
      : out;
    filtered.sort((a, b) => a.localeCompare(b));
    return filtered;
  }, [installedTags, mergedCatalog, recentlyAddedOnly, pullRecord]);

  const filteredCatalog = useMemo(() => {
    return mergedCatalog.filter((entry) => {
      if (!entryMatchesLicenceTier(entry, modelPolicyTier)) return false;
      if (!entryMatchesModeFilters(entry, modeFilters)) return false;
      if (installedOnly && !isTagInstalled(entry.tag, installedTags)) return false;
      // Essentials only ON: show just the essentials group. OFF: show everything else,
      // stretch (Expert large) included -- it used to be dropped here too, through a
      // second "daily driver" check that excluded it in both toggle states, so the
      // Expert group could never be shown at all (found while wiring its bake-off order,
      // docs/planning/41-deck-model-survey.md § 9, D73).
      //
      // A model already on this Deck always keeps its row, though: Essentials only is about what
      // to download, and hiding an installed model left no star to use it for Ask and no Remove
      // unless you knew to open Filters -- while the header still counted it (Deck, plan 64 flow
      // G: qwen2.5:1.5b pulled by typed name, "Installed 3", no row; plan64-PRELOAD-01-try2.json).
      if (essentialsOnly && !isDeckEssentialsPullModel(entry) && !isTagInstalled(entry.tag, installedTags)) {
        return false;
      }
      if (recentlyAddedOnly) {
        const installed = isTagInstalled(entry.tag, installedTags);
        if (!installed || !isRecentPullModelTag(pullRecord, entry.tag, Date.now())) return false;
      }
      return true;
    });
  }, [
    modelPolicyTier,
    modeFilters,
    installedOnly,
    essentialsOnly,
    recentlyAddedOnly,
    installedTags,
    mergedCatalog,
    pullRecord,
  ]);

  const groupedCatalog = useMemo(() => {
    const map = new Map<PullModelGroup, PullModelEntry[]>();
    for (const g of PULL_MODEL_GROUP_ORDER) map.set(g, []);
    for (const entry of filteredCatalog) {
      map.get(entry.group)?.push(entry);
    }
    for (const g of PULL_MODEL_GROUP_ORDER) {
      // Expert (large) sorts by the bake-off's own ranking, strongest first, instead of
      // newest-first like every other group (docs/planning/41-deck-model-survey.md § 9).
      const cmp = g === "stretch" ? comparePullModelEntriesStretchOrder : comparePullModelEntriesNewestFirst;
      map.get(g)?.sort(cmp);
    }
    return map;
  }, [filteredCatalog]);

  const tableSections = useMemo((): TableSection[] => {
    const sections: TableSection[] = [];
    for (const group of PULL_MODEL_GROUP_ORDER) {
      const entries = groupedCatalog.get(group) ?? [];
      if (!entries.length) continue;
      sections.push({
        title: PULL_MODEL_GROUP_LABELS[group],
        rows: entries.map((entry) => ({ kind: "catalog", entry, group })),
      });
    }
    if (!installedOnly && otherInstalledTags.length > 0) {
      sections.push({
        title: "Other installed (not in curated catalog)",
        rows: otherInstalledTags.map((tag) => ({ kind: "other", tag })),
      });
    }
    return sections;
  }, [groupedCatalog, installedOnly, otherInstalledTags]);

  const flatRows = useMemo(() => tableSections.flatMap((s) => s.rows), [tableSections]);

  const installedCatalogCount = useMemo(() => {
    let n = 0;
    for (const e of mergedCatalog) {
      if (isTagInstalled(e.tag, installedTags)) n += 1;
    }
    return n + otherInstalledTags.length;
  }, [installedTags, mergedCatalog, otherInstalledTags.length]);

  const installedTotalGb = useMemo(() => {
    let sum = 0;
    for (const e of mergedCatalog) {
      if (isTagInstalled(e.tag, installedTags)) sum += resolveRowSizeGb(e, liveSizeGbByTag);
    }
    for (const t of otherInstalledTags) {
      sum += liveSizeGbByTag[t] ?? 0;
    }
    return sum;
  }, [installedTags, mergedCatalog, otherInstalledTags, liveSizeGbByTag]);

  const selectedTotalGb = useMemo(() => {
    let sum = 0;
    for (const tag of selectedTags) {
      const entry = mergedCatalog.find((e) => e.tag === tag);
      if (entry) sum += resolveRowSizeGb(entry, liveSizeGbByTag);
    }
    return sum;
  }, [selectedTags, mergedCatalog, liveSizeGbByTag]);

  return {
    tableSections,
    flatRows,
    installedCatalogCount,
    installedTotalGb,
    selectedTotalGb,
  };
}
