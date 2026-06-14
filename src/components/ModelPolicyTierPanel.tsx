import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@decky/ui";
import {
  MODEL_POLICY_PERMISSIONS_INTRO,
  MODEL_POLICY_TIER_IDS,
  MODEL_POLICY_TIER_LABELS_PLAIN,
  type ModelPolicyTierId,
} from "../data/modelPolicy";

const TIER_SELECTED_CHROME: Record<ModelPolicyTierId, { border: string; background: string }> = {
  open_source_only: {
    border: "1px solid rgba(74, 222, 128, 0.9)",
    background: "rgba(18, 48, 32, 0.92)",
  },
  open_weight: {
    border: "1px solid rgba(251, 146, 60, 0.92)",
    background: "rgba(52, 32, 14, 0.92)",
  },
  non_foss: {
    border: "1px solid rgba(248, 113, 113, 0.92)",
    background: "rgba(48, 20, 24, 0.92)",
  },
};

const TIER_BUTTON_IDLE = {
  border: "1px solid rgba(58, 76, 96, 0.85)",
  background: "rgba(26, 34, 44, 0.88)",
};

const TIER_BUTTON_TEXT_COLOR = "#e2e8f0";

const TIER_LIST_HOST: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 8,
  border: "1px solid rgba(72, 98, 124, 0.45)",
  background: "rgba(12, 18, 26, 0.96)",
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export type ModelPolicyTierPanelProps = {
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  draftTier: ModelPolicyTierId;
  onDraftTierChange: (id: ModelPolicyTierId) => void;
};

/** Policy tier buttons for the AI models hub (Policy section). */
export function ModelPolicyTierPanel({
  modelPolicyTier,
  modelPolicyNonFossUnlocked,
  draftTier,
  onDraftTierChange,
}: ModelPolicyTierPanelProps) {
  const selectDraftTier = useCallback(
    (id: ModelPolicyTierId) => {
      if (id === "non_foss" && !modelPolicyNonFossUnlocked) return;
      onDraftTierChange(id);
    },
    [modelPolicyNonFossUnlocked, onDraftTierChange]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        textAlign: "left",
        maxWidth: "100%",
      }}
    >
      <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
        {MODEL_POLICY_PERMISSIONS_INTRO}
        {modelPolicyTier === "non_foss" && !modelPolicyNonFossUnlocked ? (
          <span style={{ display: "block", marginTop: 8, color: "#fbbf24" }}>
            Enable Tier 3 unlock under Advanced in this hub before choosing Any installed model.
          </span>
        ) : null}
      </div>
      <div style={TIER_LIST_HOST}>
        {MODEL_POLICY_TIER_IDS.map((id) => {
          const selected = draftTier === id;
          const tier3Disabled = id === "non_foss" && !modelPolicyNonFossUnlocked;
          const chrome = selected ? TIER_SELECTED_CHROME[id] : TIER_BUTTON_IDLE;
          return (
            <Button
              key={id}
              disabled={tier3Disabled}
              focusable={!tier3Disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectDraftTier(id);
              }}
              {...({
                onOKButton: (evt: { stopPropagation: () => void }) => {
                  evt.stopPropagation();
                  selectDraftTier(id);
                },
              } as Record<string, unknown>)}
              aria-label={
                tier3Disabled
                  ? `${MODEL_POLICY_TIER_LABELS_PLAIN[id]} (enable Tier 3 unlock in Advanced first)`
                  : MODEL_POLICY_TIER_LABELS_PLAIN[id]
              }
              style={{
                width: "100%",
                border: chrome.border,
                background: chrome.background,
                boxSizing: "border-box",
                color: TIER_BUTTON_TEXT_COLOR,
                opacity: tier3Disabled ? 0.4 : 1,
              }}
            >
              {MODEL_POLICY_TIER_LABELS_PLAIN[id]}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

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
