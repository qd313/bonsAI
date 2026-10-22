/**
 * Title: The tab glide: which way the new page comes in from
 *
 * Purpose: Remembers which tab was showing and which one is showing now, so the page that has just
 * arrived knows which side to slide in from (RB: from the right, LB: from the left), and holds the
 * numbers of the picked motion (plan 97 G1, option A in docs/demos/tab-switch-mockups.html): 180 ms,
 * the page moving 48 points, the mock-up's own easing.
 *
 * Used for: TabBodyFocusRoot.tsx (asks once, when a tab body is built), TabIndicatorBar.tsx (tells
 * this module which tab it is drawing), tabIndicatorBarStyles.ts (the timings, in the stylesheet).
 *
 * Solves: The tab bodies are built fresh on every switch, by Steam's own tab carousel, and neither
 * LB/RB path (the bar's own, or Steam's) passes a direction down. The direction is worked out here
 * from the strip's order instead, with the one wrap-round (first tab to last, last to first) read the
 * way LB and RB wrap. Nothing here waits for the motion: the glide is a class on the page and a
 * stylesheet rule reacting to it, so the next press is handled the instant it comes.
 *
 * Does not: Animate anything, keep a timer, or hold the next press back. It also stays quiet when the
 * same tab is rebuilt in place (a popup closing, the session restoring) and under reduced motion.
 */
import { ALL_BONSAI_TAB_IDS } from "./tabTitles";
import { prefersReducedMotion } from "../preset-carousel/presetChipShared";

/** How long the glide takes: the picked mock-up's 180 ms. */
export const TAB_GLIDE_MS = 180;
/** How far the page moves, in points (16 percent of the 300-point column). */
export const TAB_GLIDE_SHIFT_PX = 48;
/** The mock-up's easing, for the page and for the line under the current tab. */
export const TAB_GLIDE_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** +1: heading right (RB), the page comes in from the right. -1: heading left (LB), from the left. */
export type TabGlideDirection = 1 | -1;

/** The class on the tab body's root while its page glides in. */
export function tabGlideClass(direction: TabGlideDirection): string {
  return direction === 1 ? "bonsai-tab-body-root--glide-from-right" : "bonsai-tab-body-root--glide-from-left";
}

/** Which way a switch from `from` to `to` heads: by the strip's order, the first/last wrap read as LB and RB wrap. */
export function tabGlideDirection(from: string, to: string): TabGlideDirection {
  const a = ALL_BONSAI_TAB_IDS.indexOf(from as (typeof ALL_BONSAI_TAB_IDS)[number]);
  const b = ALL_BONSAI_TAB_IDS.indexOf(to as (typeof ALL_BONSAI_TAB_IDS)[number]);
  if (a < 0 || b < 0 || a === b) return 1;
  const diff = b - a;
  if (Math.abs(diff) === ALL_BONSAI_TAB_IDS.length - 1) return diff > 0 ? -1 : 1;
  return diff > 0 ? 1 : -1;
}

/** A switch is only a switch for this long; a body built later than that was not made by one. */
const SWITCH_WINDOW_MS = 1000;
/** Two builds of the same body this close are one render run twice, not two switches. */
const REPEAT_WINDOW_MS = 100;

type Shown = { cur: string | null; prev: string | null; at: number; pending: boolean };
let shown: Shown = { cur: null, prev: null, at: 0, pending: false };
let lastTaken: { tab: string; at: number; direction: TabGlideDirection } | null = null;

/** The tab now showing, from whoever learns of it first (the bar, or the body that just got built). */
export function noteTabShown(tab: string, now: number = Date.now()): void {
  if (shown.cur === tab) return;
  shown = { cur: tab, prev: shown.cur, at: now, pending: true };
}

/**
 * Asked by a tab body when it is built: which way to glide in, or null for none (not a switch, the first
 * tab shown, a rebuild in place, or reduced motion). Gives each switch out once.
 */
export function takeTabGlide(tab: string, now: number = Date.now()): TabGlideDirection | null {
  noteTabShown(tab, now);
  if (lastTaken && lastTaken.tab === tab && now - lastTaken.at < REPEAT_WINDOW_MS) {
    return prefersReducedMotion() ? null : lastTaken.direction;
  }
  if (!shown.pending || shown.cur !== tab || shown.prev === null || now - shown.at > SWITCH_WINDOW_MS) return null;
  shown = { ...shown, pending: false };
  const direction = tabGlideDirection(shown.prev as string, tab);
  lastTaken = { tab, at: now, direction };
  return prefersReducedMotion() ? null : direction;
}

/** Test seam: forget which tab was showing. */
export function resetTabGlideForTests(): void {
  shown = { cur: null, prev: null, at: 0, pending: false };
  lastTaken = null;
}
