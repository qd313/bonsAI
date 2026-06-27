import { describe, expect, it } from "vitest";
import { mergeStrategyChecklistState, normalizeStrategyChecklist } from "./strategyChecklist";

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
