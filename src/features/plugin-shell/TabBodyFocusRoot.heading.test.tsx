/**
 * Title: The first heading of a plain tab is clear of the pane's top fade (plan 87, B9)
 * Purpose: Pin the Deck check for "on some tabs the top of the tab cannot be scrolled fully into view": with
 *          the ring on a tab's first control (arrived at from the tab bar, the pane at the top), the first
 *          heading starts below the 20 px the pane fades at its top, on the monitor's pane and on the Deck's
 *          own shorter one, for Ollama, Settings, Permissions, Developer and About. Before the fix the heading
 *          sat 0.8 px below the pane's top, inside the fade, and the pane could not scroll further up.
 * Used for: TabBodyFocusRoot.tsx. The same walk's scroll sizes are TabBodyFocusRoot.walk.test.tsx.
 * Does not: Paint the fade (jsdom paints nothing; its 20 px is read off the maintainer's screenshot), or
 *           prove the Deck's fade ends where that reading says; the Deck row measures the heading's brightness.
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

describe("the first heading of each plain tab", () => {
  for (const viewport of [MONITOR_PANE_PX, OWN_SCREEN_PANE_PX]) {
    for (const tab of TABS) {
      /* About's first control is 355 px down the page: on the short screen it is not in view at the top, so the heading must scroll away to show it. */
      if (TAB_GEOMETRY[tab].stops[0]![0] + 24 + TAB_GEOMETRY[tab].stops[0]![1] > viewport - 80) continue;
      it(`${tab}, pane ${viewport} px: starts below the pane's top fade when the ring first lands on the first control`, () => {
        for (const steam of RULES) {
          const w = walkTab({ tab, viewport, steam });
          expect(w.headingTopAtFirstDown, steam).toBeGreaterThanOrEqual(TOP_FADE_PX);
        }
      });
    }
  }
});
