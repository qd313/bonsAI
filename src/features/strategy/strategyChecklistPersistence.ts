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
 *
 * The steps a person uncovered by hand on the route (plan 98, H) are kept apart from the ticks, in the
 * plugin's browser storage under one `bonsai:` key, so they survive the panel closing and reopening and
 * Clear all data wipes them with every other plugin key. Only the newest `STRATEGY_ROUTE_REVEALED_MAX_LISTS`
 * lists are kept.
 */
import { callDeckyWithTimeout } from "../../shared/deckyCall";

import type { StrategyChecklistState } from "../../types/bonsaiUi";
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

export const STRATEGY_ROUTE_REVEALED_STORAGE_KEY = "bonsai:strategy-route-revealed";
const STRATEGY_ROUTE_REVEALED_MAX_LISTS = 20;

type RevealedEntry = [listKey: string, ids: string[]];

function readRevealedEntries(): RevealedEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STRATEGY_ROUTE_REVEALED_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RevealedEntry =>
        Array.isArray(e) && typeof e[0] === "string" && Array.isArray(e[1]) && e[1].every((x) => typeof x === "string"),
    );
  } catch {
    return [];
  }
}

/** The steps uncovered by hand on one list (`strategyRouteRevealKey`); empty when none or storage is unreadable. */
export function loadStrategyRouteRevealed(listKey: string): string[] {
  return readRevealedEntries().find(([k]) => k === listKey)?.[1] ?? [];
}

/** Keep the steps uncovered by hand on one list; that list becomes the newest, the oldest past the cap goes. */
export function saveStrategyRouteRevealed(listKey: string, ids: readonly string[]): void {
  const rest = readRevealedEntries().filter(([k]) => k !== listKey);
  const next: RevealedEntry[] = [...rest, [listKey, [...ids]] as RevealedEntry].slice(-STRATEGY_ROUTE_REVEALED_MAX_LISTS);
  try {
    window.localStorage.setItem(STRATEGY_ROUTE_REVEALED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the step stays uncovered until the panel is drawn again */
  }
}
