/**
 * Title: Suggesting which model to download next
 *
 * Purpose: The Pull Models screen can suggest a model to download based on what is missing from
 * what is already installed. This file works out what is missing — a fast small model, a
 * strategy-guide model, an "expert"-level model, or a model that can read pictures — and scores
 * the catalog entries by roughly how good the answer is for how much the download costs in
 * space, so the best fit for the gap gets suggested first.
 *
 * Used for: the Pull Models screen's coverage hints, and the essentials recommendations shown on
 * the Ollama tab.
 *
 * Solves: without this, "should I download this" would be a judgement call made by eye each
 * time, rather than a suggestion tied to what is actually installed already.
 *
 * Does not: install anything — pulling a model is a separate request to the back end and the
 * Pull Models screen's own actions.
 *
 * Gotchas:
 *   - A single installed model that can chat, read pictures, and either do strategy or read text
 *     out of images all at once is treated as covering every gap by itself
 *     (`installedSwissArmyEntry`), which skips the rest of the check entirely. Such an installed
 *     all-rounder model means no gaps are reported at all, even if, say, no dedicated fast model
 *     is installed.
 */
import {
  PULL_MODEL_CATALOG,
  type PullModelEntry,
  type PullModelUseTag,
} from "../data/pullModelCatalog";

export type PullCoverageRole = "speed" | "strategy" | "expert" | "vision";

const ROLE_TAGS: Record<PullCoverageRole, PullModelUseTag[]> = {
  speed: ["chat"],
  strategy: ["strategy"],
  expert: ["strategy"],
  vision: ["vision", "ocr"],
};

/** Higher = better performance-per-latency heuristic (rating per GB, multimodal bonus). */
export function scorePullModelPerformance(entry: PullModelEntry): number {
  const gb = Math.max(entry.sizeGb, 0.35);
  const multimodal =
    entry.tags.includes("vision") && entry.tags.includes("chat") ? 1.35 : entry.tags.includes("vision") ? 1.15 : 1;
  return (entry.rating / gb) * multimodal;
}

function entryIsSwissArmyMultimodal(entry: PullModelEntry): boolean {
  return (
    entry.tags.includes("chat") &&
    entry.tags.includes("vision") &&
    (entry.tags.includes("strategy") || entry.tags.includes("ocr"))
  );
}

function installedSwissArmyEntry(
  installedTags: Set<string>,
  catalog: readonly PullModelEntry[]
): PullModelEntry | undefined {
  for (const entry of catalog) {
    if (!installedTags.has(entry.tag) && !installedTags.has(`${entry.tag}:latest`)) continue;
    if (entryIsSwissArmyMultimodal(entry)) return entry;
  }
  return undefined;
}

function entryCoversRole(entry: PullModelEntry, role: PullCoverageRole): boolean {
  const tags = ROLE_TAGS[role];
  if (role === "expert") {
    return entry.group === "stretch" || (entry.tags.includes("strategy") && entry.rating >= 5);
  }
  return tags.some((t) => entry.tags.includes(t));
}

function installedCoversRole(
  installedTags: Set<string>,
  role: PullCoverageRole,
  catalog: readonly PullModelEntry[] = PULL_MODEL_CATALOG
): boolean {
  for (const entry of catalog) {
    if (!installedTags.has(entry.tag) && !installedTags.has(`${entry.tag}:latest`)) continue;
    if (entryCoversRole(entry, role)) return true;
  }
  return false;
}

export function findCoverageGaps(
  installedTags: Set<string>,
  catalog: readonly PullModelEntry[] = PULL_MODEL_CATALOG
): PullCoverageRole[] {
  if (installedSwissArmyEntry(installedTags, catalog)) return [];
  const roles: PullCoverageRole[] = ["speed", "strategy", "expert", "vision"];
  return roles.filter((role) => !installedCoversRole(installedTags, role, catalog));
}

export function recommendPullModelsForGaps(
  installedTags: Set<string>,
  opts?: { fossOnly?: boolean; limit?: number; catalog?: readonly PullModelEntry[] }
): PullModelEntry[] {
  const fossOnly = opts?.fossOnly ?? false;
  const limit = opts?.limit ?? 1;
  const catalog = opts?.catalog ?? PULL_MODEL_CATALOG;
  const gaps = findCoverageGaps(installedTags, catalog);
  if (!gaps.length) return [];

  const candidates = catalog.filter((entry) => {
    if (installedTags.has(entry.tag) || installedTags.has(`${entry.tag}:latest`)) return false;
    if (fossOnly && entry.licenseClass !== "foss") return false;
    return gaps.some((role) => entryCoversRole(entry, role));
  });

  const scored = [...candidates].sort((a, b) => {
    const aEss = a.group === "essentials" ? 1 : 0;
    const bEss = b.group === "essentials" ? 1 : 0;
    if (aEss !== bEss) return bEss - aEss;
    return scorePullModelPerformance(b) - scorePullModelPerformance(a);
  });
  const picked: PullModelEntry[] = [];
  const covered = new Set<PullCoverageRole>();

  for (const entry of scored) {
    const fills = gaps.filter((role) => !covered.has(role) && entryCoversRole(entry, role));
    if (!fills.length) continue;
    picked.push(entry);
    for (const role of fills) covered.add(role);
    if (covered.size >= gaps.length || picked.length >= limit) break;
  }

  return picked;
}
