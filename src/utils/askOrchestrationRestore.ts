/**
 * Title: Ask flow restore helpers
 *
 * Purpose: Two small, pure functions that decide what the Ask hook's state should start out
 * as when a survived session snapshot might already answer the question — which turn is
 * expanded, and which game context to show before the first status poll has run.
 *
 * Used for: `useBonsaiAskOrchestration` calls both once, at its own `useState` initializers.
 *
 * Solves: Keeping this decision logic pure and out of the hook body is what makes it testable
 * on its own, with no React and no mocked RPCs — see the Ask hook's own test file for both.
 *
 * Does not: Read or write the survival snapshot itself — see bonsaiSessionSurvival.ts for
 * that. Does not run on every render; each is called once, at mount.
 */
import { peekBonsaiSessionPendingRestore } from "./bonsaiSessionSurvival";
import type { AskThreadExpandedTurnKey, OllamaContextUi } from "../types/bonsaiUi";

export function initialExpandedTurnKeyFromSurvival(): AskThreadExpandedTurnKey {
  const peek = peekBonsaiSessionPendingRestore();
  if (!peek) return "live";
  if (peek.expandedTurnKey !== undefined) {
    return peek.expandedTurnKey;
  }
  const legacyIdx = peek.askThreadViewIndex;
  if (legacyIdx != null && legacyIdx >= 0 && legacyIdx < peek.askThreadCollapsed.length) {
    return peek.askThreadCollapsed[legacyIdx]?.id ?? "live";
  }
  return "live";
}

/**
 * The Ask-bar footnote's game context, resolved once at mount rather than left to wait for the
 * first Ask's status poll. Measured (CHIP-ROTATION-01, runs/CHIP-ROTATION-01-carousel-sample-half-life-2.json):
 * with Half-Life 2 already running, the footnote read "Context: no active game detected" for a
 * full 96-second sample while the preset carousel already showed Half-Life 2's own chips — the
 * carousel detects the running game on mount (`Router.MainRunningApp`, same id `trackedRunningAppId`
 * tracks) but the footnote used to start from the last survived snapshot (or nothing) and only
 * ever got corrected once an Ask's status poll ran.
 *
 * `liveAppId` is the same id the preset carousel already reads on mount — when it names a running
 * game, that wins outright. Only when nothing is running does a modal-remount's survived context
 * apply, so a mid-Ask restore (disclaimer modal, tab switch) is unaffected. No repeating poll is
 * added; this runs once, at the `useState` initializer.
 */
export function resolveInitialOllamaContext(
  liveAppId: string,
  survived: OllamaContextUi | null | undefined,
): OllamaContextUi {
  const trimmed = liveAppId.trim();
  if (trimmed) {
    return { app_id: trimmed, app_context: "active" };
  }
  return survived ?? null;
}
