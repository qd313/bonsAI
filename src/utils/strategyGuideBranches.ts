import type { StrategyGuideBranchesPayload } from "../types/bonsaiUi";

/** Coerce RPC `strategy_guide_branches` into a typed payload or null. */
export function normalizeStrategyGuideBranches(raw: unknown): StrategyGuideBranchesPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const question = o.question;
  if (typeof question !== "string" || !question.trim()) return null;
  const options = o.options;
  if (!Array.isArray(options)) return null;
  const out: { id: string; label: string }[] = [];
  for (const item of options) {
    if (!item || typeof item !== "object") continue;
    const x = item as Record<string, unknown>;
    const id = typeof x.id === "string" ? x.id : "";
    const label = typeof x.label === "string" ? x.label.trim() : "";
    if (!label) continue;
    out.push({ id: id || String.fromCharCode(97 + out.length), label });
  }
  if (out.length < 2) return null;
  return { question: question.trim(), options: out };
}
