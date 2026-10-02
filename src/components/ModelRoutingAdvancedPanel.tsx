/**
 * Title: Model routing advanced panel
 * Purpose: Advanced toggles for non-FOSS unlock and high-VRAM fallback routing in the models hub.
 * Used for: OllamaModelsHubModal advanced section alongside tier selection.
 * Solves: Groups policy intro copy with tier buttons and boolean routing switches in one panel.
 * Does not: Reorder model lists — each installed model's place in the try order is set in the box's Browse
 *   screen (PullModelsTryOrder.tsx).
 */
import React from "react";
import { Button, ToggleField } from "@decky/ui";
import { MODEL_POLICY_SETTINGS_INTRO, type ModelPolicyTierId } from "../data/modelPolicy";

export type ModelRoutingAdvancedPanelProps = {
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  onModelPolicyNonFossUnlockedChange: (checked: boolean) => void;
  onModelAllowHighVramFallbacksChange: (checked: boolean) => void;
  onSelectModelPolicyTier: (t: ModelPolicyTierId) => void;
  onReadModelPolicy: () => void;
};

/** Advanced routing toggles for the AI models hub (Advanced section). */
export function ModelRoutingAdvancedPanel({
  modelPolicyTier,
  modelPolicyNonFossUnlocked,
  modelAllowHighVramFallbacks,
  onModelPolicyNonFossUnlockedChange,
  onModelAllowHighVramFallbacksChange,
  onSelectModelPolicyTier,
  onReadModelPolicy,
}: ModelRoutingAdvancedPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
      <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.45 }}>
        {MODEL_POLICY_SETTINGS_INTRO}
      </div>
      <ToggleField
        label="Allow non-FOSS and unclassified Ollama tags (Tier 3)"
        description="Required for Tier 3 / Any installed model. Turn off to fall back from Tier 3 to open-weight."
        checked={modelPolicyNonFossUnlocked}
        onChange={(checked) => {
          onModelPolicyNonFossUnlockedChange(checked);
          if (!checked && modelPolicyTier === "non_foss") {
            onSelectModelPolicyTier("open_weight");
          }
        }}
      />
      <ToggleField
        label="Allow high-VRAM models in routing"
        description="When on, newly pulled large models are added to the top of your try-order lists. When off, they keep their place in the order but are skipped at Ask time."
        checked={modelAllowHighVramFallbacks}
        onChange={onModelAllowHighVramFallbacksChange}
      />
      <Button
        className="bonsai-chat-secondary-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReadModelPolicy();
        }}
        {...({
          onOKButton: (evt: { stopPropagation: () => void }) => {
            evt.stopPropagation();
            onReadModelPolicy();
          },
        } as Record<string, unknown>)}
      >
        Read model policy (README)…
      </Button>
    </div>
  );
}

export function useModelRoutingAdvancedDraft(
  modelPolicyNonFossUnlocked: boolean,
  modelAllowHighVramFallbacks: boolean
) {
  const [draftNonFossUnlocked, setDraftNonFossUnlocked] = React.useState(modelPolicyNonFossUnlocked);
  const [draftHighVram, setDraftHighVram] = React.useState(modelAllowHighVramFallbacks);

  React.useEffect(() => {
    setDraftNonFossUnlocked(modelPolicyNonFossUnlocked);
    setDraftHighVram(modelAllowHighVramFallbacks);
  }, [modelPolicyNonFossUnlocked, modelAllowHighVramFallbacks]);

  return {
    draftNonFossUnlocked,
    setDraftNonFossUnlocked,
    draftHighVram,
    setDraftHighVram,
  };
}
