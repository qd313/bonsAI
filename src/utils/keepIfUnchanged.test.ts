/**
 * Title: keepIfUnchanged -- the same content keeps the same object
 * Purpose: Pin the small helper behind "a poll that brings nothing new must not re-render the
 *          plugin" (useBonsaiAskOrchestration.test.ts has the whole-hook version of that check).
 * Used for: src/utils/keepIfUnchanged.ts.
 * Does not: Cover large or cyclic values; the helper is only for small, plain poll fields.
 */
import { describe, expect, it } from "vitest";
import { keepIfUnchanged } from "./keepIfUnchanged";

describe("keepIfUnchanged", () => {
  it("keeps the old object when the new one says the same thing", () => {
    const prev = { app_id: "620", app_context: "active", app_name: "Portal 2" };
    expect(keepIfUnchanged(prev, { ...prev })).toBe(prev);
  });

  it("takes the new object when anything in it changed", () => {
    const prev = { partial: "The bombs", seconds: 3 };
    const next = { partial: "The bombs come from the pipes.", seconds: 3 };
    expect(keepIfUnchanged(prev, next)).toBe(next);
  });

  it("treats a value that cannot be written as JSON as changed", () => {
    const prev: Record<string, unknown> = {};
    prev.self = prev;
    const next: Record<string, unknown> = {};
    next.self = next;
    expect(keepIfUnchanged(prev, next)).toBe(next);
  });

  it("keeps a missing value missing", () => {
    expect(keepIfUnchanged(null, null)).toBeNull();
  });
});
