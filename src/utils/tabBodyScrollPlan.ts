/**
 * Title: Tab body scroll plan
 * Purpose: Decide where a tab's scroll pane should sit when the D-pad ring lands on one of its controls: leave it
 *          alone while the control is comfortably in view, and when it is not, turn the page by a fixed step
 *          that puts the control back in view with room ahead, so Steam's own scroll-on-focus has nothing to do.
 * Used for: useTabBodyFocusScroll (Ollama, Settings, Permissions, Developer and About tabs).
 * Solves: Two rounds of history. Plan 87: Steam alone moved the pane half a screen at some presses (329 px of a
 *         741 px pane going Down; docs/test-evidence/plan87-M4-OTHER-TABS.json), because a control wholly
 *         outside its band (116 px clear at the pane's top, 80 at its bottom) is put in the middle. Plan 87's
 *         answer moved the pane itself, a little at EVERY landing, spreading each gap ahead over the presses
 *         before it, and sent the last control to the pane's very bottom. Plan 89 measured what that felt like
 *         (docs/test-evidence/plan89-M1-TAB-WALK.json): Settings moved at 12 of 16 Down presses and 13 of 14 Up,
 *         Developer at 15 of 18 and 13 of 16 (up to 216 px), and Left or Right inside the Text size row, which
 *         stays on one line, still scrolled 100.8, 81.2 and 64.1 px, because the spreading looked ahead even
 *         when the ring had not moved down at all.
 * Does not: Touch the DOM or Steam; it is arithmetic on boxes. Does not place Main's answer sections, which the
 *           answer walk places itself. Does not glide: see useTabBodyFocusScroll for why the step is instant.
 *
 * How it works: the "calm range" is every pane position at which the control lies wholly inside the band. A
 * landing whose pane position is already in it moves nothing: a sideways press, or a Down onto a control that is
 * already on screen, leaves the page still. A landing outside it moves the pane in the direction the control lies,
 * by one step (just under half the pane, TAB_SCROLL_STEP_FRACTION), but never past the far end of the calm range,
 * so the control always ends inside the band; when a gap is so long that one step does not reach the control, the
 * move goes only as far as the band's edge. One exception to "still while in view": when the next control in the
 * direction of travel lies so far that reaching it would take more than one step (Developer's 405 px gap between
 * Force session RAG chips and the animation controls), this press takes the excess, as far as the control it is on
 * stays in the band, so the next press moves one step and no more. A sideways press has no next control and never
 * moves. Nothing special happens at the last control: no move to the very end of the page because the end was
 * reached. The first control does take the pane to the very top when that keeps
 * it in the band (a few px, so the tab's first heading is not left under the pane's top fade, plan 87 B9). A
 * control taller than the band is met by the edge it is entered from: its top at the band's top going down, its
 * bottom at the band's bottom going up.
 */

/** A control's box in the scroll pane's own coordinates (0 is the top of the content). */
export interface PlanBox {
  top: number;
  bottom: number;
}

export interface TabScrollPlanInput {
  /** The control focus just landed on, with the row around it that Steam scrolls into view. */
  current: PlanBox;
  /**
   * The nearest control in the direction the ring is travelling (below it going Down, above it going Up), with its
   * row, or none: the last control that way, or a Left or Right along one line.
   */
  next?: PlanBox;
  /** No control lies above `current`: it is the tab's first stop. */
  atStart: boolean;
  scrollTop: number;
  /** The pane's visible height. */
  viewport: number;
  maxScroll: number;
  /** The margins Steam keeps clear at the pane's top and bottom, and the plan keeps with them. */
  padTop: number;
  padBottom: number;
}

/**
 * The page-turn step, as a share of the pane's height. Plan 89 asked for no more than half the pane at one press
 * and a move on no more than one press in three. Settings' controls are about 140 px apart (plan89-M1), so a move
 * every third press has to cover about 420 px, more than half of a 741 px pane: the largest step under half moves
 * least often. 0.48 rather than 0.5 leaves room for the 2 px slack the band is measured with, and for rounding.
 */
export const TAB_SCROLL_STEP_FRACTION = 0.48;

/**
 * Where the pane should be after focus lands on `current`. Equal to `scrollTop` when nothing needs to move.
 * The result is always inside the pane's range, and `current` is always inside the band when its box fits.
 */
export function planTabBodyScroll(input: TabScrollPlanInput): number {
  const { current, next, scrollTop, viewport, maxScroll } = input;
  if (maxScroll <= 0) return scrollTop;
  const step = viewport * TAB_SCROLL_STEP_FRACTION;
  const [calmLo, calmHi, fits] = calmRange(current, input);

  let place: number;
  if (scrollTop >= calmLo - 0.5 && scrollTop <= calmHi + 0.5) {
    if (input.atStart && calmLo === 0) return 0;
    place = scrollTop;
  } else if (!fits) {
    return scrollTop < calmLo ? calmLo : calmHi;
  } else {
    place =
      scrollTop < calmLo
        ? Math.min(calmHi, Math.max(calmLo, scrollTop + step))
        : Math.max(calmLo, Math.min(calmHi, scrollTop - step));
  }
  if (!next || !fits) return place;

  /* The next control along: if reaching it from here would take more than a step, take the excess now. */
  const [nextLo, nextHi] = calmRange(next, input);
  const need = place < nextLo ? nextLo - place : place > nextHi ? nextHi - place : 0;
  if (Math.abs(need) <= step) return place;
  return Math.max(calmLo, Math.min(calmHi, place + need - Math.sign(need) * step));
}

/**
 * The pane positions at which `box` lies wholly inside the band, clamped to the pane's range, and whether it fits
 * the band at all. For a box taller than the band the range is the reverse: the positions where it fills the band,
 * from its top on the band's top edge to its bottom on the bottom edge.
 */
function calmRange(box: PlanBox, input: TabScrollPlanInput): [lo: number, hi: number, fits: boolean] {
  const { viewport, maxScroll, padTop, padBottom } = input;
  const clamp = (v: number) => Math.max(0, Math.min(maxScroll, v));
  const topOnEdge = box.top - padTop;
  const bottomOnEdge = box.bottom - (viewport - padBottom);
  return [clamp(Math.min(topOnEdge, bottomOnEdge)), clamp(Math.max(topOnEdge, bottomOnEdge)), bottomOnEdge <= topOnEdge];
}
