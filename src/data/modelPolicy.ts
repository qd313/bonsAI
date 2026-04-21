/**
 * Model policy tiers and disclosure copy. Backend classifies tags; UI explains tradeoffs.
 */

const GITHUB_REPO_BASE = "https://github.com/cantcurecancer/bonsAI";

/** README `### Model policy tiers` anchor on GitHub. */
export const MODEL_POLICY_README_URL = `${GITHUB_REPO_BASE}/blob/main/README.md#model-policy-tiers`;

export type ModelSourceClass = "foss" | "open_weight" | "non_foss" | "unknown";

export type ModelPolicyTierId = "open_source_only" | "open_weight" | "non_foss";

export type ModelPolicyDisclosurePayload = {
  model: string;
  source_class: ModelSourceClass;
  read_more_anchor: string;
};

export const MODEL_POLICY_TIER_IDS: readonly ModelPolicyTierId[] = [
  "open_source_only",
  "open_weight",
  "non_foss",
];

export const DEFAULT_MODEL_POLICY_TIER: ModelPolicyTierId = "open_source_only";

export function normalizeModelPolicyTier(value: unknown): ModelPolicyTierId {
  if (value === "open_source_only" || value === "open_weight" || value === "non_foss") {
    return value;
  }
  return DEFAULT_MODEL_POLICY_TIER;
}

export function normalizeModelPolicyNonFossUnlocked(value: unknown): boolean {
  return value === true;
}

export const MODEL_POLICY_TIER_LABELS: Record<ModelPolicyTierId, string> = {
  open_source_only: "Tier 1 — Open-source only",
  open_weight: "Tier 2 — Open-source + open model (open-weight)",
  non_foss: "Tier 3 — Include non-FOSS + unclassified tags",
};

/** Short Settings helper: what changes vs staying on Tier 1. */
export const MODEL_POLICY_SETTINGS_INTRO =
  "Tier 1 (default) limits fallbacks to FOSS-friendly tags. Tier 2 adds open-weight names; Tier 3 can include non-FOSS and unclassified tags when unlocked. Only changes which tags the plugin tries—your host still decides what is installed.";

export function disclosureSummaryForSourceClass(sourceClass: ModelSourceClass): string {
  switch (sourceClass) {
    case "foss":
      return (
        "This reply used a model family bonsAI treats as open-source–aligned for routing (not legal advice). " +
        "Training code and license may still differ from your personal definition of FOSS."
      );
    case "open_weight":
      return (
        "This reply used an “open model” (open-weight): weights are typically published for local use, but the training stack, " +
        "evaluation assets, or license terms can differ from Tier 1 open-source expectations (including use or redistribution limits)."
      );
    case "non_foss":
      return (
        "This reply used a model family bonsAI classifies as outside FOSS/open-weight defaults for routing. " +
        "Read the upstream license before relying on it for sensitive or commercial use."
      );
    case "unknown":
      return (
        "This Ollama tag is not in bonsAI’s curated list. It is only tried when Tier 3 and the explicit unlock are enabled; " +
        "treat license and trust as unknown until you verify upstream terms."
      );
    default:
      return "";
  }
}
