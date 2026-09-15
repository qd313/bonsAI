/**
 * Title: Deciding the one moment to clear the Ask box for "do not remember"
 *
 * Purpose: The Ask box can be set to remember what was typed in it between openings, or to
 * always start empty ("do not remember"). This file decides the one moment that starting-empty
 * setting should actually clear whatever is currently typed: only right when the person switches
 * into it, never on every reopening of the panel while already in that mode.
 *
 * Used for: `usePluginSettings`, and the Ask box's own mount handling after the panel is torn
 * down and rebuilt.
 *
 * Solves: without this check, every panel reopen while already set to "do not remember" would
 * also wipe text that a completely different feature (restoring the last session) had just put
 * back into the box — even though the person never actually asked for that setting to do
 * anything at that moment.
 *
 * Does not: remember or save the actual text typed. That belongs to session-restore and to the
 * setting's own save path, not to this file, which only answers the single "should I clear it
 * right now" question.
 */
import type { UnifiedInputPersistenceMode } from "../data/bonsaiSettingsSchema";
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
