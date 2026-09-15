/**
 * Title: Stretching the Main tab so the Ask bar sits at the bottom
 *
 * Purpose: The mockups draw the question box and preset row pinned to the
 * bottom of the panel. On a short conversation, without this file, they
 * would float partway up instead, leaving empty space underneath. This
 * measures the real gap between the Main tab's column and the bottom of
 * the visible panel, and sets that gap as the column's minimum height, so
 * the bottom-pinning has somewhere to pin to.
 *
 * Used for: The Main tab's own column element.
 *
 * Solves: The Ask bar and preset row are already set to stick to the
 * bottom once there is enough height to stick within — the case this file
 * solves only shows up when the conversation is short enough that the
 * content does not fill the panel on its own. The gap cannot be written as
 * a fixed number in the stylesheet: it crosses several of Steam's own
 * layers whose class names change from build to build (see rule 5 in the
 * design notes), so, the same as tabBodyViewport.ts, this measures the
 * real chain of elements on screen instead of guessing a number.
 *
 * Does not: Decide the height of the scrolling panel itself — that is
 * owned by tabBodyViewport.ts. Does not touch width — width always comes
 * from the stylesheet (see rule 6 in the design notes).
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
