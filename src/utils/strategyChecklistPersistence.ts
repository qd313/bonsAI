/**
 * Title: Strategy checklist persistence
 * Purpose: Debounced and immediate save/clear of strategy checklist session state via RPC.
 * Used for: useStrategyChecklistSession and MainTab strategy checklist UI.
 * Solves: Durable checklist progress per game without spamming save on every toggle.
 * Does not: Render checklist rows — see strategyChecklist types and MainTab components.
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
