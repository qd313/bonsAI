/**
 * Title: The green line under the current tab
 *
 * Purpose: Keeps a 2-point line under the current tab of the tab bar and moves it to the next tab when
 * the tab changes (plan 97 G1, option A). The place is measured from the bar's own layout; the line
 * moves by a transform alone and the glide itself is the stylesheet's transition.
 *
 * Used for: TabIndicatorBar.tsx.
 *
 * Solves: The bar draws the current tab in colour, but until now nothing travelled between tabs, so
 * the eye had to find the new place by itself.
 *
 * Does not: Wait for the glide. A new press moves the line's goal at once and the stylesheet carries
 * it on from wherever it is. The first drawing, and a re-measure after the bar's own size changes,
 * place the line with no glide. Under reduced motion the stylesheet and this hook both make it a jump.
 */
import { useLayoutEffect, useRef } from "react";

import { TAB_BAR_CURRENT_PAD_X_PX, TAB_BAR_MARKER_BASE_PX } from "../../shared/constants";
import { prefersReducedMotion } from "../preset-carousel/presetChipShared";
import { TAB_GLIDE_MS } from "./tabGlide";

/** The CSS variable the stylesheet reads for the line's glide time. */
const MARKER_MS_VAR = "--bonsai-tab-marker-ms";

/**
 * In: the id of the tab showing (the line re-aims when it changes).
 * Out: a ref for the line's element, which must be a child of the bar.
 * Can go wrong: with no layout (a test with no sizes) it places the line at 0, 1 point wide.
 */
export function useTabMarker(currentTab: string): React.RefObject<HTMLElement | null> {
  const markerRef = useRef<HTMLElement | null>(null);
  const placedOnce = useRef(false);
  const lastPlace = useRef("");

  useLayoutEffect(() => {
    const marker = markerRef.current;
    const bar = marker?.parentElement ?? null;
    const current = bar?.querySelector<HTMLElement>(".bonsai-tab-bar__current") ?? null;
    if (!marker || !bar || !current) {
      if (marker) marker.style.opacity = "0";
      return;
    }
    const place = (glide: boolean) => {
      const b = bar.getBoundingClientRect();
      const r = current.getBoundingClientRect();
      const x = r.left - b.left + TAB_BAR_CURRENT_PAD_X_PX;
      const w = Math.max(1, r.width - 2 * TAB_BAR_CURRENT_PAD_X_PX);
      /* Already aimed here (the size watcher's first look): leave a glide in flight alone. */
      if (lastPlace.current === `${x}:${w}`) return;
      lastPlace.current = `${x}:${w}`;
      marker.style.setProperty(MARKER_MS_VAR, glide && !prefersReducedMotion() ? `${TAB_GLIDE_MS}ms` : "0ms");
      marker.style.opacity = "1";
      /*
        The line is TAB_BAR_MARKER_BASE_PX wide in the stylesheet and scaled to the tab's width from
        there, not a 1-point line scaled up: the screen draws a 1-point line as one whole screen pixel
        before scaling it, and on the Deck a point is 1.28 pixels, so the stretched line came out about
        a fifth short of the name's end (the maintainer's screenshots, 2026-10-22).
      */
      marker.style.transform = `translateX(${x}px) scaleX(${w / TAB_BAR_MARKER_BASE_PX})`;
    };
    place(placedOnce.current);
    placedOnce.current = true;
    /* The name's width can change after the first drawing (the font arriving): keep the line on it. */
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(() => place(false));
    watch.observe(current);
    return () => watch.disconnect();
  }, [currentTab]);

  return markerRef;
}
