import { call } from "@decky/api";

import type { StrategyChecklistState } from "../types/bonsaiUi";
import { strategyChecklistToSavePayload } from "./strategyChecklist";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: StrategyChecklistState | null = null;

export async function saveStrategyChecklistSessionNow(state: StrategyChecklistState): Promise<void> {
  await call("save_strategy_checklist_session", strategyChecklistToSavePayload(state));
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
  await call("clear_strategy_checklist_session", appId ?? "");
}

export async function loadStrategyChecklistSession(appId: string): Promise<StrategyChecklistState | null> {
  const raw = await call<[string], Record<string, unknown> | null>("get_strategy_checklist_session", appId);
  if (!raw || typeof raw !== "object") return null;
  const { normalizeStrategyChecklistStateFromSession } = await import("./strategyChecklist");
  return normalizeStrategyChecklistStateFromSession(raw);
}
