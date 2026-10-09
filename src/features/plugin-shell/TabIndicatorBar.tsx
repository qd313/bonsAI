/**
 * Title: The plugin's own tab bar
 *
 * Purpose: Draws the thin bar that replaced Steam's own tab strip at the
 * top of the plugin: a small dash per tab with the current one lit, the
 * current tab's name written out beside them, and shoulder-button marks
 * at each end. While the D-pad's ring is on the bar, the bar itself shows
 * the ring; nothing drops down from it.
 *
 * Used for: The plugin's main screen, drawn above the tab body, while
 * Steam's own original tab row is hidden.
 *
 * Solves: Steam's own tab strip took up a lot of vertical room and never
 * showed a tab's name, only its icon. This bar is much shorter and
 * always names the current tab. Steam's hidden strip still has its own
 * buttons sitting invisibly in the D-pad's path, so this bar also takes
 * over: left and right, or the shoulder buttons, switch tabs; pressing
 * down hands focus into the tab body; pressing up goes to Decky's own
 * Back button; and anything that would have landed on one of Steam's
 * hidden buttons is caught and bounced back here instead.
 *
 * Does not: Actually switch which tab is showing — that is the plugin
 * shell's job; this bar only asks for the switch. It also keeps no open
 * or closed state of its own: the drop-down strip of tab icons it used to
 * open was deleted in plan 84 step 4, because its fade could freeze part
 * way and leave a ghost of it over the chip row.
 */
import React, { useEffect, useRef } from "react";
import { Focusable } from "@decky/ui";

import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { registerModalReturnFocusOwner } from "./modalReturnFocusRegistry";
import { buildTabBarNavHandlers } from "./tabBarNav";
import { BONSAI_TAB_SHORT_NAMES, type BonsaiTabId } from "./tabTitles";
import { useHiddenTabHeaderTrap } from "./useHiddenTabHeaderTrap";

export type TabIndicatorBarProps = {
  /** The mounted tabs in strip order — five without Developer, six with. */
  tabIds: readonly BonsaiTabId[];
  /** `currentTab` from the plugin shell. An id that is not mounted lights nothing. */
  currentTab: string;
  /** The shell's `selectTab`: sets the tab and clears the post-picker lock. */
  selectTab: (id: string) => void;
  /** Hand the ring to the current tab's first stop; true when it moved. */
  exitDown: () => boolean;
};

/**
 * In: the list of tabs actually mounted right now, which one is current,
 * the function that switches tabs, and a function to hand focus down
 * into the tab body.
 * Out: the finished bar.
 * Can go wrong: the bar is one D-pad stop; its marks and dashes are plain
 * spans, which is why it needs `focusable: true` (see below) to be a stop
 * at all.
 *
 * 1. Works out which tab is current and its name.
 * 2. Registers this bar with two shared registries: one so other code can
 *    hand it focus by name, and one so it gets focus back after a popup
 *    closes.
 * 3. Sets up the trap that catches a D-pad move landing on one of
 *    Steam's own hidden tab buttons and bounces it back to this bar
 *    instead — see useHiddenTabHeaderTrap for that half of the fix.
 * 4. Builds the left/right/up/down and button handlers that do the
 *    switching, from a shared helper.
 * 5. Draws the bar: shoulder marks, dashes and the current name. What it
 *    draws depends only on its props, never on the ring or a tap, so
 *    there is nothing that could be left half drawn.
 */
export function TabIndicatorBar({ tabIds, currentTab, selectTab, exitDown }: TabIndicatorBarProps): React.ReactElement {
  const current = tabIds.find((id) => id === currentTab);
  const name = current ? BONSAI_TAB_SHORT_NAMES[current] : "";

  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("tab-bar", navRef);
    return () => unregisterNavFocus("tab-bar", navRef);
  }, []);

  useHiddenTabHeaderTrap();

  const handlers = buildTabBarNavHandlers({ tabIds, currentTab, selectTab, exitDown });

  return (
    <Focusable
      /*
        The return-focus registry is handed this element itself, not a wrapper: `focusOwnerById`
        walks up to the nearest `.Panel.Focusable`, and this is the bar's own (the trap ChatSlotRow
        documents at its ref).
      */
      ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("tab-bar", el)}
      className="bonsai-tab-bar"
      aria-label={name ? `${name} tab` : "Tabs"}
      data-bonsai-tab-bar-tab={current ?? ""}
      {...({
        navRef,
        /*
          Steam treats a Focusable with no focusable children as a container and skips it; the
          bar's children are plain spans, so this marks it as a stop (ChatSlotRow.tsx, measured
          2026-08-30).
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
        The marks are the one on-screen reminder that the shoulder buttons switch tabs. They hide
        (visibility, never display, so nothing shifts) while the chat-slot row holds the ring,
        because there the bumpers cycle slots instead — savedChatSlotsRow.ts.
      */}
      <span className="bonsai-tab-bar__shoulder bonsai-tab-bar__shoulder--l" aria-hidden="true">
        LB
      </span>
      <span className="bonsai-tab-bar__dashes" aria-hidden="true">
        {tabIds.map((id) => (
          <span
            key={id}
            className={`bonsai-tab-bar__dash${id === current ? " bonsai-tab-bar__dash--active" : ""}`}
            data-bonsai-tab={id}
          />
        ))}
      </span>
      <span className="bonsai-tab-bar__name">{name}</span>
      <span className="bonsai-tab-bar__shoulder bonsai-tab-bar__shoulder--r" aria-hidden="true">
        RB
      </span>
    </Focusable>
  );
}
