/**
 * Title: The plugin root's side of the tab bar in Steam's strip
 *
 * Purpose: Plan 84 step 6 draws the tab bar in bonsAI's title view in Decky's bar, which the plugin root
 * cannot hand props to. This hook hands it over through the chat title store instead: the tab showing,
 * the mounted tabs, the tab switch and Down into a tab. It also gives Decky's bar its second chance to be
 * reshaped (bonsAI's box mounting after bonsAI's title view did), and says whether the bar is in the
 * strip, so the root draws it in bonsAI's own box only when it is not.
 *
 * Used for: index.tsx (`Content`).
 *
 * Solves: The bar must be drawn in exactly one place, and the root must not wait a frame to know which:
 * the answer is the reshape's own state (`useTopStripActive`), which the title view sets before the
 * first paint.
 *
 * Does not: Reshape Decky's bar itself when the title view is not there (deckyHeaderShape.ts finds every
 * part from the title view's root). Does not draw anything.
 */
import { useEffect, useLayoutEffect, useRef } from "react";

import { tabBodyNavFocusId } from "../plugin-shell/TabBodyFocusRoot";
import type { BonsaiTabId } from "../plugin-shell/tabTitles";
import { takeNavFocus } from "../../utils/navFocusRegistry";
import { clearTabBar, publishTabBar, setChatTitleTab, takeChatFirstStop } from "./chatTitleStore";
import { notifyDeckyHeaderChanged, syncDeckyHeaderShape, useTopStripActive } from "./deckyHeaderShape";

/**
 * Down from the tab bar into the tab showing: on Main the chat's first stop (or the question box), by the
 * Main tab's own action; every other tab's body is a registered nav node (TabBodyFocusRoot). True when the
 * ring moved.
 */
export function tabBarExitDownFor(tab: string): boolean {
  return tab === "main" ? takeChatFirstStop() : takeNavFocus(tabBodyNavFocusId(tab as BonsaiTabId));
}

export type UseTopStripTabBarArgs = {
  /** The tab showing. */
  tab: string;
  /** The mounted tabs in the bar's order. */
  tabIds: readonly BonsaiTabId[];
  /** The plugin shell's tab switch. */
  selectTab: (id: string) => void;
  /** Down from the bar into the tab showing. */
  exitDown: () => boolean;
  /** bonsAI's UI-size generation: an Apply rebuilds the tabs, and the height lock re-measures. */
  generation: number;
};

/**
 * In: the tab bar's data. Out: true while the bar is drawn in Steam's strip (by the title view), so the
 * caller draws it in bonsAI's box only when this is false.
 */
export function useTopStripTabBar({ tab, tabIds, selectTab, exitDown, generation }: UseTopStripTabBarArgs): boolean {
  const owner = useRef({}).current;
  /* Layout effects, so the title view knows the tab before the first paint (it hides Decky's arrow off Main). */
  useLayoutEffect(() => setChatTitleTab(tab), [tab]);
  useLayoutEffect(() => publishTabBar(owner, { tabIds, selectTab, exitDown }), [owner, tabIds, selectTab, exitDown]);
  useLayoutEffect(() => () => clearTabBar(owner), [owner]);
  /* bonsAI's box is drawn now: if the title view came first, Decky's bar can be reshaped at last. */
  useLayoutEffect(() => syncDeckyHeaderShape(tab), []); // eslint-disable-line react-hooks/exhaustive-deps -- once, on mounting
  useEffect(() => notifyDeckyHeaderChanged(), [generation]);
  return useTopStripActive();
}
