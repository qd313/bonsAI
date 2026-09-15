/**
 * Title: The tab bar's own D-pad and shoulder-button handling
 *
 * Purpose: The tab bar, when collapsed to its thin strip, handles its own
 * Left/Right and shoulder-button (LB/RB) presses to switch tabs, wrapping
 * around at the first and last tab either way. Down hands the highlight
 * ring off to whatever the current tab shows first; Up is deliberately let
 * through rather than handled, so Steam sends it to Decky's own Back
 * button, the same as it did before the bar collapsed.
 *
 * Used for: The collapsing tab bar (plan 30, week 4).
 *
 * Solves: Two things found by testing on a real Deck. First, the shoulder
 * buttons wrap around at the ends (see runs/TAB-BAR-W3-shoulder-wrap.json:
 * pressing LB while on Main lands on About), so Left/Right have to wrap
 * the same way or the two ways of switching tabs would disagree with each
 * other. Second, the bar sits outside Steam's own tab container, so Steam
 * never even sees a shoulder button press while the ring is sitting on the
 * bar — the bar has to switch tabs itself rather than letting Steam do it.
 *
 * Does not: Move the highlight ring between different parts of the screen
 * itself. For Down, it calls a handover function the caller supplies, the
 * same way presetRowNav.ts hands a ring off elsewhere.
 */
import { isBumperLeftDeckEvent, isBumperRightDeckEvent } from "../../utils/focusNavigation";

export type TabBarNavHandlers = {
  onMoveLeft: () => boolean;
  onMoveRight: () => boolean;
  onMoveUp: () => boolean;
  onMoveDown: () => boolean;
  /** LB / RB switch tabs; everything else falls through. */
  onButtonDown: (evt: unknown) => boolean;
};

export type BuildTabBarNavHandlersArgs = {
  /** The mounted tabs in strip order. */
  tabIds: readonly string[];
  currentTab: string;
  /** The shell's `selectTab` — never Steam's `onShowTab`, which carries the post-picker lock. */
  selectTab: (id: string) => void;
  /** Hand the ring to the current tab's first stop; true when it moved. */
  exitDown: () => boolean;
};

/**
 * The tab `step` places away from `currentTab`, wrapping at both ends. An unknown current tab
 * (a stale id, or nothing mounted yet) resolves to the first tab so a press still lands somewhere
 * visible; an empty list resolves to null.
 */
export function neighbourTab(tabIds: readonly string[], currentTab: string, step: -1 | 1): string | null {
  if (tabIds.length === 0) return null;
  const index = tabIds.indexOf(currentTab);
  if (index < 0) return tabIds[0];
  return tabIds[(index + step + tabIds.length) % tabIds.length];
}

/**
 * Returning `true` claims the press; `false` lets Steam's own navigation decide.
 *
 * Left and Right always claim: sideways there is nothing of ours to reach, and Steam's answer for
 * "left of the plugin" is the Quick Access rail, which walks the user out by accident (the same
 * lesson presetRowNav.ts records). Up returns false on purpose so Steam takes the ring to Decky's
 * Back button, as it did from the strip. Down claims only when the handover moved the ring; when
 * it did not, Steam's spatial navigation runs and the hidden-header trap catches a landing on the
 * ghost.
 */
export function buildTabBarNavHandlers(args: BuildTabBarNavHandlersArgs): TabBarNavHandlers {
  const { tabIds, currentTab, selectTab, exitDown } = args;
  const step = (dir: -1 | 1): boolean => {
    const next = neighbourTab(tabIds, currentTab, dir);
    if (next !== null && next !== currentTab) selectTab(next);
    return true;
  };
  return {
    onMoveLeft: () => step(-1),
    onMoveRight: () => step(1),
    onMoveUp: () => false,
    onMoveDown: () => exitDown(),
    onButtonDown: (evt) => {
      if (isBumperLeftDeckEvent(evt)) return step(-1);
      if (isBumperRightDeckEvent(evt)) return step(1);
      return false;
    },
  };
}
