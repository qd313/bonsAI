/**
 * Title: The three model policy tiers
 *
 * Purpose: bonsAI limits which AI models it will fall back to, controlled by
 * a three-step tier picker: Tier 1 "Open source only" (the safe default),
 * Tier 2 "Also try open-weight models", and Tier 3 "Any installed model"
 * (locked behind an extra confirmation). This file holds the three tier ids,
 * their on-screen labels, and the paragraph shown under a reply explaining
 * what kind of model answered it and what that license class means.
 *
 * Used for: the tier panel in Permissions, and the small disclosure line
 * shown under a reply when the model that answered was not Tier 1.
 *
 * Solves: the tier panel, the short intro text shown on two different tabs,
 * and the disclosure line under a reply all need to agree on what the three
 * tiers are called and what each one promises — this is the one place that
 * wording is written.
 *
 * Does not: decide which license class a given Ollama tag actually belongs
 * to. That classification (foss / open_weight / non_foss / unknown) is
 * worked out on the computer or Deck running the AI, in
 * `py_modules/backend/services/model_policy.py`; this file only turns
 * whichever class comes back into words for the screen.
 */
const GITHUB_REPO_BASE = "https://github.com/qd313/bonsAI";

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

/** Plain-language tier labels for Ollama tab / AI models hub. */
export const MODEL_POLICY_TIER_LABELS_PLAIN: Record<ModelPolicyTierId, string> = {
  open_source_only: "Open source only (recommended)",
  open_weight: "Also try open-weight models",
  non_foss: "Any installed model",
};

/** Short AI models hub intro (Advanced section holds full FOSS/Tier disclosure). */
export const MODEL_POLICY_PERMISSIONS_INTRO =
  "Controls which installed models bonsAI will try, in order. Your PC or Deck still decides what is installed.";

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
