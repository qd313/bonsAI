/**
 * Title: Turning a model's fork in the conversation into something the screen can trust
 *
 * Purpose: A Strategy reply can offer the person a fork in the conversation — "want the
 * early-game plan, or the boss fight?" — as a set of labelled choices instead of plain prose.
 * This file turns whatever the back end sends for that fork into a shape the screen can trust,
 * or nothing at all if the shape does not hold up.
 *
 * Used for: `useBackgroundGameAi`'s handling of a Strategy reply, and the Main tab's branch
 * buttons.
 *
 * Solves: without this check, a malformed or partial message from the back end could reach the
 * screen as broken buttons — one with no real label, or a fork offering only a single choice.
 *
 * Does not: draw the branch buttons — see the Main tab's Strategy guide components.
 *
 * Gotchas:
 *   - A fork needs at least two real, labelled choices to be shown at all; fewer than that and
 *     this returns nothing usable rather than a one-button "choice".
 */
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
