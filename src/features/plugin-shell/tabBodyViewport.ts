/**
 * Title: Tab body viewport sync
 * Purpose: Pin TabContentsScroll height via --bonsai-tab-body-height so overflow scroll works on gamescope.
 * Used for: useTabStripBodyOffset, useQamPanelHeightGuard, and tab layout hooks.
 * Solves: Flex-only layouts that fail to constrain Decky Tabs subtree scroll range.
 * Does not: Reserve LB/RB strip space — see useTabStripBodyOffset.
 */
const MIN_BODY_PX = 120;
const CRUSHED_SCOPE_MAX_PX = 160;

/**
 * Pin TabContentsScroll to a measured viewport height so scrollHeight > clientHeight when content overflows.
 * Flex alone does not constrain Decky's Tabs subtree on gamescope.
 */
export function syncTabBodyViewportHeight(scope: HTMLElement): boolean {
  const scopeRect = scope.getBoundingClientRect();
  const scopeH = scopeRect.height;
  if (scopeH < CRUSHED_SCOPE_MAX_PX) return false;

  const tabContents = scope.querySelector<HTMLElement>(
    '.bonsai-decky-tabs-root [class*="TabContentsScroll"]'
  );
  if (!tabContents) return false;

  const topOffset = Math.max(0, tabContents.getBoundingClientRect().top - scopeRect.top);
  const bodyH = Math.max(MIN_BODY_PX, Math.floor(scopeH - topOffset));
  const next = `${bodyH}px`;
  // Write only on a change: this runs from ResizeObserver callbacks, and a same-value style write
  // still dirties layout, which can feed "ResizeObserver loop" warnings on the Deck.
  if (scope.style.getPropertyValue("--bonsai-tab-body-height") !== next) {
    scope.style.setProperty("--bonsai-tab-body-height", next);
  }
  return true;
}
