/**
 * Title: Tab body scroll plan, the arithmetic (plan 87 B10, plan 89 M1)
 * Purpose: Pin what `planTabBodyScroll` decides on its own, apart from the DOM: leave the pane alone while the
 *          control is in the band (a sideways press, a Down onto a control already in view); when it is not, turn
 *          the page by one step that keeps the control in the band; take the excess of a gap longer than a step one
 *          press early; never jump to the page's end because the last control was reached; put the first control
 *          at the pane's top; meet a control taller than the band by the edge it is entered from.
 * Used for: tabBodyScrollPlan.ts. The walk over the Deck's real tabs is TabBodyFocusRoot.walk.test.tsx.
 * Does not: Know Steam or the DOM.
 */
import { describe, expect, it } from "vitest";
import { planTabBodyScroll, TAB_SCROLL_STEP_FRACTION, type TabScrollPlanInput } from "./tabBodyScrollPlan";

/* The band is 100 to 620 of a 700 px pane; one step is 336 px. */
const base: TabScrollPlanInput = {
  current: { top: 400, bottom: 430 },
  atStart: false,
  scrollTop: 0,
  viewport: 700,
  maxScroll: 2000,
  padTop: 100,
  padBottom: 80,
};
const STEP = base.viewport * TAB_SCROLL_STEP_FRACTION;
const box = (top: number, height = 30) => ({ top, bottom: top + height });

describe("planTabBodyScroll", () => {
  it("leaves the pane where it is when the control is already inside the band, whatever lies ahead", () => {
    expect(planTabBodyScroll(base)).toBe(0);
    expect(planTabBodyScroll({ ...base, scrollTop: 250, current: box(500) })).toBe(250);
    /* Plan 87's plan moved here, to spread the gap to the control at 900 over this press and the next. */
    expect(planTabBodyScroll({ ...base, current: box(550), next: box(900) })).toBe(0);
  });

  it("is under half the pane, one step", () => {
    expect(STEP).toBeLessThan(base.viewport / 2);
  });

  it("turns the page by one step when a control lands below the band, and the control stays in the band", () => {
    /* The control ends at 650, past the band's bottom edge (620): the pane moves one step, not just 30 px. */
    const place = planTabBodyScroll({ ...base, current: box(620) });
    expect(place).toBe(STEP);
    expect(620 - place).toBeGreaterThanOrEqual(base.padTop);
  });

  it("turns the page by one step going up, and the control stays in the band", () => {
    /* Pane at 1000, the control's top 50 below the pane's top, above the band's 100. */
    const place = planTabBodyScroll({ ...base, scrollTop: 1000, current: box(1050) });
    expect(place).toBe(1000 - STEP);
    expect(1080 - place).toBeLessThanOrEqual(base.viewport - base.padBottom);
  });

  it("goes no further than keeps the control in the band, so it is never put out of view at the far edge", () => {
    /* A 240 px row ending 20 px past the band: a whole step would take its top to 64, above the band's 100. */
    const tallRow = { top: 400, bottom: 640 };
    const place = planTabBodyScroll({ ...base, current: tallRow });
    expect(place).toBe(tallRow.top - base.padTop);
    expect(tallRow.bottom - place).toBeLessThanOrEqual(base.viewport - base.padBottom);
  });

  it("brings a control beyond one step only to the band's edge, the least that shows it", () => {
    /* The control is 1000 px below the band: one step does not reach it, so the move is just enough. */
    const place = planTabBodyScroll({ ...base, current: box(1600) });
    expect(place).toBe(1630 - (base.viewport - base.padBottom));
  });

  it("takes the excess of a gap longer than a step one press early, so no press moves more than a step", () => {
    /* At the pane's end (2000) going up, the next control up needs the pane at 1500 - 100 = 1400: 600 away. */
    const here = planTabBodyScroll({ ...base, scrollTop: 2000, current: box(2150), next: box(1500) });
    expect(2000 - here).toBeCloseTo(600 - STEP, 5);
    const there = planTabBodyScroll({ ...base, scrollTop: here, current: box(1500) });
    expect(here - there).toBeLessThanOrEqual(STEP + 1e-9);
    /* The control it is on stays in the band while it does. */
    expect(2180 - here).toBeLessThanOrEqual(base.viewport - base.padBottom);
  });

  it("does not move on a press along one line (no next control), wherever the next row down is", () => {
    expect(planTabBodyScroll({ ...base, scrollTop: 193, current: box(569, 36) })).toBe(193);
  });

  it("does not jump to the page's end at the last control", () => {
    /* The last control is in view with the pane at 1500; the page could go on to 2000. */
    expect(planTabBodyScroll({ ...base, scrollTop: 1500, current: box(1900) })).toBe(1500);
    /* Below the band: one step, not the 500 px to the end. */
    expect(planTabBodyScroll({ ...base, scrollTop: 1000, current: box(1600) })).toBe(1000 + STEP);
  });

  it("puts the pane at the very top at the tab's first control when that keeps the control in the band", () => {
    expect(planTabBodyScroll({ ...base, current: box(137), atStart: true, scrollTop: 30 })).toBe(0);
    expect(planTabBodyScroll({ ...base, current: box(137), atStart: true, scrollTop: 300 })).toBe(0);
  });

  it("does not force the top when the first control is not in view there", () => {
    const place = planTabBodyScroll({ ...base, current: box(900), atStart: true, scrollTop: 0 });
    expect(place).toBeGreaterThan(0);
  });

  it("meets a control taller than the band by the edge it is entered from", () => {
    const tall = { top: 1000, bottom: 1700 };
    /* Going down onto it: its top on the band's top edge. */
    expect(planTabBodyScroll({ ...base, current: tall, scrollTop: 0 })).toBe(1000 - base.padTop);
    /* Going up onto it: its bottom on the band's bottom edge. */
    expect(planTabBodyScroll({ ...base, current: tall, scrollTop: 2000 })).toBe(1700 - (base.viewport - base.padBottom));
    /* Already filling the band (being read): left alone. */
    expect(planTabBodyScroll({ ...base, current: tall, scrollTop: 1000 })).toBe(1000);
  });

  it("never leaves the pane's range, and does nothing where there is no range", () => {
    expect(planTabBodyScroll({ ...base, current: box(1990), maxScroll: 1500 })).toBeLessThanOrEqual(1500);
    expect(planTabBodyScroll({ ...base, current: box(5000), maxScroll: 0, scrollTop: 0 })).toBe(0);
  });
});
