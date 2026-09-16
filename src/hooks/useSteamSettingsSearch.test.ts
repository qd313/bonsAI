/**
 * Title: Settings-results card sizing and hide rule
 * Purpose: Pin the pure arithmetic behind the floating settings-results card (plan 45 / plan 56
 *          lane E): how many rows fit a given amount of room, and when the card hides itself even
 *          though there are results.
 * Used for: settingsCardRowsThatFit and shouldHideSettingsResultsCard in useSteamSettingsSearch.ts.
 * Solves: A card built on a flat cap of eight rows would cover the tab bar on the Deck's own
 *         454px-tall panel (measured, not the 696px plan 45 was drawn against) and a card with no
 *         hide rule would sit over every long question typed at the AI. Both failures are silent
 *         in a snapshot test, so this asserts the actual row counts and hide/show calls plan 45
 *         section 5's table and the plan 56 lane E brief locked.
 * Does not: Touch the DOM measuring that turns a live rect into availableHeightPx — that lives in
 *         MainTabUnifiedAskBar.tsx and is covered by MainTabUnifiedAskBar.test.tsx instead.
 */
import { describe, expect, it } from "vitest";
import {
  SETTINGS_CARD_MAX_ROWS,
  settingsCardHeightForRows,
  settingsCardRowsThatFit,
  shouldHideSettingsResultsCard,
} from "./useSteamSettingsSearch";

describe("settingsCardHeightForRows", () => {
  it("matches plan 45's own worked total for eight rows: 288px", () => {
    expect(settingsCardHeightForRows(8)).toBe(288);
  });

  it("still counts the heading and padding with zero rows", () => {
    expect(settingsCardHeightForRows(0)).toBe(6 + 22 + 6);
  });
});

describe("settingsCardRowsThatFit", () => {
  it("shows every result, up to eight, when there is plenty of room", () => {
    expect(settingsCardRowsThatFit(10_000, 3)).toEqual({ shown: 3, hiddenCount: 0 });
    expect(settingsCardRowsThatFit(10_000, 71)).toEqual({ shown: 8, hiddenCount: 63 });
  });

  it("never shows more than fit the room it was given, and counts the rest as hidden", () => {
    // Room for exactly six rows (the Deck's own built-in screen, plan 56 lane E brief) out of 71 hits.
    const sixRowRoom = settingsCardHeightForRows(6);
    expect(settingsCardRowsThatFit(sixRowRoom, 71)).toEqual({ shown: 6, hiddenCount: 65 });
  });

  it("drops to zero rather than show a row with no room for the heading", () => {
    expect(settingsCardRowsThatFit(10, 5)).toEqual({ shown: 0, hiddenCount: 5 });
  });

  it("never returns more than the eight-row cap even with room to spare", () => {
    const result = settingsCardRowsThatFit(100_000, 71);
    expect(result.shown).toBeLessThanOrEqual(SETTINGS_CARD_MAX_ROWS);
  });
});

describe("shouldHideSettingsResultsCard", () => {
  // The five sentences from plan 45 section 5's table, plus the three-word boundary case from its
  // own prose -- every one checked against the real settings list, not a stand-in.
  it("shows a four-word exact setting name that a plain three-word cut would have hidden", () => {
    expect(shouldHideSettingsResultsCard("steam client update channel")).toBe(false);
  });

  it("shows a long exact setting name the same way", () => {
    expect(shouldHideSettingsResultsCard("show switch to desktop option")).toBe(false);
  });

  it("hides a long sentence that only matches through the Deck basics word list", () => {
    expect(shouldHideSettingsResultsCard("why is my battery draining so fast")).toBe(true);
  });

  it("hides a long sentence with several word-list hits", () => {
    expect(shouldHideSettingsResultsCard("can you help me with performance")).toBe(true);
  });

  it("hides a long sentence with no results at all", () => {
    expect(shouldHideSettingsResultsCard("how do i make the screen brighter")).toBe(true);
  });

  it("does not hide an exact three-word setting name -- the cut is 'past three', not 'three or more'", () => {
    expect(shouldHideSettingsResultsCard("Enable Developer Mode")).toBe(false);
  });

  it("hides a question mark even at three words or fewer", () => {
    expect(shouldHideSettingsResultsCard("hey any tips?")).toBe(true);
  });

  it("hides empty or blank input", () => {
    expect(shouldHideSettingsResultsCard("")).toBe(true);
    expect(shouldHideSettingsResultsCard("   ")).toBe(true);
  });
});
