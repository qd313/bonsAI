/**
 * Title: Tab body scroll plan
 * Purpose: Decide where a tab's scroll pane should sit when the D-pad ring lands on one of its controls, so
 *          that each press moves the pane a little and Steam's own scroll-on-focus has nothing left to do.
 * Used for: useTabBodyFocusScroll (Ollama, Settings, Permissions, Developer and About tabs).
 * Solves: Walking those tabs with the D-pad moved the pane a long way at some presses (329 px of a 741 px
 *         pane going Down, 393 px going Up; docs/test-evidence/plan87-M4-OTHER-TABS.json) and not at all at
 *         the ones between. Steam scrolls a focused control into view only when it lies outside a band that
 *         stops 116 px below the pane's top and 80 px above its bottom; one that lies wholly outside the band
 *         is put in the middle of the pane, so the next control down (or up) of a tight list is "wholly
 *         outside" and the pane jumps half a screen. Here the pane is moved first, to a place where the
 *         control is inside the band, and ahead of time: the next few controls in the direction of travel are
 *         looked at, and the move is spread over the presses before a long gap instead of landing on one.
 * Does not: Touch the DOM or Steam; it is arithmetic on boxes. Does not place Main's answer sections, which
 *           the answer walk places itself.
 *
 * How it works: for each control that must be visible, the scroll positions where it is inside the band form
 * an interval. A path through the intervals of the control just reached and the ones ahead of it is chosen
 * with the smallest largest-step, found by bisection on that step; the first step of that path, taken from
 * where the pane is now, is the answer. The first control of the tab always puts the pane at the top, and
 * the last one at the bottom, as Steam does, so the top of the tab is never left under the fade.
 */

/** A control's box in the scroll pane's own coordinates (0 is the top of the content). */
export interface PlanBox {
  top: number;
  bottom: number;
}

export interface TabScrollPlanInput {
  /** The control focus just landed on, with the row around it that Steam scrolls into view. */
  current: PlanBox;
  /** The controls further along in the direction of travel, nearest first. */
  ahead: PlanBox[];
  /** No control lies above `current` / below it: it is the tab's first / last stop. */
  atStart: boolean;
  atEnd: boolean;
  scrollTop: number;
  /** The pane's visible height. */
  viewport: number;
  maxScroll: number;
  /** The margins Steam keeps clear at the pane's top and bottom, and the plan keeps with them. */
  padTop: number;
  padBottom: number;
}

/** How many controls ahead the plan looks. Five or six already flatten the longest gaps measured. */
const PLAN_LOOKAHEAD = 6;

type Interval = [lo: number, hi: number];

/** Pane positions at which the box is wholly inside the band, clamped to the pane's range. */
function bandInterval(box: PlanBox, input: TabScrollPlanInput): Interval {
  const { viewport, padTop, padBottom, maxScroll } = input;
  const hi = box.top - padTop;
  const lo = box.bottom - (viewport - padBottom);
  /* Taller than the band: keep its top in view, the way a long section is read from the top. */
  const [a, b] = lo > hi ? [hi, hi] : [lo, hi];
  const clampedLo = Math.max(0, Math.min(maxScroll, a));
  const clampedHi = Math.max(0, Math.min(maxScroll, b));
  return clampedLo <= clampedHi ? [clampedLo, clampedHi] : [clampedHi, clampedHi];
}

/** The pane's edge when the control is the tab's first or last stop and that edge keeps it in the band. */
function endsOnEdge(interval: Interval, edge: number): Interval {
  return interval[0] <= edge && edge <= interval[1] ? [edge, edge] : interval;
}

/**
 * Where the pane should be after focus lands on `current`. Equal to `scrollTop` when nothing needs to move.
 * The result is always inside the pane's range, and `current` is always inside the band when its box fits.
 */
export function planTabBodyScroll(input: TabScrollPlanInput): number {
  const { scrollTop, maxScroll } = input;
  if (maxScroll <= 0) return scrollTop;

  let first = bandInterval(input.current, input);
  if (input.atStart) first = endsOnEdge(first, 0);
  if (input.atEnd) first = endsOnEdge(first, maxScroll);
  const intervals: Interval[] = [first, ...input.ahead.slice(0, PLAN_LOOKAHEAD).map((b) => bandInterval(b, input))];

  /* Backward pass: the positions from which every later control can still be reached in steps of at most `step`. */
  const reachable = (step: number): Interval[] | null => {
    const out: Interval[] = new Array(intervals.length);
    out[intervals.length - 1] = intervals[intervals.length - 1]!;
    for (let j = intervals.length - 2; j >= 0; j--) {
      const lo = Math.max(intervals[j]![0], out[j + 1]![0] - step);
      const hi = Math.min(intervals[j]![1], out[j + 1]![1] + step);
      if (lo > hi) return null;
      out[j] = [lo, hi];
    }
    const start = out[0]!;
    return start[0] > scrollTop + step || start[1] < scrollTop - step ? null : out;
  };

  let lo = 0;
  let hi = maxScroll + 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (reachable(mid)) hi = mid;
    else lo = mid;
  }
  /* A pixel of slack, so a path found exactly on its limit does not fall out on rounding. */
  const path = reachable(hi + 1) ?? [first];
  const start = path[0]!;
  return Math.max(start[0], Math.min(start[1], scrollTop));
}
