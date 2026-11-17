/**
 * Title: "Open sections as you walk" on the Settings tab, walked with the D-pad (plan 105, lane C2; row P105-SECTIONS-AUTO-01)
 * Purpose: The real Settings tab, the switch on, arriving with its first section open: Down from the tab bar to the end
 *          and back Up, under the Deck's pane with Steam's three scroll rules and the monitor's pane, must stop where
 *          the every-section-open walk stops, show the sections the maintainer's rule asks for after every press,
 *          leave every stop on screen and clear of the strip, and never move the ringed row when a section above it
 *          opens or closes (checkAutoFoldWalk in src/test-harness/autoFoldWalk.tsx says each check).
 * Used for: autoFold.ts, FoldedSection.tsx, useHelpStrip.ts, holdTabBodyStop, useSettingsTabFocus.ts's finders.
 * Does not: Know the Deck's real heights; the Deck walk measures the truth.
 */
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { SETTINGS_CASE, PANES, checkAutoFoldWalk, resetAutoFoldWalk } from "../../test-harness/autoFoldWalk";

beforeEach(() => resetAutoFoldWalk());
afterEach(() => cleanup());

describe("the Settings tab with Open sections as you walk on", () => {
  for (const [viewport, steam] of PANES) {
    it(`pane ${viewport}, Steam's rule "${steam}": Down to the end and Up again stop where the every-section-open walk stops, the sections follow the rule, every stop on screen and held still`, () => {
      checkAutoFoldWalk(SETTINGS_CASE, viewport, steam);
    });
  }
});
