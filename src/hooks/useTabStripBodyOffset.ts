/**
 * Title: Tab strip body offset hook
 * Purpose: Measure Decky tab strip height and reserve space so tab content is not painted into LB/RB titles.
 * Used for: index.tsx — `.bonsai-scope` layout on gamescope/Bazzite.
 * Solves: Crushed or overlapping tab body when TabContentsScroll bleeds into the strip row. With bonsAI's
 *         own tab bar in its box, the gap under it is 4 points; with the bar in Steam's strip at the top of
 *         the panel (plan 84 step 6), Decky's own gap above bonsAI's box is that 4, and the body starts at
 *         the box's top (no reserve).
 * Does not: Pin QAM host height — see useQamPanelHeightGuard.
 */
import { useLayoutEffect } from "react";
import { TAB_STRIP_BODY_GAP_PX } from "../features/unified-input/constants";
import { subscribeDeckyHeader, topStripActive } from "../features/chat-title/deckyHeaderShape";
import { syncTabBodyViewportHeight } from "../utils/tabBodyViewport";

const CRUSHED_SCOPE_MAX_PX = 160;
const STRIP_BOTTOM_STABLE_MIN_PX = 48;
const STRIP_BOTTOM_STABLE_MAX_PX = 56;
const SETTLE_MAX_ATTEMPTS = 16;

/**
 * Decky Tabs on Bazzite gamescope can paint TabContentsScroll into the LB/RB strip.
 * Measure tab leaf bottoms vs tabs root and reserve space via `--bonsai-tab-strip-reserve`.
 * When the strip row already occupies document flow, do not reserve strip height again.
 */
export function useTabStripBodyOffset(scopeRef: React.RefObject<HTMLDivElement | null>): void {
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const apply = (attempt = 0): boolean => {
      const scopeH = scope.getBoundingClientRect().height;
      const tabsRoot = scope.querySelector<HTMLElement>(".bonsai-decky-tabs-root");
      const tabContents = tabsRoot?.querySelector<HTMLElement>('[class*="TabContentsScroll"]');
      const leaves = Array.from(scope.querySelectorAll<HTMLElement>(".bonsai-tab-title-leaf"));

      if (!tabsRoot || !tabContents || leaves.length === 0 || scopeH < CRUSHED_SCOPE_MAX_PX) {
        return false;
      }

      // Plan 84 step 6: the bar is in Steam's strip, above Decky's bar; Decky's 4-point gap is the gap.
      if (topStripActive()) {
        tabsRoot.style.setProperty("--bonsai-tab-strip-reserve", "0px");
        syncTabBodyViewportHeight(scope);
        return true;
      }

      // Plan 30: with our own tab bar mounted, Steam's header is display:none and there is nothing
      // here to measure — the leaves read 0, the "stable strip" test can never pass, and without
      // this the hook spent 16 frames per pointer move before its fallback wrote the same 4px.
      // The measuring path below stays for a scope without the bar (the Bazzite overlap it was
      // written for is UNKNOWN on this hardware and there is no device to re-measure it on).
      if (scope.querySelector(".bonsai-tab-bar")) {
        tabsRoot.style.setProperty("--bonsai-tab-strip-reserve", `${TAB_STRIP_BODY_GAP_PX}px`);
        syncTabBodyViewportHeight(scope);
        return true;
      }

      const tabsRootRect = tabsRoot.getBoundingClientRect();
      let stripBottomRel = 0;
      for (const leaf of leaves) {
        const r = leaf.getBoundingClientRect();
        stripBottomRel = Math.max(stripBottomRel, r.bottom - tabsRootRect.top);
      }

      const stripStable =
        stripBottomRel >= STRIP_BOTTOM_STABLE_MIN_PX &&
        stripBottomRel <= STRIP_BOTTOM_STABLE_MAX_PX;

      if (!stripStable && attempt < SETTLE_MAX_ATTEMPTS) {
        return false;
      }

      // Measure natural layout without our reserve so we do not double-count an in-flow strip row.
      tabsRoot.style.setProperty("--bonsai-tab-strip-reserve", "0px");
      void tabContents.offsetHeight;

      const naturalContentTopRel = tabContents.getBoundingClientRect().top - tabsRootRect.top;
      const overlapsStrip = naturalContentTopRel < stripBottomRel - 2;
      const reservePx = overlapsStrip
        ? Math.ceil(stripBottomRel + TAB_STRIP_BODY_GAP_PX)
        : Math.max(0, TAB_STRIP_BODY_GAP_PX);
      tabsRoot.style.setProperty("--bonsai-tab-strip-reserve", `${reservePx}px`);

      if (stripStable) {
        scope.classList.add("bonsai-qam-strip-stable");
      }

      syncTabBodyViewportHeight(scope);
      return true;
    };

    let raf = 0;
    let settleRaf = 0;

    const scheduleSettle = (attempt = 0) => {
      cancelAnimationFrame(settleRaf);
      settleRaf = requestAnimationFrame(() => {
        if (apply(attempt)) return;
        if (attempt < SETTLE_MAX_ATTEMPTS) {
          scheduleSettle(attempt + 1);
        }
      });
    };

    scheduleSettle();

    const onPointer = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => apply(SETTLE_MAX_ATTEMPTS));
    };
    scope.addEventListener("pointerenter", onPointer);
    scope.addEventListener("pointermove", onPointer, { passive: true });
    /* Decky's bar changed shape (the bar moved into the strip or back, or a tab's shape): again, now. */
    const stopHeader = subscribeDeckyHeader(() => apply(SETTLE_MAX_ATTEMPTS));

    return () => {
      stopHeader();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(settleRaf);
      scope.removeEventListener("pointerenter", onPointer);
      scope.removeEventListener("pointermove", onPointer);
    };
  }, [scopeRef]);
}
