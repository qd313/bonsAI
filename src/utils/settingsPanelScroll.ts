/**
 * Title: Settings panel scroll helpers
 * Purpose: Scroll settings tab panel to top and coordinate up-navigation with tab strip focus.
 * Used for: SettingsTab and OllamaTab D-pad onMoveUp chains at panel boundaries.
 * Solves: Escape clipped settings content and return focus to LB/RB tab titles at scroll top.
 * Does not: Define per-row focus graphs — section parents list explicit focus stops.
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
