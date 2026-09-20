/**
 * Title: Model policy tier draft state
 *
 * Purpose: `useModelPolicyTierDraft` — the small draft-until-Done state hook OllamaModelsHubModal
 * uses to hold a pending Licence pick before the person presses Done.
 *
 * Used for: OllamaModelsHubModal, wiring the Filters panel's Licence rows inside PullModelsModal.
 *
 * Solves: A local draft the parent can commit or discard as a whole, together with the Advanced
 * toggles, instead of writing to settings on every tap.
 *
 * Does not: Classify installed tags or enforce pulls — backend model policy service owns
 * classification. Does not draw anything any more, either: until 2026-09-20 this file also
 * exported `ModelPolicyTierPanel`, the three-button tier picker for the AI models hub's own
 * standalone Policy section. Plan 62, § 3d folded that choice into one of the Filters panel's
 * rows inside PullModelsModal instead (see `entryMatchesLicenceTier` there) — the picker itself is
 * gone, the draft hook it always shared with the rest of the hub stays.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ModelPolicyTierId } from "../data/modelPolicy";

export function useModelPolicyTierDraft(modelPolicyTier: ModelPolicyTierId) {
  const [draftTier, setDraftTier] = useState<ModelPolicyTierId>(() => modelPolicyTier);
  const draftTierRef = useRef<ModelPolicyTierId>(modelPolicyTier);

  useEffect(() => {
    draftTierRef.current = modelPolicyTier;
    setDraftTier(modelPolicyTier);
  }, [modelPolicyTier]);

  const setDraft = useCallback((id: ModelPolicyTierId) => {
    draftTierRef.current = id;
    setDraftTier(id);
  }, []);

  return { draftTier, draftTierRef, setDraft };
}
