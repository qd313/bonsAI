/**
 * Title: The plugin's own tab bar
 *
 * Purpose: Draws the thin bar that replaced Steam's own tab strip at the
 * top of the plugin, as plan 84's design "T3" in plan 87 F4's fixed order:
 * every tab, always in the strip's own order, Main at the far left and
 * About at the far right and nothing wrapping round. The current tab is
 * drawn as its icon and name at its own place in the row, every other tab
 * as a small dimmed icon (the tabs before it on its left, the tabs after
 * it on its right), and LB and RB marks sit at the two ends. LB and RB
 * still wrap round (LB on Main goes to About); only the drawing stays put. LB and RB are dim until
 * the D-pad's ring is on the bar; then the whole bar wears the ring and
 * the marks light up. Nothing drops down from it.
 *
 * Used for: The plugin's main screen, while Steam's own original tab row
 * is hidden: drawn by bonsAI's title view in Steam's strip at the very
 * top (plan 84 step 6, TitleTabStrip.tsx), or above the tab body in
 * bonsAI's own box when Decky's bar could not be reshaped for it. It
 * draws only from its props, so it does not care which holds it.
 *
 * Solves: Steam's own tab strip took up a lot of vertical room and never
 * showed a tab's name, only its icon. This bar is 20 points tall, always
 * names the current tab, and shows where each shoulder press would go.
 * Steam's hidden strip still has its own buttons sitting invisibly in the
 * D-pad's path, so this bar also takes over: left and right, or the
 * shoulder buttons, switch tabs; pressing down hands focus into the tab
 * body; pressing up is left to Steam (or holds still, at the very top of
 * the panel); and anything that would have landed
 * on one of Steam's hidden buttons is caught and bounced back here
 * instead. On touch, a tap on LB or RB steps one tab and a tap on a side
 * icon opens that tab.
 *
 * Does not: Actually switch which tab is showing — that is the plugin
 * shell's job; this bar only asks for the switch. It also keeps no open
 * or closed state of its own: the drop-down strip of tab icons it used to
 * open was deleted in plan 84 step 4, because its fade could freeze part
 * way and leave a ghost of it over the chip row.
 */
import React, { useEffect, useRef } from "react";
import { Focusable } from "@decky/ui";

import { TAB_BAR_CURRENT_ICON_PX, TAB_BAR_SIDE_ICON_PX } from "../unified-input/constants";
import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { registerModalReturnFocusOwner } from "./modalReturnFocusRegistry";
import { buildTabBarNavHandlers, neighbourTab, tabBarSides } from "./tabBarNav";
import { BONSAI_TAB_SHORT_NAMES, bonsaiTabBarIcon, type BonsaiTabId } from "./tabTitles";

export type TabIndicatorBarProps = {
  /** The mounted tabs in strip order — five without Developer, six with. */
  tabIds: readonly BonsaiTabId[];
  /** `currentTab` from the plugin shell. An id that is not mounted lights nothing. */
  currentTab: string;
  /** The shell's `selectTab`: sets the tab and clears the post-picker lock. */
  selectTab: (id: string) => void;
  /** Hand the ring to the current tab's first stop; true when it moved. */
  exitDown: () => boolean;
  /** Up holds still instead of being left to Steam (the bar at the very top, plan 84 step 6). */
  upHolds?: boolean;
  /** An extra class on the bar (where it is drawn: `bonsai-tab-bar--strip` in Decky's bar). */
  className?: string;
};

/**
 * In: the list of tabs actually mounted right now, which one is current,
 * the function that switches tabs, and a function to hand focus down
 * into the tab body.
 * Out: the finished bar.
 * Can go wrong: the bar is one D-pad stop, and its taps are plain spans
 * with no tabindex; giving one of them a Focusable or a tabindex of its
 * own would put a second stop inside the bar that Left and Right could
 * never leave. It is a stop at all only because of `focusable: true`.
 *
 * 1. Works out which tab is current, its name, and which tabs go on each
 *    side (tabBarSides: the ones before it and the ones after it).
 * 2. Registers this bar with two shared registries: one so other code can
 *    hand it focus by name, and one so it gets focus back after a popup
 *    closes.
 * 3. (The trap that catches a D-pad move landing on one of Steam's own
 *    hidden tab buttons and bounces it back to this bar is drawn beside
 *    the tabs root, not here: see useHiddenTabHeaderTrap.)
 * 4. Builds the left/right/up/down and button handlers that do the
 *    switching, from a shared helper.
 * 5. Draws three columns: LB, the tabs (the left side's icons, the current
 *    tab's icon and name, the right side's icons), RB. Each mark and side icon
 *    is a tap target. What it draws depends only on its props, never on
 *    the ring or a tap, so there is nothing that could be left half drawn.
 */
export function TabIndicatorBar({
  tabIds,
  currentTab,
  selectTab,
  exitDown,
  upHolds,
  className,
}: TabIndicatorBarProps): React.ReactElement {
  const current = tabIds.find((id) => id === currentTab);
  const name = current ? BONSAI_TAB_SHORT_NAMES[current] : "";
  const { left, right } = tabBarSides(tabIds, currentTab);

  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("tab-bar", navRef);
    return () => unregisterNavFocus("tab-bar", navRef);
  }, []);

  const handlers = buildTabBarNavHandlers({ tabIds, currentTab, selectTab, exitDown, upHolds });

  /** A tap that opens `id`; a tap on the tab already showing does nothing. */
  const open = (id: string | null) => {
    if (id !== null && id !== currentTab) selectTab(id);
  };

  /** One other tab's icon, its own tap target. */
  const peek = (id: BonsaiTabId) => (
    <span
      key={id}
      className="bonsai-tab-bar__peek"
      data-bonsai-tab={id}
      role="button"
      aria-label={BONSAI_TAB_SHORT_NAMES[id]}
      onClick={() => open(id)}
    >
      {bonsaiTabBarIcon(id, TAB_BAR_SIDE_ICON_PX)}
    </span>
  );

  return (
    <Focusable
      /*
        The return-focus registry is handed this element itself, not a wrapper: `focusOwnerById`
        walks up to the nearest `.Panel.Focusable`, and this is the bar's own (the hidden-header trap the
        deleted saved-chats row met).
      */
      ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("tab-bar", el)}
      className={className ? `bonsai-tab-bar ${className}` : "bonsai-tab-bar"}
      aria-label={name ? `${name} tab` : "Tabs"}
      data-bonsai-tab-bar-tab={current ?? ""}
      {...({
        navRef,
        /*
          Steam treats a Focusable with no focusable children as a container and skips it; the
          bar's children are plain spans, so this marks it as a stop (the deleted saved-chats row
          met this, measured 2026-08-30).
        */
        focusable: true,
        onMoveLeft: handlers.onMoveLeft,
        onMoveRight: handlers.onMoveRight,
        onMoveUp: handlers.onMoveUp,
        onMoveDown: handlers.onMoveDown,
        onButtonDown: handlers.onButtonDown,
      } as Record<string, unknown>)}
    >
      {/*
        The marks are the one on-screen reminder that the shoulder buttons switch tabs. They dim
        unless the ring is on the bar (tabIndicatorBar.ts).
      */}
      <span
        className="bonsai-tab-bar__shoulder bonsai-tab-bar__shoulder--l"
        role="button"
        aria-label="Previous tab"
        onClick={() => open(neighbourTab(tabIds, currentTab, -1))}
      >
        LB
      </span>
      <span className="bonsai-tab-bar__tabs">
        {left.map(peek)}
        <span className="bonsai-tab-bar__current">
          {current ? (
            <span className="bonsai-tab-bar__current-icon" aria-hidden="true">
              {bonsaiTabBarIcon(current, TAB_BAR_CURRENT_ICON_PX)}
            </span>
          ) : null}
          <span className="bonsai-tab-bar__name">{name}</span>
        </span>
        {right.map(peek)}
      </span>
      <span
        className="bonsai-tab-bar__shoulder bonsai-tab-bar__shoulder--r"
        role="button"
        aria-label="Next tab"
        onClick={() => open(neighbourTab(tabIds, currentTab, 1))}
      >
        RB
      </span>
    </Focusable>
  );
}
