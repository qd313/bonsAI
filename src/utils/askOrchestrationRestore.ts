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
import { Router } from "@decky/ui";

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
 * The Ask box's game tag context, resolved once at mount rather than left to wait for the
 * first Ask's status poll. Measured (CHIP-ROTATION-01, runs/CHIP-ROTATION-01-carousel-sample-half-life-2.json):
 * with Half-Life 2 already running, the game line read "Context: no active game detected" for a
 * full 96-second sample while the preset carousel already showed Half-Life 2's own chips — the
 * carousel detects the running game on mount (`Router.MainRunningApp`, same id `trackedRunningAppId`
 * tracks) but the game tag used to start from the last survived snapshot (or nothing) and only
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

/**
 * The game fields the game tag should take from a back-end status (pending, finished or stopped).
 *
 * The back end's status names the game the question was asked about. A question asked before the
 * game was launched says "none" — and the mount-time status read on every panel reopen hands that
 * old status straight back. Written verbatim it blanked the line for ~1.8 s (until the next 2 s
 * poll) while the game was running the whole time (PLAN76-L6, Deck: 4 of 4). So when the status
 * names no game (no id and no name) but Steam reports one running right now, the running game wins. When the status
 * names a game, or nothing is running, the status is used exactly as before — a real "the game
 * closed" still shows "none" because the poll and the sync read Steam, not this status.
 */
export function gameFieldsFromStatus(
  statusAppId: string,
  statusAppContext: "active" | "none",
  statusAppName: string,
  /**
   * True for the one status read made when the panel mounts and the question it describes is
   * already over: that status is history, so what Steam reports now wins even over a game it
   * names (a previous game after a switch) or over a closed one.
   */
  isFinishedHistory = false,
): { app_id: string; app_context: "active" | "none"; app_name: string } {
  if (isFinishedHistory) {
    const running = Router.MainRunningApp;
    const liveAppId = (running?.appid?.toString() ?? "").trim();
    return liveAppId
      ? { app_id: liveAppId, app_context: "active", app_name: (running?.display_name ?? "").trim() }
      : { app_id: "", app_context: "none", app_name: "" };
  }
  // A status that names its game, by id or (a shortcut with no Steam id) by name, is kept as is.
  if ((statusAppContext === "active" && statusAppId.trim()) || statusAppName.trim()) {
    return { app_id: statusAppId, app_context: statusAppContext, app_name: statusAppName };
  }
  const running = Router.MainRunningApp;
  const liveAppId = (running?.appid?.toString() ?? "").trim();
  if (liveAppId) {
    return { app_id: liveAppId, app_context: "active", app_name: (running?.display_name ?? "").trim() };
  }
  return { app_id: statusAppId, app_context: statusAppContext, app_name: statusAppName };
}
