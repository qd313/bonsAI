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
 *           writes while tokens streamed). The direct write is the fallback here, for when
 *           scrollIntoView leaves the element covered — see liftAboveDock. Does not lift an answer's
 *           own sections: the D-pad walk places those itself — see liftForFocus.
 */
import { useEffect, type RefObject } from "react";
import { findTabContentsScroll, panelScrollMax } from "../utils/chatPanelScroll";

const DOCK_SELECTOR = ".bonsai-main-tab-dock";

/** Breathing room between the lifted element and the dock's top edge. */
const CLEARANCE_PAD_PX = 6;

/**
 * Steam's own scroll-padding-bottom on the Quick Access pane: `scrollIntoView({ block: "end" })` already lands
 * an element this far above the pane's bottom edge. Measured 2026-10-01 (docs/test-evidence/
 * plan78-P78-DOWN-SHORT-SECTION.json) and again 2026-10-03 with and without a game running
 * (plan81-P81-M-K2K3-NOGAME.json, plan81-P81-M-K2K3-GAME.json): with the scroll margin below at the covered
 * strip plus 6, the element ended 86 px above the dock, 80 px of it Steam's. The margin leaves these 80 out.
 */
const STEAM_SCROLL_PADDING_BOTTOM_PX = 80;

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
    el.style.scrollMarginBottom = `${Math.max(0, Math.ceil(covered) + CLEARANCE_PAD_PX - STEAM_SCROLL_PADDING_BOTTOM_PX)}px`;
    el.scrollIntoView({ block: "end", behavior: "auto" });
  }

  /*
   * Measure again, and finish the job by hand if scrollIntoView left the element covered.
   *
   * It once always did inside the answer bubble. Scroll log on the Deck, 2026-09-06, Up out of the
   * Show details line into a long answer's last section: scrollIntoView with a scroll-margin of
   * 0, 80, 164 or 300px all parked the pane at the same scrollTop, the section's bottom 77px
   * behind the dock, and every later pass asked for that same place again.
   *
   * That is no longer what the Deck does. Measured 2026-10-01 (docs/test-evidence/
   * plan78-P78-DOWN-SHORT-SECTION.json): the request moves the pane, inside the answer and out,
   * and overshoots. Steam's pane carries scroll-padding-bottom: 80px, so "end" lands 80px above the
   * pane's bottom, and the scroll-margin set above (the covered strip plus the pad) lands it the
   * dock's height higher again: the element's bottom ended 86px above the dock's top. A 180px answer
   * section was left at y 24 to 204 with the dock at 290, its top 64px above the pane; the choices
   * and Helpful under an answer landed at 172 to 204 the same way. Answer sections are no longer
   * lifted at all (liftForFocus), and the margin above now leaves Steam's 80px out, so everything
   * else ends 6px above the dock (plan 81 K3; the Deck's landings are in the test).
   *
   * A plain scrollTop write is what the D-pad's own section steps use on a finished reply, and it
   * holds (the erased-write evidence in useStreamScrollPin is from mid-stream commits). Capped at
   * the element's own headroom, so a section taller than the readable band keeps its top on screen
   * rather than jumping its start away.
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

/** The class every section of an answer carries (buildAnswerBubbleElement.tsx's STOP_CLASS), and nothing else. */
const ANSWER_SECTION_CLASS = "bonsai-answer-stop";

/**
 * What the hook does for one element focus has landed on, on each of its passes: the lift, except for a
 * section of an answer. The D-pad walk places every section it lands on itself (answerBubbleNavigation.ts:
 * its bottom just above the dock, or a taller one's top on the header, or its end going Up), and when it
 * moves the ring onto a section it is reading by scrolling, the section is meant to run past the dock.
 * Lifting one of those undid the walk: on a section taller than the band whose top is above the screen,
 * the lift asks for its end, and the panel jumped there. Going Up through such a section with a spoiler
 * cover in its lower half, that sent the cover back on screen and the next Up landed on it again, for ever;
 * going Down from an underlined word, it skipped the section's middle (plan 78 helper D, round four). Covers,
 * underlined words, an opened cover's "tap to hide" line and everything outside the answer are lifted as
 * before: some of those landings are placed by nothing else, and none is tall enough to lose its top.
 * Read off the element's own class, not a page search: nothing here chooses where the ring goes.
 * Exported so the answer-walk test setup (src/test-harness/deckAnswerWalk.ts) runs the Deck's decision.
 */
export function liftForFocus(el: HTMLElement): boolean {
  if (el.classList.contains(ANSWER_SECTION_CLASS)) return false;
  return liftAboveDock(el);
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
        liftForFocus(el);
        settleTimers = SETTLE_PASS_DELAYS_MS.map((delayMs) =>
          window.setTimeout(() => {
            if (el.isConnected) liftForFocus(el);
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
