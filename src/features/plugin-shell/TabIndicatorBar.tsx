/**
 * Title: The plugin's own tab bar
 *
 * Purpose: Draws the thin bar that replaced Steam's own tab strip at the
 * top of the plugin: a small dash per tab with the current one lit, the
 * current tab's name written out beside them, and shoulder-button marks
 * at each end. While this bar has the D-pad's focus, it also opens a
 * fuller strip that floats over the panel showing every tab as an icon
 * and a label, so a person can see where each shoulder-button press
 * would take them before pressing it.
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
 * shell's job; this bar only asks for the switch. It also does not keep
 * the fuller strip open on a timer — it is open exactly while this bar
 * holds the D-pad's focus, or while someone has tapped it open by hand.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Focusable } from "@decky/ui";

import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { getUiDocument } from "../../utils/uiDocument";
import { registerModalReturnFocusOwner } from "./modalReturnFocusRegistry";
import { buildTabBarNavHandlers } from "./tabBarNav";
import {
  BONSAI_TAB_SHORT_NAMES,
  bonsaiTabStripIcon,
  bonsaiTabStripLabel,
  type BonsaiTabId,
} from "./tabTitles";
import { isElementLike, useHiddenTabHeaderTrap } from "./useHiddenTabHeaderTrap";

/**
 * Is `target` inside `root`? Exported so its own test can construct both nodes directly rather than
 * through a render: `root` and `target` both come from the QuickAccess popup document in production,
 * a different realm than this module's own (SharedJSContext), and a normal jsdom render cannot
 * reproduce that split -- React needs `root` and its descendants in the same document to begin with,
 * which is exactly what makes them the same realm there. Duck-typed the same way as
 * `useHiddenTabHeaderTrap.ts`'s `isElementLike`, and for the same reason: `instanceof Node` is false
 * for a node born in a different realm than the one asking.
 */
/**
 * In: the bar's own root element, and whatever a pointer press landed on.
 * Out: true if the press landed inside the bar (or its open strip).
 * Can go wrong: nothing once the element check above it passes; a target
 * that is not really an element (rare, but possible for some events)
 * safely reads as outside rather than throwing.
 */
export function isPointerInsideTabBar(root: HTMLElement | null, target: EventTarget | null): boolean {
  return !!root && isElementLike(target) && root.contains(target);
}

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
 * Out: the finished bar, plus the floating strip that opens over it.
 * Can go wrong: the bar has to be the one D-pad stop for both itself and
 * the strip together — the strip's own cells are not separate stops, only
 * plain elements a pointer can tap — so a change that tries to make a
 * strip cell focusable on its own would conflict with how this component
 * reads open/closed state.
 *
 * 1. Works out which tab is current and its name for the thin bar; the
 *    open strip's own per-cell word (plan 59) comes from a fixed table,
 *    the same standing word whether five or six tabs are mounted.
 * 2. Tracks whether the floating strip is open, which can happen two
 *    ways that both count: the bar has the D-pad's focus, or someone
 *    tapped it open by hand. Either one is enough; both are watched
 *    separately and combined.
 * 3. Registers this bar with two shared registries: one so other code can
 *    hand it focus by name, and one so it gets focus back after a popup
 *    closes.
 * 4. Sets up the trap that catches a D-pad move landing on one of
 *    Steam's own hidden tab buttons and bounces it back to this bar
 *    instead — see useHiddenTabHeaderTrap for that half of the fix.
 * 5. While the strip is open by tap (not by focus), listens for a press
 *    anywhere else on screen and closes it — but only outside the bar
 *    and strip themselves, checked by walking the actual element tree
 *    rather than by name, because elements from Steam's own popup layer
 *    do not compare equal the normal way.
 * 6. Builds the actual left/right/up/down and button handlers that do
 *    the switching, from a shared helper so the rules match whatever
 *    other code also drives this bar.
 * 7. A tap on the thin bar itself opens the strip; a tap on one of the
 *    strip's own cells switches straight to that tab and closes the
 *    strip again.
 * 8. Draws the bar (shoulder marks, dashes, the current name) and, after
 *    it, the floating strip — always present in the markup so opening
 *    and closing is a fade rather than something mounting and
 *    unmounting, with the closed strip kept out of hit-testing.
 */
export function TabIndicatorBar({ tabIds, currentTab, selectTab, exitDown }: TabIndicatorBarProps): React.ReactElement {
  const current = tabIds.find((id) => id === currentTab);
  const name = current ? BONSAI_TAB_SHORT_NAMES[current] : "";

  /*
    Two ways to be open, no timer (plan 30 § 4.3). `focusOpen` is true exactly while the bar's
    Focusable has the ring: Steam sets DOM focus on a `focusable` Focusable, which is what makes
    onFocus/onBlur fire — the chat-slot row relies on the same pair, measured 2026-09-02.
    `touchOpen` is a tap on the thin bar; a tap on a cell or anywhere else closes it, and taking
    the ring closes it too, because the ring is then the truth.
  */
  const [focusOpen, setFocusOpen] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const open = focusOpen || touchOpen;

  const rootRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("tab-bar", navRef);
    return () => unregisterNavFocus("tab-bar", navRef);
  }, []);

  /*
    Closing is a CSS fade (opacity, then `visibility: hidden` after a delay -- tabIndicatorBar.ts's
    own transition rule), and that fade is the only thing that ever puts the strip fully out of
    sight. A CSS transition is driven by the browser's own animation clock, and that clock is
    exactly the kind of thing a background/occluded frame gets throttled or paused on -- both
    reported sightings of the ghost (2026-09-07 and once before) were with a game running full
    screen, which is when the overlay is most likely to be treated as not the visible surface even
    though it is drawn on top. If the fade is ever paused mid-flight, nothing ever un-pauses it, so
    the strip sits forever at whatever partial opacity the clock stopped on -- a person can see the
    chip row through it, which is the ghost this bug reports. A plain timer is not tied to that
    clock the same way, so it still fires and can force the end state even if the transition never
    finished on its own. It never fires while `open`, so it never fights the fade in.
  */
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    if (open) {
      // Reopening: drop any forced-closed override from a previous close so the CSS classes (the
      // fade in, and `pointer-events: auto` while open) govern the strip again.
      strip.style.removeProperty("opacity");
      strip.style.removeProperty("visibility");
      strip.style.removeProperty("pointer-events");
      return;
    }
    // 200ms: a margin over the 120ms opacity fade in tabIndicatorBar.ts, generous enough that a
    // healthy fade always finishes first and this is a no-op in the common case.
    const settle = window.setTimeout(() => {
      strip.style.setProperty("opacity", "0");
      strip.style.setProperty("visibility", "hidden");
      strip.style.setProperty("pointer-events", "none");
    }, 200);
    return () => window.clearTimeout(settle);
  }, [open]);

  useHiddenTabHeaderTrap();

  /*
    One `pointerdown` listener on the UI document while a tap holds the strip open, removed the
    moment it closes. Capture phase, so a tap on something that stops propagation still closes it.

    `evt.target` is a node from the QuickAccess popup document, and this module runs in
    SharedJSContext -- two different realms, each with its own `Node` constructor -- so
    `evt.target instanceof Node` was always false and every pointerdown closed the strip
    immediately, including one landing inside it. Same bug as useHiddenTabHeaderTrap.ts
    (runs/TAB-BAR-11-a-after-suspend-resume-hidden-button.json), same fix: duck-type instead
    (isPointerInsideTabBar above).
  */
  useEffect(() => {
    if (!touchOpen) return;
    const doc = getUiDocument();
    const onPointerDown = (evt: Event) => {
      if (isPointerInsideTabBar(rootRef.current, evt.target)) return;
      setTouchOpen(false);
    };
    doc.addEventListener("pointerdown", onPointerDown, true);
    return () => doc.removeEventListener("pointerdown", onPointerDown, true);
  }, [touchOpen]);

  const handlers = buildTabBarNavHandlers({ tabIds, currentTab, selectTab, exitDown });

  const onRootClick = useCallback(() => {
    // A tap on the thin bar opens it. While the ring is on the bar it is open already, and A is
    // deliberately a no-op there (Left/Right did the switching), so the click changes nothing.
    if (!focusOpen) setTouchOpen(true);
  }, [focusOpen]);

  const onCellClick = useCallback(
    (id: BonsaiTabId) => (evt: React.MouseEvent) => {
      evt.stopPropagation();
      selectTab(id);
      setTouchOpen(false);
    },
    [selectTab],
  );

  return (
    <Focusable
      /*
        The return-focus registry is handed this element itself, not a wrapper: `focusOwnerById`
        walks up to the nearest `.Panel.Focusable`, and this is the bar's own (the trap ChatSlotRow
        documents at its ref).
      */
      ref={(el: HTMLElement | null) => {
        rootRef.current = el;
        registerModalReturnFocusOwner("tab-bar", el);
      }}
      className={`bonsai-tab-bar${open ? " bonsai-tab-bar--open" : ""}`}
      aria-label={name ? `${name} tab` : "Tabs"}
      data-bonsai-tab-bar-state={open ? "open" : "rest"}
      data-bonsai-tab-bar-tab={current ?? ""}
      onFocus={() => {
        setFocusOpen(true);
        setTouchOpen(false);
      }}
      onBlur={() => setFocusOpen(false)}
      onClick={onRootClick}
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
        because there the bumpers cycle slots instead — section-6.ts, same rule as Steam's hints.
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
      {/*
        The open strip: absolutely positioned over the panel, so nothing below moves (plan 30
        § 4.2). Always in the markup so opening and closing are a fade, never a mount; visibility
        keeps a closed strip out of hit-testing. The cells are not focus stops — the bar is the
        one stop and the lit cell is state — so they are plain elements for touch only.
      */}
      <div
        ref={stripRef}
        className={`bonsai-tab-bar__strip${open ? " bonsai-tab-bar__strip--open" : ""}`}
        aria-hidden={!open}
      >
        <span className="bonsai-tab-bar__shoulder bonsai-tab-bar__shoulder--l" aria-hidden="true">
          LB
        </span>
        {tabIds.map((id) => (
          <div
            key={id}
            role="button"
            tabIndex={-1}
            className={`bonsai-tab-bar__cell${id === current ? " bonsai-tab-bar__cell--active" : ""}`}
            data-bonsai-tab={id}
            onClick={onCellClick(id)}
          >
            <span className="bonsai-tab-bar__cell-icon" aria-hidden="true">
              {bonsaiTabStripIcon(id)}
            </span>
            <span className="bonsai-tab-bar__cell-label">{bonsaiTabStripLabel(id)}</span>
          </div>
        ))}
        <span className="bonsai-tab-bar__shoulder bonsai-tab-bar__shoulder--r" aria-hidden="true">
          RB
        </span>
      </div>
    </Focusable>
  );
}
