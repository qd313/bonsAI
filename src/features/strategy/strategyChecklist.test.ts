import { describe, expect, it } from "vitest";
import {
  mergeStrategyChecklistState,
  normalizeStrategyChecklist,
  normalizeStrategyChecklistStateFromSession,
  splitStrategyStepNeeds,
  strategyChecklistToSavePayload,
  strategyRouteCoveredIds,
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

describe("the route's hand-shown steps travel with the checklist state (plan 100, lane R)", () => {
  const FIVE = [1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `Step number ${n}` }));
  const saved = (extra: Record<string, unknown>) => ({ app_id: "367520", title: "To the first boss", items: FIVE, ...extra });

  it("a load whose entry has a revealed list gives it back on the state", () => {
    expect(normalizeStrategyChecklistStateFromSession(saved({ checked_ids: ["1"], revealed: ["3"] }))?.revealedIds).toEqual(["3"]);
  });

  it("a load whose entry has no revealed list gives none, so every later step is covered", () => {
    const state = normalizeStrategyChecklistStateFromSession(saved({ checked_ids: [] }))!;
    expect(state.revealedIds ?? []).toEqual([]);
    expect([...strategyRouteCoveredIds(state, state.revealedIds ?? [])].sort()).toEqual(["2", "3", "4", "5"]);
  });

  it("a load keeps only real step ids, once each", () => {
    expect(normalizeStrategyChecklistStateFromSession(saved({ revealed: ["3", "3", "99", 7] }))?.revealedIds).toEqual(["3"]);
  });

  it("the save payload carries the shown steps beside the ticks", () => {
    const state = { title: "T", items: FIVE, checkedIds: ["1"], revealedIds: ["3"], appId: "367520" };
    expect(strategyChecklistToSavePayload(state)).toMatchObject({ checked_ids: ["1"], revealed: ["3"] });
    expect(strategyChecklistToSavePayload({ ...state, revealedIds: undefined }).revealed).toEqual([]);
  });

  it("a revised list keeps a shown step only when the step still has the same words", () => {
    const prev = { title: "T", items: FIVE, checkedIds: [], revealedIds: ["3", "4"] };
    const incoming = { title: "T", items: FIVE.map((it) => (it.id === "4" ? { ...it, label: "Something else" } : it)) };
    expect(mergeStrategyChecklistState(prev, incoming).revealedIds).toEqual(["3"]);
    expect(mergeStrategyChecklistState(null, incoming).revealedIds).toEqual([]);
  });
});
