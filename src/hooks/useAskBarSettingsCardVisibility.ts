/**
 * Title: Ask bar settings-card visibility state
 *
 * Purpose: Whether the settings-search results card is hidden outright by
 * what was typed, how many of its rows currently fit, and whether a person
 * closed it for the rest of this search (the B / tap-outside behavior).
 *
 * Used for: MainTabUnifiedAskBar.tsx's settings-results card.
 *
 * Solves: Keeps this small state, and the one effect that resets the
 * "closed for this search" flag once the box is emptied, in one place.
 *
 * Does not: Measure how many rows actually fit (useAskBarSettingsCardRows
 * owns that, and writes into the setter this hook returns), or decide
 * whether the card renders at all -- MainTabUnifiedAskBar.tsx still combines
 * this state with the row count into its own showSettingsCard flag.
 */
import { useEffect, useState } from "react";

import { shouldHideSettingsResultsCard } from "./useSteamSettingsSearch";

/*
 * In: the question text, and how many settings currently match it.
 * Out: settingsCardHidden (typed text hides the card outright),
 * settingsCardRowsShown + its setter (how many rows currently fit --
 * MainTabUnifiedAskBar.tsx hands the setter to useAskBarSettingsCardRows),
 * and settingsCardClosedForSearch + its setter (B / tap-outside).
 * What can go wrong: nothing computed here beyond a string check and a
 * reset-on-empty effect.
 */
export function useAskBarSettingsCardVisibility(unifiedInput: string, filteredSettingsLength: number) {
  /*
   * The settings-results card (plan 45 / plan 56 lane E): does what was typed hide it outright
   * (a long question, unless it is an exact run inside a setting's own name -- see
   * shouldHideSettingsResultsCard), and if not, how many of the results actually fit above the
   * question box without reaching the tab bar.
   */
  const settingsCardHidden = shouldHideSettingsResultsCard(unifiedInput);
  const [settingsCardRowsShown, setSettingsCardRowsShown] = useState<number>(filteredSettingsLength);

  /*
   * B closes the settings-results card for the rest of this search while keeping what was typed
   * (plan 45 section 4's "B" row / plan 56 lane E2 step 3). Reset the moment the box is emptied,
   * since that is what "a new search starts" means here -- the card cannot show again before then
   * anyway, because showSettingsCard below also requires filteredSettings.length > 0.
   */
  const [settingsCardClosedForSearch, setSettingsCardClosedForSearch] = useState(false);
  useEffect(() => {
    if (unifiedInput.trim() === "") setSettingsCardClosedForSearch(false);
  }, [unifiedInput]);

  return {
    settingsCardHidden,
    settingsCardRowsShown,
    setSettingsCardRowsShown,
    settingsCardClosedForSearch,
    setSettingsCardClosedForSearch,
  };
}
