/**
 * Title: What draws the Search tab
 *
 * Purpose: Runs while a person has the Search tab open. It builds that screen, the first tab in the strip
 * (left of Main), and hands it what the main plugin screen knows that it needs: whether it is showing,
 * whether an answer is being written, and how to look up and open a Steam setting.
 *
 * Used for: The tab bar's always-present Search tab (plan 92, lane N3).
 *
 * Solves: Keeps the Search tab's hand-down from the main plugin screen in one small file, beside the
 * other tabs' payload hooks, so index.tsx only has to list the tab.
 *
 * Does not: Search anything itself; SearchTab and the files beside it do.
 */
import React, { useMemo } from "react";

import { SearchTab, type SearchTabProps } from "../../search-tab/SearchTab";

export type UseSearchTabPayloadArgs = SearchTabProps;

/**
 * In: whether Search is the tab showing, whether an answer is being written, the intent packs' index for
 * settings and the function that opens a setting in Steam.
 * Out: the finished Search tab element, rebuilt only when one of those changes.
 * Can go wrong: nothing; it only wires values into the tab component.
 */
export function useSearchTabPayload({
  active,
  isAsking,
  intentPackIndex,
  onSettingClick,
}: UseSearchTabPayloadArgs): React.ReactElement {
  return useMemo(
    () => <SearchTab active={active} isAsking={isAsking} intentPackIndex={intentPackIndex} onSettingClick={onSettingClick} />,
    [active, isAsking, intentPackIndex, onSettingClick]
  );
}
