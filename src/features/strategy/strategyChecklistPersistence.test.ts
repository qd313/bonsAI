/**
 * How it works: the route's hand-uncovered steps are kept between draws of the panel (plan 98, H).
 *
 * A person presses A on a covered step to see it; closing Quick Access and opening it again must not
 * cover it a second time. These tests keep and read the uncovered steps the way the panel does, under
 * one plugin storage key that Clear all data removes with the rest, and check the store stays small
 * and shrugs off a broken value.
 */
import { afterEach, describe, expect, it } from "vitest";

import { clearBonsaiBrowserStorage } from "../settings/clearBonsaiBrowserStorage";
import {
  STRATEGY_ROUTE_REVEALED_STORAGE_KEY,
  loadStrategyRouteRevealed,
  saveStrategyRouteRevealed,
} from "./strategyChecklistPersistence";

afterEach(() => window.localStorage.clear());

describe("the route's uncovered steps are kept", () => {
  it("reads back what was kept for a list, and nothing for another list", () => {
    saveStrategyRouteRevealed("list-a", ["2", "4"]);
    expect(loadStrategyRouteRevealed("list-a")).toEqual(["2", "4"]);
    expect(loadStrategyRouteRevealed("list-b")).toEqual([]);
  });

  it("a second keep for the same list replaces the first", () => {
    saveStrategyRouteRevealed("list-a", ["2"]);
    saveStrategyRouteRevealed("list-a", ["2", "3"]);
    expect(loadStrategyRouteRevealed("list-a")).toEqual(["2", "3"]);
  });

  it("keeps only the newest twenty lists", () => {
    for (let i = 0; i < 25; i++) saveStrategyRouteRevealed(`list-${i}`, ["2"]);
    expect(loadStrategyRouteRevealed("list-0")).toEqual([]);
    expect(loadStrategyRouteRevealed("list-4")).toEqual([]);
    expect(loadStrategyRouteRevealed("list-5")).toEqual(["2"]);
    expect(loadStrategyRouteRevealed("list-24")).toEqual(["2"]);
  });

  it("reads a broken stored value as nothing kept", () => {
    window.localStorage.setItem(STRATEGY_ROUTE_REVEALED_STORAGE_KEY, "{not json");
    expect(loadStrategyRouteRevealed("list-a")).toEqual([]);
    window.localStorage.setItem(STRATEGY_ROUTE_REVEALED_STORAGE_KEY, JSON.stringify([["list-a", [2]]]));
    expect(loadStrategyRouteRevealed("list-a")).toEqual([]);
  });

  it("Clear all data removes the uncovered steps with every other plugin key", () => {
    saveStrategyRouteRevealed("list-a", ["2"]);
    clearBonsaiBrowserStorage();
    expect(loadStrategyRouteRevealed("list-a")).toEqual([]);
  });
});
