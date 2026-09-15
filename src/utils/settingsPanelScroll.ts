/**
 * Title: What "Up" should do at the top of a scrolled Settings section
 *
 * Purpose: On the Settings and Ollama tabs, some sections are taller than the screen and scroll.
 * When a person moving the controller's highlight upward reaches the top control in a scrolled
 * section, pressing Up should not do nothing — it should first reveal more of the section above,
 * and once there is nothing left to reveal, hand the highlight to the tab strip along the top.
 * This file is that chain of fallbacks.
 *
 * Used for: the Settings and Ollama tabs' upward D-pad handling at the top of a scrolled section.
 *
 * Solves: without this, reaching "up" at the top of a long scrolled section either does nothing
 * (the content above stays hidden) or jumps straight past the tab strip.
 *
 * Does not: decide which control is "previous" within one section — each section lists its own
 * explicit chain of stops and hands this file a `focusPrev` callback for that. This file only
 * adds what happens once that chain runs out.
 *
 * How it works: `tryMoveUpWithPanelScroll()` tries, in order: scroll the section up a little; if
 * that does not move it (it was already effectively at the top), snap it fully to the top as a
 * fallback, in case it was still very slightly scrolled; if there was nowhere left to scroll at
 * all, try the section's own `focusPrev` chain; and only if none of those apply, move the
 * highlight to the currently active tab title in the LB/RB strip.
 */
import { findScrollablePanel, tryScrollPanelFromAnchor } from "./chatPanelScroll";
import { getUiDocument } from "./uiDocument";

/** Snap the tab scroll container to the top (reveals content directly under the LB/RB strip). */
function tryScrollPanelToTop(anchor: HTMLElement | null): boolean {
  const scroll = findScrollablePanel(anchor);
  if (!scroll || scroll.scrollTop <= 0) return false;
  const before = scroll.scrollTop;
  scroll.scrollTop = 0;
  return scroll.scrollTop < before;
}

/** Move focus to the active tab title in the LB/RB strip when scroll is already at top. */
function tryFocusActiveTabStrip(anchor: HTMLElement | null): boolean {
  const scope = anchor?.closest(".bonsai-scope") ?? getUiDocument().querySelector(".bonsai-scope");
  const activeTab = scope?.querySelector<HTMLElement>(
    '.bonsai-decky-tabs-root .Panel.Focusable.Active, .bonsai-decky-tabs-root .DialogButton.Active, .bonsai-decky-tabs-root .DialogButton.active',
  );
  if (!activeTab) return false;
  activeTab.focus();
  return true;
}

/** Focus the previous control in the graph, scroll to top, step up, then focus the tab strip. */
export function tryMoveUpWithPanelScroll(
  anchor: HTMLElement | null,
  focusPrev?: () => boolean,
): boolean {
  const scroll = findScrollablePanel(anchor);
  const before = scroll?.scrollTop ?? 0;
  if (scroll && before > 0 && tryScrollPanelFromAnchor(anchor, "up", 120)) {
    return true;
  }
  if (tryScrollPanelToTop(anchor)) return true;
  if (focusPrev?.()) return true;
  return tryFocusActiveTabStrip(anchor);
}
