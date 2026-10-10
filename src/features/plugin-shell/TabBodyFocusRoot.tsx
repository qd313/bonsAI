/**
 * Title: Tab body focus root
 * Purpose: One `Focusable` around a tab's content that the tab bar can hand the ring to
 *          (Down from the bar) and that hands it back (Up from the tab's first control).
 * Used for: index.tsx, around every tab body except Main, whose first chat stop is already a
 *           registered stop (plan 30 W4, decision D55).
 * Solves: Steam's own way in and out of a tab body passes through its hidden tab button — a stop a
 *         person cannot see (runs/TAB-BAR-W1b-*.json, -W1c-*.json). Registering the body under
 *         `navFocusRegistry` lets both hops skip it: `TakeFocus` on a container focuses within it,
 *         the same call Steam's `Tabs` makes on its own content container.
 *         It also keeps a few lines of clear space above the first heading, so it is not left under the
 *         pane's top fade (plan 87, B9).
 * Does not: Style anything or claim any press but Up at the top; every other move stays with the
 *           controls inside.
 */
import React, { useEffect, useRef } from "react";
import { Focusable } from "@decky/ui";

import { registerNavFocus, unregisterNavFocus, takeNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import type { BonsaiTabId } from "./tabTitles";

/**
 * Clear space above the first thing in a tab, in px. The top of the pane fades over about 20 px (read off
 * screenshots/DeckCapture_20261009_194005_game.png: the letters of the Settings tab's "UI scale" heading go
 * from a fifth to full brightness across their own height), and the first heading sat inside the fade at
 * scroll 0, where no scrolling can take it out. A spacer rather than padding: the plugin's stylesheet pins
 * the pane's children to `padding-top: 0 !important`.
 */
const TAB_BODY_TOP_INSET_PX = 24;

export type TabBodyFocusRootProps = {
  id: BonsaiTabId;
  children: React.ReactNode;
};

export function tabBodyNavFocusId(id: BonsaiTabId): `tab-body:${string}` {
  return `tab-body:${id}`;
}

export function TabBodyFocusRoot({ id, children }: TabBodyFocusRootProps): React.ReactElement {
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    const key = tabBodyNavFocusId(id);
    registerNavFocus(key, navRef);
    return () => unregisterNavFocus(key, navRef);
  }, [id]);

  return (
    <Focusable
      className="bonsai-tab-body-root"
      data-bonsai-tab-body={id}
      {...({
        navRef,
        /*
          Fires when no control inside can move up any further, i.e. from the tab's first stop.
          Returning true claims the move; false would let Steam pick the next thing above, which
          with the header hidden is the ghost. The trap would bounce it, but a hop that never lands
          on the ghost is better than one that visits it.
        */
        onMoveUp: () => takeNavFocus("tab-bar"),
      } as Record<string, unknown>)}
    >
      <div
        aria-hidden="true"
        data-bonsai-tab-body-inset=""
        style={{ height: `${TAB_BODY_TOP_INSET_PX}px`, flex: "0 0 auto" }}
      />
      {children}
    </Focusable>
  );
}
