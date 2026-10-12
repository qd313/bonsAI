/**
 * Title: What draws the Search tab
 *
 * Purpose: Runs while a person has the Search tab open. It builds that screen, the first tab in the strip
 * (left of Main), and hands it what the main plugin screen knows that it needs: whether it is showing,
 * whether an answer is being written, how to look up and open a Steam setting, and how to open a saved chat.
 * It is also where the plugin root's tab switch is handed to the Search tab's own memory (searchJumpStore.ts),
 * so the "Back to where you were" line, B on the Search tab and Y on the Main tab (useSearchShortcut.ts) switch
 * tabs exactly the way a press on the tab bar does, and where the tab the person came from is noted each time Search opens.
 *
 * Used for: The tab bar's always-present Search tab (plan 92, lanes N3 and N3b).
 *
 * Solves: Keeps the Search tab's hand-down from the main plugin screen in one small file, beside the
 * other tabs' payload hooks, so index.tsx only has to list the tab.
 *
 * Does not: Search anything itself; SearchTab and the files beside it do.
 */
import React, { useCallback, useEffect, useMemo, useRef } from "react";

import { SearchTab, type SearchTabProps } from "../../search-tab/SearchTab";
import { noteTabBeforeSearch, registerSearchTabSwitch } from "../../search-tab/searchJumpStore";
import { useSearchShortcut } from "../../search-tab/useSearchShortcut";

export type UseSearchTabPayloadArgs = Omit<SearchTabProps, "onOpenChat"> & {
  /** The tab showing now ("search" while this tab is up). */
  currentTab: string;
  /** The shell's tab switch (a press on the tab bar). */
  selectTab: (tabId: string) => void;
  /** The chat slots' switch: loads a saved chat into the Main tab's transcript. */
  selectSlot: (slotId: string | null) => Promise<void>;
};

/**
 * In: whether Search is the tab showing, whether an answer is being written, the intent packs' index for
 * settings, the function that opens a setting in Steam, the tab showing, the shell's tab switch and the chat
 * slots' switch.
 * Out: the finished Search tab element, rebuilt only when one of those changes.
 * Can go wrong: opening a chat that has gone leaves the Main tab on whatever chat it had; the jump's question is
 * then not found and the Back line does not show.
 */
export function useSearchTabPayload({
  active,
  isAsking,
  intentPackIndex,
  onSettingClick,
  currentTab,
  selectTab,
  selectSlot,
}: UseSearchTabPayloadArgs): React.ReactElement {
  useEffect(() => registerSearchTabSwitch(selectTab), [selectTab]);
  /* Y on the Main tab opens Search (the shell's own tab switch above, so a folded tab's sections close as on a bar press). */
  useSearchShortcut(currentTab);

  /* The tab before Search, for B: noted when the tab changes to Search, from the tab it changed from. */
  const previous = useRef(currentTab);
  useEffect(() => {
    if (currentTab === "search" && previous.current !== "search") noteTabBeforeSearch(previous.current);
    previous.current = currentTab;
  }, [currentTab]);

  /* A on a chat match: the chat first, so the Main tab is drawn with it already loaded, then the tab. */
  const onOpenChat = useCallback(
    async (slotId: string) => {
      await selectSlot(slotId);
      selectTab("main");
    },
    [selectSlot, selectTab],
  );

  return useMemo(
    () => (
      <SearchTab
        active={active}
        isAsking={isAsking}
        intentPackIndex={intentPackIndex}
        onSettingClick={onSettingClick}
        onOpenChat={onOpenChat}
      />
    ),
    [active, isAsking, intentPackIndex, onSettingClick, onOpenChat],
  );
}
