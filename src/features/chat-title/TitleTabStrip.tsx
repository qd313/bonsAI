/**
 * Title: bonsAI's tab bar, drawn in Steam's strip at the very top of the panel
 *
 * Purpose: Plan 84 step 6 (the drawing's frame "Z"). While Decky's bar is reshaped (deckyHeaderShape.ts),
 * bonsAI's title view draws the tab bar here: the same bar as before (TabIndicatorBar.tsx, step 4's T3,
 * unchanged in look), placed against the top of Decky's title bar, across the panel's whole width, in the
 * 20 points that were Steam's empty strip and the top of Decky's padding. Its routes at the top:
 *
 *     the tab bar (this)    Left/Right, LB/RB: switch tabs (claimed)   Up: holds (nothing above)
 *        | Down: the chat's name on the Main tab; the tab's first stop elsewhere
 *     Decky's back arrow, the chat's name (Main only)
 *
 * Used for: ChatTitleView.tsx, while Decky's bar is reshaped for it (deckyHeaderShape.ts).
 *
 * Solves: The bar sat in bonsAI's own box under Decky's bar and took 24 points of the answer's height.
 * The view is drawn outside bonsAI's box, so the bar's rules come with it (`buildTabBarRules` under the
 * view's own root); the bar does not scale with bonsAI's UI-size setting here, like Decky's bar and the
 * chat's name, because the strip it fills is a fixed 20 points.
 *
 * Does not: Switch tabs or move the ring into a tab itself: both are the plugin root's, handed over through
 * the chat title store (`tabBar`). Does not decide whether the bar is here or in bonsAI's box.
 */
import React, { useCallback } from "react";

import { TabIndicatorBar } from "../plugin-shell/TabIndicatorBar";
import { buildTabBarRules } from "../../styles/sections/tabIndicatorBar";
import { takeChatNameFocus } from "./chatNameNav";
import type { ChatTitleTabBar } from "./chatTitleStore";

/** The bar's own rules under the view's root, then its place in the strip. */
export const TITLE_TAB_STRIP_CSS = `${buildTabBarRules(".bonsai-chat-title")}
.bonsai-chat-title .bonsai-tab-bar.bonsai-tab-bar--strip {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  /* Decky's title type (large, heavy) is not the bar's: every part of the bar sets its own size. */
  font-variant: normal !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  -webkit-text-stroke: 0 transparent !important;
}
`;

/**
 * In: the tab showing and the plugin root's tab bar data. Out: the bar. Down on the Main tab goes to the
 * chat's name, the next thing down; when the name is not drawn (the Main tab has not said which chat is
 * open yet) it goes where the bar's Down always went, the chat's first stop.
 */
export function TitleTabStrip({ tab, bar }: { tab: string | null; bar: ChatTitleTabBar }): React.ReactElement {
  const exitDown = useCallback(() => (tab === "main" && takeChatNameFocus()) || bar.exitDown(), [tab, bar]);
  return (
    <TabIndicatorBar
      tabIds={bar.tabIds}
      currentTab={tab ?? ""}
      selectTab={bar.selectTab}
      exitDown={exitDown}
      upHolds
      className="bonsai-tab-bar--strip"
    />
  );
}
