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

function entryCoversRole(entry: PullModelEntry, role: PullCoverageRole): boolean {
  const tags = ROLE_TAGS[role];
  if (role === "expert") {
    return entry.group === "stretch" || (entry.tags.includes("strategy") && entry.rating >= 5);
  }
  return tags.some((t) => entry.tags.includes(t));
}

export function installedCoversRole(installedTags: Set<string>, role: PullCoverageRole): boolean {
  for (const entry of PULL_MODEL_CATALOG) {
    if (!installedTags.has(entry.tag) && !installedTags.has(`${entry.tag}:latest`)) continue;
    if (entryCoversRole(entry, role)) return true;
  }
  return false;
}

export function findCoverageGaps(installedTags: Set<string>): PullCoverageRole[] {
  const roles: PullCoverageRole[] = ["speed", "strategy", "expert", "vision"];
  return roles.filter((role) => !installedCoversRole(installedTags, role));
}

export function recommendPullModelsForGaps(
  installedTags: Set<string>,
  opts?: { fossOnly?: boolean; limit?: number }
): PullModelEntry[] {
  const fossOnly = opts?.fossOnly ?? false;
  const limit = opts?.limit ?? 4;
  const gaps = findCoverageGaps(installedTags);
  if (!gaps.length) return [];

  const candidates = PULL_MODEL_CATALOG.filter((entry) => {
    if (installedTags.has(entry.tag) || installedTags.has(`${entry.tag}:latest`)) return false;
    if (fossOnly && entry.licenseClass !== "foss") return false;
    return gaps.some((role) => entryCoversRole(entry, role));
  });

  const scored = [...candidates].sort((a, b) => scorePullModelPerformance(b) - scorePullModelPerformance(a));
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
