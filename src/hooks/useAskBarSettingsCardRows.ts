/**
 * Title: Ask bar settings-results card rows
 *
 * Purpose: Everything about how many rows of the settings-search results
 * card can actually fit above the question box, and how the ring gets
 * handed to (and back out of) whichever row is nearest the box.
 *
 * Used for: MainTabUnifiedAskBar.tsx's settings-results card (plan 45 /
 * plan 56 lane E) — the small popover that lists matching Steam settings
 * above the Ask box while a person types one of their names.
 *
 * Solves: Keeps the card's own row-measuring effect, its "last row" nav
 * registration, and its typing-redirect effect together in one place,
 * out of the component body that draws the bar.
 *
 * Does not: Decide whether the card shows at all, or hide it on a tap
 * outside — MainTabUnifiedAskBar.tsx still owns showSettingsCard and the
 * tap-outside effect, since both also need settingsCardClosedForSearch,
 * which lives with the rest of the card's open/closed state.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import {
  registerNavFocus,
  takeNavFocus,
  unregisterNavFocus,
  type NavRefHolder,
} from "../utils/navFocusRegistry";
import { uiGamepadFocusElement } from "../utils/uiDocument";
import { SETTINGS_CARD_TAB_BAR_GAP_PX, settingsCardRowsThatFit } from "./useSteamSettingsSearch";

export type AskBarSettingsCardRowsArgs = {
  filteredSettings: string[];
  unifiedInput: string;
  unifiedInputSurfacePx: number;
  unifiedInputHostRef: React.Ref<HTMLDivElement>;
  focusUnifiedTextField: () => boolean;
  setSettingsCardRowsShown: React.Dispatch<React.SetStateAction<number>>;
};

/*
 * In: the settings-search results, the question text and its measured
 * height, the box's own host ref, the "focus the box" jump function, and
 * the setter for how many rows currently fit.
 * Out: focusSettingsCardLastRow (jump into the row nearest the box),
 * settingsCardRowRefs (one ref per drawn row, for the row map to fill in),
 * settingsCardHostRef (the card's own DOM node), and
 * settingsCardLastRowNavRef (the shared nav node only the last row carries).
 * What can go wrong: the tab bar not being found (an unmounted card, or a
 * test with no `.bonsai-scope` wrapper) falls back to showing everything the
 * cap allows rather than hiding the card outright.
 *
 * 1. Register the card's own "last row" Steam nav node, so a hop into the
 *    card from outside it (the box's own Up, the avatar's Up) can use
 *    Steam's transfer instead of a plain focus() that only moves
 *    activeElement.
 * 2. focusSettingsCardLastRow() tries that transfer first, then falls back
 *    to a plain DOM focus() on the last row's own ref for the frames before
 *    Decky populates the nav node.
 * 3. Typing while the ring sits in the card hands it straight back to the
 *    box, so the list can redraw under the new letter.
 * 4. Measure the real gap between the box's own top edge and the tab bar's
 *    bottom edge, and re-derive how many rows of the card actually fit in
 *    it, every time the result count or the box's own height could have
 *    changed that.
 */
export function useAskBarSettingsCardRows({
  filteredSettings,
  unifiedInput,
  unifiedInputSurfacePx,
  unifiedInputHostRef,
  focusUnifiedTextField,
  setSettingsCardRowsShown,
}: AskBarSettingsCardRowsArgs) {
  /*
   * The settings-results card's own row nearest the box (plan 45 step 3 / plan 56 lane E2): Up
   * from the box has to hand Steam's own ring to it, the same cross-container transfer as
   * focusUnifiedTextField above -- a plain DOM focus() is only safe between siblings inside one
   * Focusable container (the focus law), and this file cannot tell from here whether the card and
   * the box actually share one. Steam's transfer is tried first (registerNavFocus / takeNavFocus,
   * navFocusRegistry.ts) with a DOM `.focus()` on the last row's own ref as the fallback for the
   * frames before Decky populates the nav node -- the same ladder every other cross-container jump
   * in this file uses.
   *
   * The "last" row is whichever one is currently drawn nearest the box -- the card grows upward
   * from the box's own top edge, so that is always the row with the highest index actually shown,
   * not a fixed DOM node. Only that one Button ever carries the navRef prop (see the row map
   * below), so this holder always reflects whichever row is current without re-registering by hand
   * on every keystroke.
   */
  const settingsCardLastRowNavRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("settings-results-card", settingsCardLastRowNavRef);
    return () => unregisterNavFocus("settings-results-card", settingsCardLastRowNavRef);
  }, []);
  const settingsCardRowRefs = useRef<Array<HTMLElement | null>>([]);
  /** The card's own DOM node -- read by the tap-outside effect below to tell a tap on the card
   *  apart from a tap anywhere else. */
  const settingsCardHostRef = useRef<HTMLDivElement | null>(null);
  const focusSettingsCardLastRow = useCallback((): boolean => {
    if (takeNavFocus("settings-results-card")) return true;
    const rows = settingsCardRowRefs.current;
    const last = rows[rows.length - 1];
    if (!last) return false;
    last.focus();
    return true;
  }, []);

  /*
   * Typing while the ring sits in the settings-results card hands it straight back to the box and
   * lets the list redraw under the new letter (plan 45 section 4's "Typing while the highlight is
   * in the card" row). `unifiedInput` only changes through the box's own onChange, so a change here
   * with the ring still inside the card means a key landed on the box while Steam's ring was
   * visually somewhere else -- the same ring/DOM-focus split navFocusRegistry.ts documents at
   * length elsewhere in this file, which is exactly why `uiGamepadFocusElement` (Steam's `.gpfocus`
   * ring, falling back to `activeElement` only when there is no ring at all) is asked rather than a
   * plain `document.activeElement` check.
   */
  const unifiedInputForTypingRedirectRef = useRef(unifiedInput);
  useEffect(() => {
    if (unifiedInputForTypingRedirectRef.current === unifiedInput) return;
    unifiedInputForTypingRedirectRef.current = unifiedInput;
    const ring = uiGamepadFocusElement();
    if (ring?.closest(".bonsai-settings-results-card")) {
      focusUnifiedTextField();
    }
  }, [unifiedInput, focusUnifiedTextField]);

  /*
   * How much room the settings-results card actually has, measured live rather than assumed.
   * Plan 45 was drawn against a 696px panel; measured on the Deck's own 1280x800 screen the panel
   * is 454px, so a flat eight-row card would cover the tab bar. The room is the gap between the
   * question box's own top edge (unifiedInputHostRef -- the card is anchored there, see the render
   * below) and the tab bar's bottom edge, both read through getBoundingClientRect on the real
   * elements rather than any assumed pixel count, minus a 6px clearance kept under the tab bar.
   * Re-measured whenever the result count or the box's own height (it grows as text wraps) could
   * have changed how much of that room is left. Falls back to showing everything the cap allows
   * when the tab bar cannot be found (an unmounted card, or a test with no `.bonsai-scope`
   * wrapper) rather than hiding the card outright.
   */
  useLayoutEffect(() => {
    const boxEl =
      unifiedInputHostRef && typeof unifiedInputHostRef === "object" && "current" in unifiedInputHostRef
        ? (unifiedInputHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    if (!boxEl) return;
    const scope = boxEl.closest(".bonsai-scope");
    const tabBar = scope?.querySelector<HTMLElement>(".bonsai-tab-bar") ?? null;
    if (!tabBar) {
      setSettingsCardRowsShown(filteredSettings.length);
      return;
    }
    const boxTop = boxEl.getBoundingClientRect().top;
    const tabBarBottom = tabBar.getBoundingClientRect().bottom;
    const availableHeightPx = boxTop - tabBarBottom - SETTINGS_CARD_TAB_BAR_GAP_PX;
    setSettingsCardRowsShown(
      settingsCardRowsThatFit(availableHeightPx, filteredSettings.length).shown,
    );
  }, [filteredSettings.length, unifiedInput, unifiedInputSurfacePx, unifiedInputHostRef]);

  return {
    focusSettingsCardLastRow,
    settingsCardRowRefs,
    settingsCardHostRef,
    settingsCardLastRowNavRef,
  };
}
