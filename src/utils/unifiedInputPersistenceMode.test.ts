import { describe, expect, it } from "vitest";
import { shouldClearUnifiedInputForPersistenceMode } from "./unifiedInputPersistenceMode";

describe("shouldClearUnifiedInputForPersistenceMode", () => {
  it("does not clear on initial mount while already no_persist", () => {
    expect(shouldClearUnifiedInputForPersistenceMode(null, "no_persist")).toBe(false);
  });

  it("does not clear when staying on a persist mode", () => {
    expect(shouldClearUnifiedInputForPersistenceMode("persist_all", "persist_all")).toBe(false);
  });

  it("clears when user switches into no_persist", () => {
    expect(shouldClearUnifiedInputForPersistenceMode("persist_all", "no_persist")).toBe(true);
    expect(shouldClearUnifiedInputForPersistenceMode("persist_search_only", "no_persist")).toBe(true);
  });

  it("does not clear when leaving no_persist", () => {
    expect(shouldClearUnifiedInputForPersistenceMode("no_persist", "persist_all")).toBe(false);
  });
});
