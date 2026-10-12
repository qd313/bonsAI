/**
 * Title: What the AI models box remembers while the plugin stays open
 *
 * Purpose: Three small memories of the AI models box, kept outside every component: the Good for and
 * Show filter picks (so closing the box and opening it again shows the same filters), the filters
 * column's stop the ring was last on (so Left from the model list comes back to it; Right goes to
 * what sits beside the ring, pullModelsBeside.ts, and needs no memory). Also the one helper that
 * hands Steam's ring to the column or the list (Steam's own transfer onto that part's nav node), and
 * the plain sibling move used inside one part.
 *
 * Used for: PullModelsModal.tsx (the filter picks, the transfers) and
 * PullModelsFiltersColumn.tsx (the column's stop).
 *
 * Solves: A Decky popup rebuilds what is behind it when it closes, and the box itself is a popup, so
 * a pick or a "come back here" note kept in a component's state is lost the moment the box closes
 * (docs/lessons-learned.md § 3). Kept here they last until the plugin itself is reloaded. The licence
 * pick is not here: it is a saved setting, saved on Done as it always was.
 *
 * Does not: Save anything to disk, decide where the ring goes (the box does), or move the ring by a
 * plain `focus()`.
 */
import { useCallback, useState } from "react";
import type { PullModelModeFilterId } from "../data/pullModelCatalog";
import { refocusPanelWindowIfLost, type NavRefHolder } from "../utils/navFocusRegistry";

/** The Good for and Show picks: everything the column filters by except the licence. */
export type PullModelsSessionFilters = {
  modeFilters: ReadonlySet<PullModelModeFilterId>;
  installedOnly: boolean;
  essentialsOnly: boolean;
  recentlyAddedOnly: boolean;
};

/** Where Clear puts the picks back to, and where a fresh plugin starts: Deck essentials only, the rest off. */
export const DEFAULT_SESSION_FILTERS: PullModelsSessionFilters = {
  modeFilters: new Set(),
  installedOnly: false,
  essentialsOnly: true,
  recentlyAddedOnly: false,
};

let sessionFilters: PullModelsSessionFilters = DEFAULT_SESSION_FILTERS;
let columnStop: string | null = null;

type FiltersChange = Partial<PullModelsSessionFilters> | ((prev: PullModelsSessionFilters) => Partial<PullModelsSessionFilters>);

/**
 * The box's Good for and Show picks as React state that starts from, and writes through to, the
 * session's memory. Out: the picks, and one function that changes some of them (an object, or a
 * function of the picks as they are).
 */
export function usePullModelsSessionFilters(): [PullModelsSessionFilters, (change: FiltersChange) => void] {
  const [picks, setPicks] = useState<PullModelsSessionFilters>(() => sessionFilters);
  const change = useCallback((next: FiltersChange) => {
    setPicks((prev) => {
      const merged = { ...prev, ...(typeof next === "function" ? next(prev) : next) };
      sessionFilters = merged;
      return merged;
    });
  }, []);
  return [picks, change];
}

/** The column's stop the ring is on now (its key), noted on every landing. */
export function noteFiltersColumnStop(key: string): void {
  columnStop = key;
}

export function rememberedFiltersColumnStop(): string | null {
  return columnStop;
}

/**
 * Steam's own transfer of the ring onto a part's nav node (the column or the list), the only way the
 * ring crosses from one part of the box to another (AGENTS.md, "The Steam Deck focus graph"). False
 * when the part is not drawn, Decky has not filled its node yet, or Steam declines; the caller then
 * leaves the press to Steam. The page's window gets its focus back first if it lost it (plan 76).
 */
export function handRingTo(part: NavRefHolder): boolean {
  const node = part.current;
  if (!node?.TakeFocus) return false;
  refocusPanelWindowIfLost();
  try {
    return node.TakeFocus(true) !== false;
  } catch {
    return false;
  }
}

/**
 * The plain move inside one part of the box (a stop to its neighbour in the column, a row to the next
 * row in the list): `.focus()` then `.scrollIntoView()` when the element has one. Safe only between
 * siblings in one container; crossing to the other part goes through `handRingTo` first. jsdom (the
 * tests' DOM) has no scrollIntoView, so an unguarded call would throw there; the Deck always has it.
 */
export function focusAndReveal(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  el.focus();
  if (typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  return true;
}

/** Test-only: a plugin opened fresh. */
export function resetPullModelsBoxMemory(): void {
  sessionFilters = DEFAULT_SESSION_FILTERS;
  columnStop = null;
}
