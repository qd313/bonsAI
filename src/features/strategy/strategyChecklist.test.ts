import { describe, expect, it } from "vitest";
import {
  mergeStrategyChecklistState,
  normalizeStrategyChecklist,
  splitStrategyStepNeeds,
  strategyRouteCoveredIds,
  strategyRouteRevealKey,
} from "./strategyChecklist";

describe("strategyChecklist", () => {
  it("normalizes RPC checklist payload", () => {
    const p = normalizeStrategyChecklist({
      title: "Boss",
      items: [
        { id: "a", label: "Dodge" },
        { id: "b", label: "Heal" },
      ],
    });
    expect(p?.title).toBe("Boss");
    expect(p?.items).toHaveLength(2);
  });

  it("merges checked ids by label when ids change", () => {
    const prev = {
      title: "Old",
      items: [{ id: "1", label: "Equip boots" }],
      checkedIds: ["1"],
    };
    const merged = mergeStrategyChecklistState(prev, {
      title: "New",
      items: [
        { id: "boots", label: "Equip boots" },
        { id: "drain", label: "Drain room" },
      ],
    });
    expect(merged.checkedIds).toEqual(["boots"]);
  });
});

/** Plan 98, H: the route covers every step further on than the person has got. */
describe("which route steps are covered", () => {
  const FIVE = ["1", "2", "3", "4", "5"].map((id) => ({ id, label: `Step ${id} words` }));
  const covered = (checkedIds: string[], revealed: string[] = [], items = FIVE) =>
    [...strategyRouteCoveredIds({ items, checkedIds }, revealed)].sort();

  it("a fresh five-step list opens step 1 and covers 2 to 5", () => {
    expect(covered([])).toEqual(["2", "3", "4", "5"]);
  });

  it("ticking step 1 opens step 2, and only step 2", () => {
    expect(covered(["1"])).toEqual(["3", "4", "5"]);
  });

  it("a step uncovered by hand is open, and the one after it stays covered until it is ticked", () => {
    expect(covered([], ["2"])).toEqual(["3", "4", "5"]);
    expect(covered(["2"], ["2"])).toEqual(["4", "5"]);
  });

  it("a ticked step is open even with the step before it unticked", () => {
    expect(covered(["4"])).toEqual(["2", "3"]);
  });

  it("a list shorter than three steps has no covers", () => {
    expect(covered([], [], FIVE.slice(0, 2))).toEqual([]);
    expect(covered([], [], FIVE.slice(0, 3))).toEqual(["2", "3"]);
  });

  it("names a list by its game, title and steps, so a new list starts covered again", () => {
    const a = strategyRouteRevealKey({ title: "To the first boss", items: FIVE, appId: "367520" });
    expect(strategyRouteRevealKey({ title: "To the first boss", items: FIVE, appId: "367520" })).toBe(a);
    expect(strategyRouteRevealKey({ title: "To the second boss", items: FIVE, appId: "367520" })).not.toBe(a);
    expect(strategyRouteRevealKey({ title: "To the first boss", items: FIVE.slice(1), appId: "367520" })).not.toBe(a);
    expect(strategyRouteRevealKey({ title: "To the first boss", items: FIVE, appId: "1" })).not.toBe(a);
  });
});

/** Plan 98, H: the "what you need" line is drawn only when a step's own words carry one. */
describe("a step's own 'Needs:' words", () => {
  it("splits the step's words from what it needs", () => {
    expect(splitStrategyStepNeeds("Beat the False Knight. Needs: the City Crest")).toEqual({
      text: "Beat the False Knight.",
      needs: "the City Crest",
    });
    expect(splitStrategyStepNeeds("Open the gate (needs: City Crest)")).toEqual({
      text: "Open the gate",
      needs: "City Crest",
    });
    expect(splitStrategyStepNeeds("Cross the acid — Needs: Isma's Tear.")).toEqual({
      text: "Cross the acid",
      needs: "Isma's Tear",
    });
  });

  it("leaves a step without one alone", () => {
    expect(splitStrategyStepNeeds("Drop down the well")).toEqual({ text: "Drop down the well", needs: null });
    expect(splitStrategyStepNeeds("This needs patience")).toEqual({ text: "This needs patience", needs: null });
  });

  it("leaves the words whole when nothing comes before or after 'Needs:'", () => {
    expect(splitStrategyStepNeeds("Needs: a key")).toEqual({ text: "Needs: a key", needs: null });
    expect(splitStrategyStepNeeds("Get there. Needs:")).toEqual({ text: "Get there. Needs:", needs: null });
  });
});
