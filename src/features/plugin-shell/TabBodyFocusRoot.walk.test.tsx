/**
 * Title: Walking the plain tabs with the D-pad (plan 87, B9 and B10; plan 89, M1)
 * Purpose: Pin the Deck checks for "walking some of the other tabs scrolls a long way at each step", "the
 *          top of the tab cannot be scrolled fully into view", "walking Settings and Developer moves the page at
 *          every press, then jumps at the end" and "Left or Right on the Text size choices scrolls the page": on
 *          Ollama, Settings, Permissions, Developer and About, Down from the first control to the last and back Up
 *          moves the pane by under half its height at any press, on Settings at no more than one press in three,
 *          Left and Right along one line not at all, every control is wholly on screen when it has the ring, the
 *          ring is never on a control twice in one leg, and the first heading is below the pane's top fade.
 *          Run against the controls' real positions (test-harness/tabBodyDeckGeometry.ts) with Steam's own
 *          scroll-into-view modelled three ways, because the Deck's exact rule is not known.
 * Used for: TabBodyFocusRoot.tsx, useTabBodyFocusScroll.ts, tabBodyScrollPlan.ts.
 * Does not: Animate, or know what Steam does with a press nobody claims; the Deck rows measure that.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TabBodyFocusRoot } from "./TabBodyFocusRoot";
import { focusInTabBody } from "./useTabBodyFocusScroll";

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
        it(`${tab}, Steam's rule "${steam}" on the ${steamTarget}: no press moves the pane half its height; every stop is on screen; none is visited twice`, () => {
          const w = walkTab({ tab, viewport: MONITOR_PANE_PX, steam, steamTarget });
          expect(w.largestDown).toBeLessThan(MONITOR_PANE_PX / 2);
          expect(w.largestUp).toBeLessThan(MONITOR_PANE_PX / 2);
          expect(w.notVisible).toEqual([]);
          expect(w.repeated).toBe(0);
          expect(w.landings).toHaveLength(TAB_GEOMETRY[tab].stops.length * 2);
        });
      }
    }
  }

  it("Settings, Up from the tiny.en voice row to the toggle above it: the ring is on the row's wrapper, and the press moves the pane under half", () => {
    /*
     * The one press both earlier rounds left alone: 325.8 px on the Deck (plan87-P87-B10-TAB-SCROLL-try2.json).
     * Steam puts the ring on the Focusable around the voice rows' buttons, and the plan used to skip any focused
     * element with a control inside, so nothing was planned from Reinstall voice engine up to tiny.en.
     */
    const names = TAB_GEOMETRY.settings.stops.map(([, , name]) => name);
    const tiny = names.findIndex((n) => n.startsWith("tiny.en"));
    for (const steam of RULES) {
      for (const steamTarget of ["leaf", "row"] as const) {
        const w = walkTab({ tab: "settings", viewport: MONITOR_PANE_PX, steam, steamTarget, focusVia: "steam" });
        const press = w.landings.find((l) => l.direction === "up" && l.stop === tiny - 1)!;
        expect(press.moved, `${steam} / ${steamTarget}`).toBeLessThan(MONITOR_PANE_PX / 2);
        expect(w.largestUp, `${steam} / ${steamTarget}`).toBeLessThan(MONITOR_PANE_PX / 2);
        w.unmount();
      }
    }
  });

  it("reproduces the Deck's Up jumps when the tab's own helpers focus with a plain focus(), which the browser scrolls for before its focus event", () => {
    /* The model's version of plan87-P87-B10-TAB-SCROLL.json: Ollama 367, Settings 326, Developer 251 px going Up. */
    for (const tab of ["ollama", "settings", "developer"] as const) {
      const w = walkTab({ tab, viewport: MONITOR_PANE_PX, steam: "nearest", focusVia: "plain" });
      expect(w.largestUp, tab).toBeGreaterThan(MONITOR_PANE_PX / 3);
    }
  });

  it("holds when the tab's own helpers focus the control through focusInTabBody (the Deck's second walk: 310 to 372 px Up before)", () => {
    for (const tab of TABS) {
      for (const steam of RULES) {
        for (const steamTarget of ["leaf", "row"] as const) {
          const w = walkTab({ tab, viewport: MONITOR_PANE_PX, steam, steamTarget, focusVia: "helper" });
          expect(w.largestUp, `${tab} / ${steam} / ${steamTarget} up`).toBeLessThan(MONITOR_PANE_PX / 2);
          expect(w.largestDown, `${tab} / ${steam} / ${steamTarget} down`).toBeLessThan(MONITOR_PANE_PX / 2);
          expect(w.notVisible, `${tab} / ${steam} / ${steamTarget}`).toEqual([]);
          expect(w.repeated).toBe(0);
        }
      }
    }
  });

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
          const w = walkTab({ tab, viewport: OWN_SCREEN_PANE_PX, steam, steamTarget, focusVia: steamTarget === "row" ? "helper" : "steam" });
          expect(Math.max(w.largestDown, w.largestUp), `${tab} / ${steam} / ${steamTarget}`).toBeLessThan(OWN_SCREEN_PANE_PX * 0.65);
          expect(w.notVisible, `${tab} / ${steam} / ${steamTarget}`).toEqual([]);
        }
      }
    }
  });
});

describe("the page turns only near the edge (plan 89, M1)", () => {
  /*
   * On the Deck (plan89-M1-TAB-WALK.json, the monitor's 741 px pane) Settings moved at 12 of 16 Down presses and
   * 13 of 14 Up, and Left, Right, Right, Left on the Text size row scrolled 100.8, 81.2 and 64.1 px. This model
   * gave 13 of 14 both ways and 99.9, 79.9 and 63.7 px before the fix.
   */
  const leg = (w: ReturnType<typeof walkTab>, direction: "down" | "up") => w.landings.filter((l) => l.direction === direction);
  const moves = (w: ReturnType<typeof walkTab>, direction: "down" | "up") => leg(w, direction).filter((l) => l.moved > 0.5);

  for (const steam of RULES) {
    for (const steamTarget of ["leaf", "row"] as const) {
      it(`Settings, Steam's rule "${steam}" on the ${steamTarget}: Down and Up each move the page on at most one press in three, under half the pane, with no jump at the end`, () => {
        const w = walkTab({ tab: "settings", viewport: MONITOR_PANE_PX, steam, steamTarget });
        for (const direction of ["down", "up"] as const) {
          const presses = leg(w, direction);
          expect(moves(w, direction).length * 3, direction).toBeLessThanOrEqual(presses.length);
          expect(Math.max(...presses.map((l) => l.moved)), direction).toBeLessThan(MONITOR_PANE_PX / 2);
          expect(presses[presses.length - 1]!.moved, `${direction}: the last press`).toBeLessThan(MONITOR_PANE_PX / 2);
        }
        expect(w.notVisible).toEqual([]);
        expect(w.repeated).toBe(0);
        w.unmount();
      });

      it(`Settings, Steam's rule "${steam}" on the ${steamTarget}: Left and Right along the Text size row, and onto Clear all data..., move the page 0 px`, () => {
        const w = walkTab({ tab: "settings", viewport: MONITOR_PANE_PX, steam, steamTarget, autoWalk: false });
        const textSize = TAB_GEOMETRY.settings.stops.findIndex(([, , name]) => name.startsWith("Set text size"));
        for (let i = 0; i <= textSize; i++) w.press(i, "down");
        /* Right, Right, Left, Left; then back onto Small from outside the panel, as Right from Decky's side rail does. */
        expect([1, 2, 1, 0, 0].map((k) => w.pressSideways(textSize, k))).toEqual([0, 0, 0, 0, 0]);
        const clearCache = TAB_GEOMETRY.settings.stops.length - 1;
        for (let i = textSize + 1; i <= clearCache; i++) w.press(i, "down");
        expect([1, 0].map((k) => w.pressSideways(clearCache, k))).toEqual([0, 0]);
        expect(w.notVisible).toEqual([]);
        w.unmount();
      });
    }
  }

  it("every tab, on the monitor's pane: no more moving presses than the page's length needs in steps under half the pane, plus one", () => {
    /*
     * Developer's page is 1,875 px longer than the pane: in steps under half of 741 px that is six moves at the
     * least, so it cannot keep to one press in three over its 16 stops; its long gap (405 px, Force session RAG
     * chips to the animation controls) costs one more, small, press going Up.
     */
    for (const tab of TABS) {
      for (const steam of RULES) {
        const w = walkTab({ tab, viewport: MONITOR_PANE_PX, steam });
        const range = Math.max(0, 24 + TAB_GEOMETRY[tab].contentHeight - MONITOR_PANE_PX);
        for (const direction of ["down", "up"] as const) {
          expect(moves(w, direction).length, `${tab} / ${steam} / ${direction}`).toBeLessThanOrEqual(Math.ceil(range / (MONITOR_PANE_PX / 2)) + 1);
        }
        w.unmount();
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

describe("the page's focus()", () => {
  it("is the browser's own while tab bodies are mounted: nothing patches HTMLElement.prototype", () => {
    const original = HTMLElement.prototype.focus;
    const first = render(<TabBodyFocusRoot id="settings">{null}</TabBodyFocusRoot>);
    const second = render(<TabBodyFocusRoot id="ollama">{null}</TabBodyFocusRoot>);
    expect(HTMLElement.prototype.focus).toBe(original);
    first.unmount();
    second.unmount();
    expect(HTMLElement.prototype.focus).toBe(original);
  });

  it("focusInTabBody on an element outside any tab body is a plain focus()", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    const spy = vi.spyOn(button, "focus");
    focusInTabBody(button);
    expect(spy).toHaveBeenCalledWith();
    button.remove();
  });
});

describe("focus that comes from a tap", () => {
  it("is left to Steam: the plugin does not move the pane", () => {
    const w = walkTab({ tab: "settings", viewport: MONITOR_PANE_PX, steam: "nearest" });
    expect(w.tap(8)).toBe(0);
    w.unmount();
  });
});
