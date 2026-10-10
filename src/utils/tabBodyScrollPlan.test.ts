/**
 * Title: Tab body scroll plan, the arithmetic (plan 87, B10)
 * Purpose: Pin what `planTabBodyScroll` decides on its own, apart from the DOM: leave the pane alone when the
 *          control is already in the band, move only as far as needed, spread a long gap over the presses
 *          before it, put the first control at the pane's top and the last at its bottom, and keep a control
 *          taller than the band by its top.
 * Used for: tabBodyScrollPlan.ts. The walk over the Deck's real tabs is TabBodyFocusRoot.walk.test.tsx.
 * Does not: Know Steam or the DOM.
 */
import { describe, expect, it } from "vitest";
import { planTabBodyScroll, type TabScrollPlanInput } from "./tabBodyScrollPlan";

const base: TabScrollPlanInput = {
  current: { top: 400, bottom: 430 },
  ahead: [],
  atStart: false,
  atEnd: false,
  scrollTop: 0,
  viewport: 700,
  maxScroll: 2000,
  padTop: 100,
  padBottom: 80,
};
const box = (top: number, height = 30) => ({ top, bottom: top + height });

describe("planTabBodyScroll", () => {
  it("leaves the pane where it is when the control is already inside the band", () => {
    expect(planTabBodyScroll(base)).toBe(0);
    expect(planTabBodyScroll({ ...base, scrollTop: 250, current: box(500) })).toBe(250);
  });

  it("moves only as far as it takes to bring a control below the band to its edge", () => {
    /* Bottom edge of the band is 700 - 80 = 620; the control ends at 780. */
    expect(planTabBodyScroll({ ...base, current: box(750) })).toBe(160);
  });

  it("moves only as far as it takes to bring a control above the band to its edge, going up", () => {
    /* Pane at 500, so the control's top is at 50 on screen; the band starts at 100. */
    expect(planTabBodyScroll({ ...base, scrollTop: 500, current: box(550) })).toBe(450);
  });

  it("spreads a long gap ahead over the presses before it", () => {
    /*
     * The next stop is 450 px below this one. Taking the whole gap at once would move the pane 450; the
     * plan starts the move now, so this press moves it part of the way and the next the rest.
     */
    const ahead = [box(900), box(940), box(980)];
    const here = planTabBodyScroll({ ...base, current: box(550), ahead, scrollTop: 0 });
    expect(here).toBeGreaterThan(0);
    const next = planTabBodyScroll({ ...base, current: box(900), ahead: [box(940), box(980)], scrollTop: here });
    const steps = [here, next - here];
    expect(Math.max(...steps)).toBeLessThan(450);
  });

  it("puts the pane at the very top at the tab's first control, and at its end at the last", () => {
    expect(planTabBodyScroll({ ...base, current: box(137), atStart: true, scrollTop: 300 })).toBe(0);
    expect(planTabBodyScroll({ ...base, current: box(2300), atEnd: true, scrollTop: 1700 })).toBe(2000);
  });

  it("does not force the top when the first control is not in view there", () => {
    /* A control at 900 cannot be seen with the pane at 0; the first-stop rule gives way to showing it. */
    const place = planTabBodyScroll({ ...base, current: box(900), atStart: true, scrollTop: 0 });
    expect(place).toBeGreaterThan(0);
  });

  it("keeps the top of a control taller than the band in view", () => {
    const place = planTabBodyScroll({ ...base, current: { top: 1000, bottom: 1700 }, scrollTop: 0 });
    expect(1000 - place).toBe(base.padTop);
  });

  it("never leaves the pane's range, and does nothing where there is no range", () => {
    expect(planTabBodyScroll({ ...base, current: box(1990), maxScroll: 1500 })).toBeLessThanOrEqual(1500);
    expect(planTabBodyScroll({ ...base, current: box(5000), maxScroll: 0, scrollTop: 0 })).toBe(0);
  });
});
