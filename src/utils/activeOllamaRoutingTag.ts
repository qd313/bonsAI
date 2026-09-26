/**
 * Title: Which model tag counts as "in use" for the AI models screen
 *
 * Purpose: A model's Remove button is disabled while that model is the one Ask would use right
 * now, so a removal can't race a live request. `modelPolicyDisclosure` only ever names the model
 * that answered the most recent finished question -- it is not cleared once that answer settles,
 * so reusing it directly kept Remove disabled forever after any question was ever answered, until
 * the plugin reloaded (docs/test-evidence/plan64-PRELOAD-01-try3-timing.json, step6_restore).
 *
 * Used for: index.tsx, feeding useOllamaModelsHubModal's `activeRoutingTag`.
 *
 * Solves: only report a tag as active while a request is actually in flight (`isAsking`). The
 * moment the answer finishes, `isAsking` goes false and the tag stops blocking Remove -- matching
 * what a person sees ("I can remove Remove right after the answer, not just after a reload").
 *
 * Does not: know which model an in-flight request is trying right this instant if it differs from
 * the last disclosed one (the frontend is never told that). The backend's own `delete_ollama_model`
 * RPC still refuses with "in_use" if a removal genuinely races a live request for a different model;
 * this is only the screen's preemptive, best-effort disable.
 */
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";

export function activeOllamaRoutingTag(
  isAsking: boolean,
  modelPolicyDisclosure: ModelPolicyDisclosurePayload | null | undefined,
): string | null {
  if (!isAsking) return null;
  return modelPolicyDisclosure?.model ?? null;
}
