import type { StrategyChecklistPayload, StrategyChecklistState } from "../types/bonsaiUi";

/** Coerce RPC `strategy_checklist` into a typed payload or null. */
export function normalizeStrategyChecklist(raw: unknown): StrategyChecklistPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = o.title;
  if (typeof title !== "string" || !title.trim()) return null;
  const items = o.items;
  if (!Array.isArray(items)) return null;
  const out: { id: string; label: string }[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const x = item as Record<string, unknown>;
    const id = typeof x.id === "string" ? x.id.trim() : "";
    const label = typeof x.label === "string" ? x.label.trim() : "";
    if (!label) continue;
    out.push({ id: id || String(out.length + 1), label });
  }
  if (out.length < 2) return null;
  return { title: title.trim(), items: out };
}

export function normalizeStrategyChecklistStateFromSession(raw: unknown): StrategyChecklistState | null {
  const base = normalizeStrategyChecklist(raw);
  if (!base) return null;
  const o = raw as Record<string, unknown>;
  const checkedRaw = o.checked_ids ?? o.checkedIds;
  const checkedIds: string[] = [];
  if (Array.isArray(checkedRaw)) {
    const valid = new Set(base.items.map((it) => it.id));
    for (const x of checkedRaw) {
      const id = String(x ?? "").trim();
      if (id && valid.has(id) && !checkedIds.includes(id)) checkedIds.push(id);
    }
  }
  return {
    ...base,
    checkedIds,
    appId: typeof o.app_id === "string" ? o.app_id : typeof o.appId === "string" ? o.appId : undefined,
    appName:
      typeof o.app_name === "string" ? o.app_name : typeof o.appName === "string" ? o.appName : undefined,
  };
}

/** Preserve user-checked steps when the model revises item ids on the next reply. */
export function mergeStrategyChecklistState(
  prev: StrategyChecklistState | null,
  incoming: StrategyChecklistPayload,
  ctx?: { appId?: string; appName?: string },
): StrategyChecklistState {
  const prevChecked = new Set(prev?.checkedIds ?? []);
  const prevById = new Map((prev?.items ?? []).map((it) => [it.id, it.label.trim().toLowerCase()]));
  const checkedIds: string[] = [];
  for (const item of incoming.items) {
    if (prevChecked.has(item.id)) {
      checkedIds.push(item.id);
      continue;
    }
    const norm = item.label.trim().toLowerCase();
    for (const [pid, plab] of prevById.entries()) {
      if (plab === norm && prevChecked.has(pid)) {
        checkedIds.push(item.id);
        break;
      }
    }
  }
  return {
    ...incoming,
    checkedIds,
    appId: ctx?.appId ?? prev?.appId,
    appName: ctx?.appName ?? prev?.appName,
  };
}

export function strategyChecklistToAskPayload(state: StrategyChecklistState | null) {
  if (!state) return undefined;
  return {
    title: state.title,
    items: state.items,
    checked_ids: state.checkedIds,
    app_id: state.appId ?? "",
    app_name: state.appName ?? "",
  };
}

export function strategyChecklistToSavePayload(state: StrategyChecklistState) {
  return {
    title: state.title,
    items: state.items,
    checked_ids: state.checkedIds,
    app_id: state.appId ?? "",
    app_name: state.appName ?? "",
  };
}
