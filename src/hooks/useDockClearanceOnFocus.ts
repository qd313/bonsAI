/**
 * Title: Dock clearance on focus
 * Purpose: Keep the gamepad-focused element visible above the bottom-pinned preset/Ask dock.
 * Used for: MainTab, on the same column useMainTabColumnFill owns.
 * Solves: Steam scrolls a newly focused element into the PANE, but the dock covers the pane's
 *         bottom ~245px, so a control near the end of a reply (Helpful, Show details, the branch
 *         buttons) took the focus ring while sitting behind the preset chips — recorded on device
 *         2026-08-31. Steam cannot know about the dock; this listens for focus landing under it
 *         and lifts the element clear.
 * Does not: Follow streaming text or deliver the end of an answer — see useStreamScrollPin, which
 *           owns the evidence for why scrollIntoView is tried FIRST (Steam's scroller erased direct
 *           writes while tokens streamed). The direct write is the fallback here, for the one place
 *           scrollIntoView is measured to be a no-op — see liftAboveDock.
 */
import { useEffect, type RefObject } from "react";
import { findTabContentsScroll, panelScrollMax } from "../utils/chatPanelScroll";

const DOCK_SELECTOR = ".bonsai-main-tab-dock";

/** Breathing room between the lifted element and the dock's top edge. */
const CLEARANCE_PAD_PX = 6;

/**
 * Delays for the repeat passes after the first one, counted from the triggering focus event.
 *
 * Used to be a single pass at 150ms. Round 35 (2026-09-05) measured a reply's last paragraph on
 * the device: the margin was written correctly, scrollIntoView was called, and the pane still read
 * scrollTop 0 at ~300ms AND ~900ms after the press — the same paragraph, covered from either
 * direction, by the chips walking down or the question box walking up. One early pass was not
 * catching whatever moves the pane back. The only other place this repo has proof of a scroll
 * getting undone after a correct scrollIntoView call is useStreamScrollPin's post-Ask rebuild,
 * where the fix was the same idea at these same two later delays (`DELIVERY_PASS_DELAYS_MS`,
 * proven on-Deck 2026-08-31 — docs/archive/roadmap-bugs-fixed.md, row CHAT-SLOTS-V3-14). Reusing
 * that schedule here rather than inventing a new one: it is the one timing this repo has already
 * seen win against this device's behaviour. Every pass re-measures and only scrolls if the element
 * is still covered, so a pass that finds nothing to do costs nothing.
 */
const SETTLE_PASS_DELAYS_MS = [150, 300, 900];

/**
 * The lift itself, exported for tests. Returns true when it scrolled.
 *
 * `block: "end"` is deliberate: to the browser an element behind the dock is already fully inside
 * the scrollport, so `"nearest"` would measure it as visible and do nothing. `scroll-margin-bottom`
 * carries the dock's covered strip, which is the only vocabulary scrollIntoView has for "the
 * usable bottom edge is higher than the pane's".
 */
export function liftAboveDock(el: HTMLElement): boolean {
  const scroll = findTabContentsScroll(el);
  if (!scroll) return false;
  const dock = scroll.querySelector<HTMLElement>(DOCK_SELECTOR);
  if (!dock || dock.contains(el)) return false;

  const paneRect = scroll.getBoundingClientRect();
  const paneBottom = paneRect.bottom;
  const dockTop = dock.getBoundingClientRect().top;
  const covered = paneBottom - Math.min(paneBottom, dockTop);
  if (covered <= 0) return false;

  const rect = el.getBoundingClientRect();
  if (rect.bottom <= dockTop + 1) return false;

  /*
   * A section taller than the readable band cannot clear the dock and keep its start. When its
   * first line is on screen, `block: "end"` would trade that line for its last ones: on the Deck
   * 2026-09-23 (plan 64), Down onto two long answer sections (308 and 375px) showed only their
   * ends, the opening lines above the pane. Such a section skips straight to the capped step
   * below, which lifts it only until its top meets the pane's. One whose start is already off the
   * top (Up from below) still aligns its end, as before.
   */
  const readableBand = dockTop - paneRect.top - CLEARANCE_PAD_PX;
  const keepsItsStart = rect.bottom - rect.top > readableBand && rect.top >= paneRect.top - 1;
  if (!keepsItsStart) {
    el.style.scrollMarginBottom = `${Math.ceil(covered) + CLEARANCE_PAD_PX}px`;
    el.scrollIntoView({ block: "end", behavior: "auto" });
  }

  /*
   * Measure again, and finish the job by hand if scrollIntoView left the element covered.
   *
   * Inside the answer bubble it always does. Scroll log on the Deck, 2026-09-06, Up out of the
   * Show details line into a long answer's last section: scrollIntoView with a scroll-margin of
   * 0, 80, 164 or 300px all parked the pane at the same scrollTop, the section's bottom 77px
   * behind the dock, and every later pass asked for that same place again. Two things eat the
   * margin: the bubble and its text stack both clip their overflow, and Chromium honours
   * scroll-margin only against the nearest clipping box rather than the pane; and Steam's pane
   * carries scroll-padding-bottom: 80px, so "end" means 80px above the pane's bottom — still 77px
   * inside a 157px dock. A plain scrollTop write is what the D-pad's own section steps use on a
   * finished reply, and it holds (the erased-write evidence in useStreamScrollPin is from
   * mid-stream commits). Capped at the element's own headroom, so a section taller than the
   * readable band keeps its top on screen rather than jumping its start away.
   */
  const after = el.getBoundingClientRect();
  const stillHidden = after.bottom + CLEARANCE_PAD_PX - dockTop;
  if (stillHidden > 1) {
    const headroom = Math.max(0, after.top - paneRect.top);
    const step = Math.min(stillHidden, headroom);
    if (step >= 1) {
      scroll.scrollTop = Math.min(panelScrollMax(scroll), scroll.scrollTop + step);
    }
  }
  return true;
}

/**
 * Watch focus arriving anywhere under `columnRef` and lift whatever lands behind the dock.
 *
 * One pass an animation frame after the event, so Steam's own focus scroll has finished and the
 * lift measures the settled position, then a series of repeat passes at `SETTLE_PASS_DELAYS_MS`
 * because whatever re-asserts a stale scroll position on this device does not always stop after
 * one correction (round 35 measurement, see that constant's comment). Every pass is idempotent:
 * it measures first and scrolls only if the element is still covered, so this is safe to run
 * whether or not an earlier pass already did the job.
 */
export function useDockClearanceOnFocus(columnRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const column = columnRef.current;
    if (!column) return;

    let raf = 0;
    let settleTimers: number[] = [];

    const clearPending = () => {
      cancelAnimationFrame(raf);
      settleTimers.forEach((timer) => window.clearTimeout(timer));
      settleTimers = [];
    };

    const onFocusIn = (event: FocusEvent) => {
      const el = event.target as HTMLElement | null;
      if (!el) return;
      clearPending();
      raf = requestAnimationFrame(() => {
        if (!el.isConnected) return;
        liftAboveDock(el);
        settleTimers = SETTLE_PASS_DELAYS_MS.map((delayMs) =>
          window.setTimeout(() => {
            if (el.isConnected) liftAboveDock(el);
          }, delayMs)
        );
      });
    };

    column.addEventListener("focusin", onFocusIn);
    return () => {
      clearPending();
      column.removeEventListener("focusin", onFocusIn);
    };
  }, [columnRef]);
}
