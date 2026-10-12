/**
 * Title: What draws the Search tab
 *
 * Purpose: Runs while a person has the Search tab open. It builds that screen, the first tab in the strip
 * (left of Main), and hands it whatever the main plugin screen knows that it needs.
 *
 * Used for: The tab bar's always-present Search tab (plan 92, lane N3).
 *
 * Solves: Keeps the Search tab's hand-down from the main plugin screen in one small file, beside the
 * other tabs' payload hooks, so index.tsx only has to list the tab.
 *
 * Does not: Search anything itself; SearchTab and the files beside it do.
 */
import React, { useMemo } from "react";

import { SearchTab } from "../../search-tab/SearchTab";

/**
 * In: nothing yet; the body's hand-downs join here with it.
 * Out: the finished Search tab element, built once.
 * Can go wrong: nothing; it only wires values into the tab component.
 */
export function useSearchTabPayload(): React.ReactElement {
  return useMemo(() => <SearchTab />, []);
}
