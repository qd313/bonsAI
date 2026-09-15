/**
 * Title: Which installed AI model to try first
 *
 * Purpose: A person can have more than one AI model installed at once. Ask can use any of them,
 * but needs a starting order to try them in, and the Ollama tab needs to show that order as a
 * list. This file holds the built-in starting order — one for a plain question, a separate one
 * for a question that includes a picture — plus the rules for whether a model looks like it can
 * handle pictures, whether a model is large enough that it is a bad idea to run on the Deck's
 * shared graphics memory, and whether a model's licence is allowed under the current Settings
 * licence tier. It builds the final "try these, in this order" list that both the Ollama tab's
 * preview and the actual Ask request use.
 *
 * Used for: the Ollama tab's routing preview list, and the ranking behind the "which model would
 * help here" suggestions on the Pull Models screen.
 *
 * Solves: without one shared order and one shared set of rules, the list shown on screen could
 * disagree with the order Ask actually tries models in, and a model could look available in one
 * place while being blocked by licence rules in another.
 *
 * Does not: check which models are actually installed on the Deck right now — that comes from a
 * separate request to the back end. This file only orders and filters the list it is handed.
 *
 * Gotchas:
 *   - The starting order for both plain and picture questions has to be changed by hand
 *     alongside `ollama_routing.py` on the back end. There is no code link between the two;
 *     someone has to remember to update both.
 *   - A model counts as too large for the shared graphics memory (`isHighVramTag`) either because
 *     it is named on a fixed list of known large models, or because its listed size in the Pull
 *     Models catalog is 15 GB or more. A model that is not on that list and has no listed size is
 *     never flagged, even if it happens to be a large download.
 */
import type { PullModelEntry, PullModelLicenseClass } from "../data/pullModelCatalog";
import type { ModelPolicyTierId } from "../data/modelPolicy";

/** Keep aligned with ``ollama_routing.py`` essentials chains. */
export const DEFAULT_TEXT_ROUTING_SEED: readonly string[] = [
  "qwen2.5vl:3b",
  "qwen2.5:3b",
  "gemma4:e2b-it-qat",
  "gemma4:e2b",
  "gemma4:latest",
];

export const DEFAULT_VISION_ROUTING_SEED: readonly string[] = [
  "qwen2.5vl:3b",
  "qwen3.5:4b",
  "llava:7b",
  "gemma4:e2b-it-qat",
  "gemma4:e2b",
  "gemma3:4b",
];

const HIGH_VRAM_SIZE_GB_THRESHOLD = 15;
const MAX_MODEL_ROUTING_ORDER_LEN = 16;

const KNOWN_HIGH_VRAM_TAGS = new Set([
  "qwen2.5:32b",
  "qwen3.5:32b",
  "gemma4:31b",
  "gemma3:27b",
  "internvl3.5:38b",
  "internvl2.5:38b",
  "qwen3-vl",
  "qwen3-vl:30b-a3b",
]);

export function isVisionCapableTag(tag: string, catalogEntry?: PullModelEntry): boolean {
  if (catalogEntry?.tags.includes("vision")) return true;
  const t = tag.trim().toLowerCase();
  if (!t) return false;
  if (DEFAULT_VISION_ROUTING_SEED.some((s) => s === t || t.startsWith(`${s.split(":")[0]}:`))) return true;
  return /llava|vision|vl|internvl|moondream|bakllava/.test(t);
}

export function isHighVramTag(tag: string, sizeGb?: number): boolean {
  const t = tag.trim();
  if (KNOWN_HIGH_VRAM_TAGS.has(t)) return true;
  return typeof sizeGb === "number" && sizeGb >= HIGH_VRAM_SIZE_GB_THRESHOLD;
}

export function licenseClassAllowed(
  licenseClass: PullModelLicenseClass | undefined,
  tier: ModelPolicyTierId,
  nonFossUnlocked: boolean,
): boolean {
  const cls = licenseClass ?? "unknown";
  if (tier === "open_source_only") return cls === "foss";
  if (tier === "open_weight") return cls === "foss" || cls === "open_weight";
  if (nonFossUnlocked) return true;
  return cls === "foss" || cls === "open_weight" || cls === "non_foss";
}

export function buildPickerOrder(
  kind: "text" | "vision",
  installedTags: string[],
  savedOrder: string[],
): string[] {
  const installed = installedTags.map((t) => t.trim()).filter(Boolean);
  const instSet = new Set(installed);
  if (savedOrder.length > 0) {
    const inSaved = savedOrder.filter((t) => instSet.has(t));
    const rest = installed.filter((t) => !inSaved.includes(t));
    const merged = [...inSaved, ...rest];
    return kind === "vision" ? merged.filter((t) => isVisionCapableTag(t)) : merged;
  }
  const seed = kind === "vision" ? DEFAULT_VISION_ROUTING_SEED : DEFAULT_TEXT_ROUTING_SEED;
  const head = seed.filter((t) => instSet.has(t));
  let tail = installed.filter((t) => !head.includes(t));
  if (kind === "vision") tail = tail.filter((t) => isVisionCapableTag(t));
  return [...head, ...tail].slice(0, MAX_MODEL_ROUTING_ORDER_LEN);
}
