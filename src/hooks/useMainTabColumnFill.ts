/**
 * Title: Main tab column fill
 * Purpose: Give the Main tab column a measured min-height that reaches the QAM scroll viewport's
 *          bottom edge, so the preset/Ask dock can pin to the panel bottom via `margin-top: auto`.
 * Used for: MainTab's `.bonsai-main-tab-column` wrapper.
 * Solves: A short transcript left dead space under the Ask bar (the mockups draw it bottom-pinned).
 *         The dock is sticky as well, so this only matters while the content does NOT overflow —
 *         which is exactly the case the old scrollHeight-based measurement got wrong.
 *         The offset between the scroll viewport and the column cannot be a CSS constant: it
 *         crosses Steam wrappers whose classes are hashed (design-language.md Rule 5), so like
 *         tabBodyViewport.ts this measures the real chain instead of guessing.
 * Does not: Size the scroll viewport itself — tabBodyViewport.ts owns --bonsai-tab-body-height;
 *           or touch width (design-language.md Rule 6: width comes from CSS).
 */
import { useLayoutEffect } from "react";

/** Matches on-device: the hashed name keeps the "TabContentsScroll" substring (design-language.md). */
const SCROLL_CONTAINER_SELECTOR = '[class*="TabContentsScroll"]';
/** Below this the pane is crushed/mid-relayout (same idea as tabBodyViewport's guards) — skip. */
const MIN_FILL_PX = 120;
/**
 * Sanity bound on the measured chrome below the column. Anything larger is a mis-measure (a
 * mid-relayout frame, a collapsed wrapper) and is ignored rather than subtracted.
 */
const MAX_CHROME_BELOW_PX = 200;

const MAIN_COLUMN_MIN_HEIGHT_VAR = "--bonsai-main-column-min-height";

/**
 * Space below the column that still belongs to the scroll content: every wrapper's bottom margin
 * on the way up, each wrapper's own bottom padding, and finally the scrollport's.
 *
 * The first version read this as `scroll.scrollHeight - columnBottom`, which is wrong whenever the
 * content does NOT overflow: `scrollHeight` is floored at `clientHeight`, so that subtraction
 * returns the *empty space left in the pane* rather than the chrome under the column — and then
 * subtracts it from the fill, which is exactly the space the fill exists to claim. The column
 * settles wherever it already was and stops short of the bottom. Measured on device 2026-08-30 on
 * the `[+]` slot, whose short transcript is the case that triggers it: the dock floated about 30px
 * clear of the panel's bottom edge there while every populated slot sat flush.
 *
 * Erring low is the safe direction now that the dock is sticky: too tall a column costs a few
 * pixels of scroll and sticky still pins the dock, whereas too short leaves visible dead space.
 */
function measureChromeBelow(column: HTMLElement, scroll: HTMLElement): number {
  let total = 0;
  let el: HTMLElement | null = column;
  while (el && el !== scroll) {
    total += parseFloat(getComputedStyle(el).marginBottom) || 0;
    const parent: HTMLElement | null = el.parentElement;
    if (!parent) return total;
    total += parseFloat(getComputedStyle(parent).paddingBottom) || 0;
    el = parent;
  }
  return total;
}

/**
 * Keeps `--bonsai-main-column-min-height` on the column element equal to the space from the
 * column's top to the scroll viewport's bottom. Steam replaces the scroll node on every tab
 * switch, so the container is re-resolved on every pass rather than held.
 */
export function useMainTabColumnFill(columnRef: React.RefObject<HTMLDivElement | null>): void {
  useLayoutEffect(() => {
    const el = columnRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let raf = 0;
    let observedScroll: Element | null = null;

    const measure = () => {
      const column = columnRef.current;
      if (!column) return;
      const scroll = column.closest(SCROLL_CONTAINER_SELECTOR) as HTMLElement | null;
      if (scroll !== observedScroll) {
        if (observedScroll) ro.unobserve(observedScroll);
        observedScroll = scroll;
        if (scroll) ro.observe(scroll);
      }
      if (!scroll) {
        column.style.removeProperty(MAIN_COLUMN_MIN_HEIGHT_VAR);
        return;
      }

      const scrollRect = scroll.getBoundingClientRect();
      const columnRect = column.getBoundingClientRect();
      /* Distances measured inside the scroll content, so the current scroll position drops out. */
      const topOffset = columnRect.top - scrollRect.top - scroll.clientTop + scroll.scrollTop;
      const chromeBelow = measureChromeBelow(column, scroll);
      const safeChrome = chromeBelow >= 0 && chromeBelow <= MAX_CHROME_BELOW_PX ? chromeBelow : 0;
      const fill = Math.floor(scroll.clientHeight - topOffset - safeChrome);

      if (fill < MIN_FILL_PX) {
        column.style.removeProperty(MAIN_COLUMN_MIN_HEIGHT_VAR);
        return;
      }

      /*
       * Idempotent: with the fill applied, content height is exactly topOffset + fill +
       * chromeBelow == clientHeight, so re-measuring yields the same number and the value stops
       * changing. Writing only on a real change also keeps the observer from re-entering.
       */
      const next = `${fill}px`;
      if (column.style.getPropertyValue(MAIN_COLUMN_MIN_HEIGHT_VAR) !== next) {
        column.style.setProperty(MAIN_COLUMN_MIN_HEIGHT_VAR, next);
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    measure();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [columnRef]);
}
