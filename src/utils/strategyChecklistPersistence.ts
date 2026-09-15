/**
 * Title: Saving Strategy checklist progress without saving on every single tick
 *
 * Purpose: Ticking a box on the Strategy checklist should feel instant, but saving every single
 * tick to the back end the moment it happens would mean a flurry of save requests during a quick
 * run through a list. This file waits briefly after the last change before actually saving, so a
 * burst of ticks becomes one save, while still saving right away when the person leaves the
 * checklist or clears it.
 *
 * Used for: `useStrategyChecklistSession` and the Main tab's Strategy checklist.
 *
 * Solves: keeps checklist progress saved per game, without a save request firing on every single
 * toggle.
 *
 * Does not: decide what a checklist row looks like or how items are ticked — see
 * `strategyChecklist.ts` for the shape, and the Main tab components for how it is drawn.
 *
 * How it works: `scheduleStrategyChecklistSessionSave()` remembers the latest state and restarts
 * a 300ms timer on every call; only the state still standing when the timer finally fires gets
 * saved, and a pending save is replaced rather than queued alongside an older one.
 * `clearStrategyChecklistSession()` cancels a pending timer outright rather than letting a stale
 * save land afterward.
 */
import { callDeckyWithTimeout } from "./deckyCall";

import type { StrategyChecklistState } from "../types/bonsaiUi";
import { strategyChecklistToSavePayload } from "./strategyChecklist";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: StrategyChecklistState | null = null;

async function saveStrategyChecklistSessionNow(state: StrategyChecklistState): Promise<void> {
  await callDeckyWithTimeout("save_strategy_checklist_session", [
    strategyChecklistToSavePayload(state),
  ]);
}

export function scheduleStrategyChecklistSessionSave(state: StrategyChecklistState, debounceMs = 300): void {
  pendingSave = state;
  if (saveTimer != null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const snap = pendingSave;
    pendingSave = null;
    if (!snap) return;
    void saveStrategyChecklistSessionNow(snap).catch(() => {});
  }, debounceMs);
}

export async function clearStrategyChecklistSession(appId?: string): Promise<void> {
  if (saveTimer != null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingSave = null;
  await callDeckyWithTimeout("clear_strategy_checklist_session", [appId ?? ""]);
}

export async function loadStrategyChecklistSession(appId: string): Promise<StrategyChecklistState | null> {
  const raw = await callDeckyWithTimeout<[string], Record<string, unknown> | null>(
    "get_strategy_checklist_session",
    [appId]
  );
  if (!raw || typeof raw !== "object") return null;
  const { normalizeStrategyChecklistStateFromSession } = await import("./strategyChecklist");
  return normalizeStrategyChecklistStateFromSession(raw);
}
