/**
 * Title: Walking the plain tabs with the D-pad (plan 87, B9 and B10)
 * Purpose: Pin the Deck check for "walking some of the other tabs scrolls a long way at each step" and "the
 *          top of the tab cannot be scrolled fully into view": on Ollama, Settings, Permissions, Developer and
 *          About, Down from the first control to the last and back Up moves the pane by under a third of its
 *          height at any press, every control is wholly on screen when it has the ring, the ring is never on a
 *          control twice in one leg, and the first heading is below the pane's top fade at the first control.
 *          Run against the controls' real positions (test-harness/tabBodyDeckGeometry.ts) with Steam's own
 *          scroll-into-view modelled three ways, because the Deck's exact rule is not known.
 * Used for: TabBodyFocusRoot.tsx, useTabBodyFocusScroll.ts, tabBodyScrollPlan.ts.
 * Does not: Animate, or know what Steam does with a press nobody claims; the Deck rows measure that.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import {
  MONITOR_PANE_PX,
  OWN_SCREEN_PANE_PX,
  TOP_FADE_PX,
  walkTab,
  type SteamFocusScroll,
  type TabName,
} from "../../test-harness/tabBodyWalk";
import { TAB_GEOMETRY } from "../../test-harness/tabBodyDeckGeometry";

const TABS = Object.keys(TAB_GEOMETRY) as TabName[];
const RULES: SteamFocusScroll[] = ["nearest", "centerIfHidden", "center"];

afterEach(() => cleanup());

describe("the walk model, without the fix", () => {
  it("reproduces the page-down: Steam alone moves the pane over a third of its height at one press", () => {
    /* Measured on the Deck: 329 px down and 393 up of 741 (plan87-M4-OTHER-TABS.json). */
    const worst = Math.max(
      ...TABS.flatMap((tab) => {
        const w = walkTab({ tab, viewport: MONITOR_PANE_PX, steam: "centerIfHidden", withRoot: false });
        return [w.largestDown, w.largestUp];
      }),
    );
    expect(worst).toBeGreaterThan(MONITOR_PANE_PX / 3);
  });
});

describe("walking a plain tab Down and back Up", () => {
  for (const tab of TABS) {
    for (const steam of RULES) {
      for (const steamTarget of ["leaf", "row"] as const) {
        it(`${tab}, Steam's rule "${steam}" on the ${steamTarget}: no press moves the pane a third of its height; every stop is on screen; none is visited twice`, () => {
          const w = walkTab({ tab, viewport: MONITOR_PANE_PX, steam, steamTarget });
          expect(w.largestDown).toBeLessThan(MONITOR_PANE_PX / 3);
          expect(w.largestUp).toBeLessThan(MONITOR_PANE_PX / 3);
          expect(w.notVisible).toEqual([]);
          expect(w.repeated).toBe(0);
          expect(w.landings).toHaveLength(TAB_GEOMETRY[tab].stops.length * 2);
        });
      }
    }
  }

  it("on the Deck's own, shorter screen no press moves the pane more than 0.65 of its height", () => {
    /*
     * A third is not reachable there: with Steam's 116 and 80 px margins the band is about 200 px, and Developer
     * has two stops 405 px apart, so one press has to move about 235 px whatever moves it (the plan's own
     * floor, measured with the same geometry). The monitor's walk above is the third. Before the fix the same
     * walk moved the pane 415 to 519 px at one press on Developer.
     */
    for (const tab of TABS) {
      for (const steam of RULES) {
        for (const steamTarget of ["leaf", "row"] as const) {
          const w = walkTab({ tab, viewport: OWN_SCREEN_PANE_PX, steam, steamTarget });
          expect(Math.max(w.largestDown, w.largestUp), `${tab} / ${steam} / ${steamTarget}`).toBeLessThan(OWN_SCREEN_PANE_PX * 0.65);
          expect(w.notVisible, `${tab} / ${steam} / ${steamTarget}`).toEqual([]);
        }
      }
    }
  });
});

describe("the first control of each tab", () => {
  for (const viewport of [MONITOR_PANE_PX, OWN_SCREEN_PANE_PX]) {
    for (const tab of TABS) {
      /* About's first control is 355 px down the page: on the short screen it is not in view at the top, so the heading must scroll away to show it. */
      if (TAB_GEOMETRY[tab].stops[0]![0] + 24 + TAB_GEOMETRY[tab].stops[0]![1] > viewport - 80) continue;
      it(`${tab}, pane ${viewport} px: the first heading is wholly below the pane's top fade, going down and coming back up`, () => {
        for (const steam of RULES) {
          const w = walkTab({ tab, viewport, steam });
          expect(w.headingTopAtFirstDown, steam).toBeGreaterThanOrEqual(TOP_FADE_PX);
          expect(w.headingTopAtFirstUp, steam).toBeGreaterThanOrEqual(TOP_FADE_PX);
        }
      });
    }
  }

  it("comes back to the very top when the ring returns to the first control, so Up can reach the tab bar with nothing hidden", () => {
    for (const tab of TABS) {
      const w = walkTab({ tab, viewport: MONITOR_PANE_PX, steam: "centerIfHidden" });
      expect(w.scrollTop(), tab).toBe(0);
    }
  });
});

describe("focus that comes from a tap", () => {
  it("is left to Steam: the plugin does not move the pane", () => {
    const w = walkTab({ tab: "settings", viewport: MONITOR_PANE_PX, steam: "nearest" });
    expect(w.tap(8)).toBe(0);
    w.unmount();
  });
});
