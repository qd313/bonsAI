import React, { useCallback } from "react";
import { Button, ConfirmModal, PanelSection, PanelSectionRow, showModal, ToggleField } from "@decky/ui";
import {
  MODEL_POLICY_SETTINGS_INTRO,
  MODEL_POLICY_TIER_IDS,
  MODEL_POLICY_TIER_LABELS,
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

type ModalProps = {
  onClose: () => void;
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  onSelectModelPolicyTier: (t: ModelPolicyTierId) => void;
  setModelPolicyNonFossUnlocked: (v: boolean) => void;
  setModelAllowHighVramFallbacks: (v: boolean) => void;
  onReadModelPolicy: () => void;
};

function PermissionsTabModelPolicyDetailModalContent(props: ModalProps) {
  const {
    onClose,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    onSelectModelPolicyTier,
    setModelPolicyNonFossUnlocked,
    setModelAllowHighVramFallbacks,
    onReadModelPolicy,
  } = props;

  return (
    <ConfirmModal
      strTitle="Model policy"
      strDescription={
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            textAlign: "left",
            maxWidth: "100%",
            maxHeight: "min(72vh, 480px)",
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
            {MODEL_POLICY_SETTINGS_INTRO}
          </div>
          <div style={TIER_LIST_HOST}>
            {MODEL_POLICY_TIER_IDS.map((id) => {
              const selected = modelPolicyTier === id;
              const tier3Disabled = id === "non_foss" && !modelPolicyNonFossUnlocked;
              const chrome = selected ? TIER_SELECTED_CHROME[id] : TIER_BUTTON_IDLE;
              return (
                <Button
                  key={id}
                  disabled={tier3Disabled}
                  onClick={() => {
                    if (tier3Disabled) return;
                    onSelectModelPolicyTier(id);
                  }}
                  aria-label={
                    tier3Disabled
                      ? `${MODEL_POLICY_TIER_LABELS[id]} (turn on the Tier 3 unlock below first)`
                      : MODEL_POLICY_TIER_LABELS[id]
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
                  {MODEL_POLICY_TIER_LABELS[id]}
                </Button>
              );
            })}
          </div>
          <div style={{ width: "100%", paddingTop: 4, boxSizing: "border-box" }}>
            <ToggleField
              label="Allow non-FOSS and unclassified Ollama tags (Tier 3)"
              description="Required for Tier 3; unclassified tags only run when this is on. Turn off to fall back from Tier 3 to Tier 2."
              checked={modelPolicyNonFossUnlocked}
              onChange={(checked) => {
                setModelPolicyNonFossUnlocked(checked);
                if (!checked && modelPolicyTier === "non_foss") {
                  onSelectModelPolicyTier("open_weight");
                }
              }}
            />
          </div>
          <div style={{ width: "100%" }}>
            <ToggleField
              label="Allow high-VRAM model fallbacks"
              description="Adds large-model tags after the ~16GB-friendly chain. Can OOM or load slowly—leave off unless you use those tags on purpose."
              checked={modelAllowHighVramFallbacks}
              onChange={(checked) => setModelAllowHighVramFallbacks(checked)}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
            <Button
              onClick={() => {
                onReadModelPolicy();
              }}
            >
              Read model policy (README)…
            </Button>
          </div>
        </div>
      }
      strOKButtonText="Done"
      onOK={onClose}
      onCancel={onClose}
    />
  );
}

export type PermissionsTabModelPolicyPanelProps = {
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  onSelectModelPolicyTier: (t: ModelPolicyTierId) => void;
  setModelPolicyNonFossUnlocked: (v: boolean) => void;
  setModelAllowHighVramFallbacks: (v: boolean) => void;
  onReadModelPolicy: () => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

/**
 * Compact model policy: one row opens a modal with full tier selection, unlocks, and README.
 */
export function PermissionsTabModelPolicyPanel(props: PermissionsTabModelPolicyPanelProps) {
  const {
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    onSelectModelPolicyTier,
    setModelPolicyNonFossUnlocked,
    setModelAllowHighVramFallbacks,
    onReadModelPolicy,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
  } = props;

  const openDetailModal = useCallback(() => {
    onBeforeDeckyModal();
    const handle = showModal(
      <PermissionsTabModelPolicyDetailModalContent
        onClose={() => onCompleteDeckyModalClose(() => handle.Close())}
        modelPolicyTier={modelPolicyTier}
        modelPolicyNonFossUnlocked={modelPolicyNonFossUnlocked}
        modelAllowHighVramFallbacks={modelAllowHighVramFallbacks}
        onSelectModelPolicyTier={onSelectModelPolicyTier}
        setModelPolicyNonFossUnlocked={setModelPolicyNonFossUnlocked}
        setModelAllowHighVramFallbacks={setModelAllowHighVramFallbacks}
        onReadModelPolicy={onReadModelPolicy}
      />
    );
  }, [
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    onSelectModelPolicyTier,
    setModelPolicyNonFossUnlocked,
    setModelAllowHighVramFallbacks,
    onReadModelPolicy,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
  ]);

  return (
    <PanelSection title="Model policy">
      <PanelSectionRow>
        <div className="bonsai-settings-bleed" style={{ width: "100%", minWidth: 0 }}>
          <div className="bonsai-prose" style={{ fontSize: 11, color: "#8fa0b4", lineHeight: 1.35, marginBottom: 8 }}>
            Which Ollama tag families the plugin may try. Open for details and tier selection.
          </div>
          <Button
            onClick={openDetailModal}
            style={{
              width: "100%",
              minHeight: 36,
              fontSize: 12,
              fontWeight: 600,
              textAlign: "left",
            }}
            aria-label="Open model policy options"
          >
            {MODEL_POLICY_TIER_LABELS[modelPolicyTier]}
          </Button>
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}
