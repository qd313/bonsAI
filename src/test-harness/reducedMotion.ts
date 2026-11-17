/**
 * Title: Fake the system's "less motion" choice
 * Purpose: Test helper. Makes `prefers-reduced-motion: reduce` read true or false for the rest of a test.
 * Used for: tests of the suggestion chips, which draw plain swapping chips when the system asks for less
 *           motion and decode chips otherwise (there is no setting for it since plan 105).
 * Solves: Five tests each writing the same matchMedia stub.
 * Does not: Undo itself. Call `vi.unstubAllGlobals()` in an afterEach.
 */
import { vi } from "vitest";

export function stubReducedMotion(reduce: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}
