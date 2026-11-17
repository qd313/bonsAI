/**
 * Title: Pull models — the catalog table's derived data
 *
 * Purpose: Turns the raw merged catalog and the screen's filter/installed state into everything
 * the table itself renders: the grouped, sectioned row list, the flat row list the D-pad walks by
 * index, the header's installed/queued counts and sizes, and the word buttons the strip above the list draws.
 *
 * Used for: PullModelsModal.tsx's table body, its header summary line and its filter strip.
 *
 * Solves: keeps one clear pipeline — filter, group, section, flatten, total — instead of scattering
 * these derivations through the render body, and keeps each step's own dependency list next to it.
 *
 * Does not: decide the filters themselves (the strip and its state stay in the screen) or
 * choose the catalog (the built-in list in data/pullModelCatalog.ts). This only reshapes what it is handed.
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
} from "../pullModelCatalog";
import { isCatalogModelTagInList } from "./mergePullModelCatalog";
import { isTagInstalled, resolveRowSizeGb } from "./pullModelFilters";
import { buildPullModelWords, entryMatchesWord, type PullModelWord } from "./pullModelWords";
import type { TableSection } from "./PullModelsModal.types";

export type UsePullModelTableDataArgs = {
  mergedCatalog: readonly PullModelEntry[];
  installedTags: Set<string>;
  /** The "Fits this Deck" switch: on, a model that is slow or too big for a Deck is left out unless it is installed. */
  fitsDeck: boolean;
  /** The picked word, or null. A word the list no longer has (a switch changed under it) counts as none. */
  word: string | null;
  liveSizeGbByTag: Record<string, number>;
  selectedTags: Set<string>;
};

export type PullModelTableData = {
  tableSections: TableSection[];
  flatRows: TableSection["rows"];
  installedCatalogCount: number;
  installedTotalGb: number;
  selectedTotalGb: number;
  /** The word buttons: built from the models the switches leave, before a word narrows them. */
  words: PullModelWord[];
  /** The picked word if the list still has it, else null. */
  activeWord: string | null;
  /** How many models "Fits this Deck" is leaving out (not installed, in the Expert group). */
  offBigCount: number;
};

/** Own the filter -> group -> section -> flatten -> total pipeline behind the table. */
export function usePullModelTableData(a: UsePullModelTableDataArgs): PullModelTableData {
  const { mergedCatalog, installedTags, fitsDeck, word, liveSizeGbByTag, selectedTags } = a;

  const otherInstalledTags = useMemo(() => {
    const out: string[] = [];
    // Not in the curated catalog, so there is no licence or word data to check them against: they are listed
    // at the end whenever no word is picked.
    for (const t of installedTags) {
      if (!isCatalogModelTagInList(mergedCatalog, t)) out.push(t);
    }
    out.sort((x, y) => x.localeCompare(y));
    return out;
  }, [installedTags, mergedCatalog]);

  /**
   * The list the switches leave. The licence setting never takes a row out (it dims it, plan 105), and a model
   * already on this Deck always keeps its row: the header counts it, and hiding it left no star to use it for Ask
   * and no Remove (Deck, plan 64 flow G; plan 105 found the licence check had the same effect).
   */
  const pool = useMemo(
    () => mergedCatalog.filter((entry) => !fitsDeck || entry.group !== "stretch" || isTagInstalled(entry.tag, installedTags)),
    [mergedCatalog, fitsDeck, installedTags]
  );

  const words = useMemo(() => buildPullModelWords(pool), [pool]);
  const activeWord = word && words.some((w) => w.id === word) ? word : null;

  const filteredCatalog = useMemo(() => pool.filter((entry) => entryMatchesWord(entry, activeWord)), [pool, activeWord]);

  const offBigCount = useMemo(
    () => (fitsDeck ? mergedCatalog.filter((e) => e.group === "stretch" && !isTagInstalled(e.tag, installedTags)).length : 0),
    [mergedCatalog, fitsDeck, installedTags]
  );

  const groupedCatalog = useMemo(() => {
    const map = new Map<PullModelGroup, PullModelEntry[]>();
    for (const g of PULL_MODEL_GROUP_ORDER) map.set(g, []);
    for (const entry of filteredCatalog) {
      map.get(entry.group)?.push(entry);
    }
    for (const g of PULL_MODEL_GROUP_ORDER) {
      // Expert (large) sorts by the bake-off's own ranking, strongest first, instead of
      // newest-first like every other group (workshop:planning/41-deck-model-survey.md § 9).
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
      // The groups keep their order (essentials first) but are not headed on screen: the drawn list is one list.
      sections.push({
        title: PULL_MODEL_GROUP_LABELS[group],
        showTitle: false,
        rows: entries.map((entry) => ({ kind: "catalog", entry, group })),
      });
    }
    // Under a picked word the section is left out: nothing says a model the catalog does not know is
    // a chat model. The header's counts still include them.
    if (activeWord === null && otherInstalledTags.length > 0) {
      sections.push({
        title: "Other installed (not in curated catalog)",
        showTitle: true,
        rows: otherInstalledTags.map((tag) => ({ kind: "other", tag })),
      });
    }
    return sections;
  }, [groupedCatalog, activeWord, otherInstalledTags]);

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
    words,
    activeWord,
    offBigCount,
  };
}
