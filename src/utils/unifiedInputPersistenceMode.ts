import type { UnifiedInputPersistenceMode } from "./settingsAndResponse";

/**
 * Clear the Ask field only when the user switches *into* no_persist — not on every mount while
 * already in no_persist (Decky remounts Content after showModal and session survival restores input).
 */
export function shouldClearUnifiedInputForPersistenceMode(
  previous: UnifiedInputPersistenceMode | null,
  next: UnifiedInputPersistenceMode
): boolean {
  return next === "no_persist" && previous !== null && previous !== "no_persist";
}
