import React, { useCallback } from "react";
import { Button, ConfirmModal, PanelSection, PanelSectionRow, showModal } from "@decky/ui";
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

type ModalProps = {
  onClose: () => void;
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  onSelectModelPolicyTier: (t: ModelPolicyTierId) => void;
};

function PermissionsTabModelPolicyDetailModalContent(props: ModalProps) {
  const { onClose, modelPolicyTier, modelPolicyNonFossUnlocked, onSelectModelPolicyTier } = props;

  return (
    <ConfirmModal
      strTitle="AI model choice"
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
            {MODEL_POLICY_PERMISSIONS_INTRO}
            {modelPolicyTier === "non_foss" && !modelPolicyNonFossUnlocked ? (
              <span style={{ display: "block", marginTop: 8, color: "#fbbf24" }}>
                Enable Tier 3 unlock under Developer → Model routing (advanced) before choosing Any installed model.
              </span>
            ) : null}
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
                      ? `${MODEL_POLICY_TIER_LABELS_PLAIN[id]} (enable Tier 3 unlock in Developer first)`
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
  onSelectModelPolicyTier: (t: ModelPolicyTierId) => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

/**
 * Compact model policy: one row opens a modal with tier selection (advanced unlocks live in Developer tab).
 */
export function PermissionsTabModelPolicyPanel(props: PermissionsTabModelPolicyPanelProps) {
  const {
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    onSelectModelPolicyTier,
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
        onSelectModelPolicyTier={onSelectModelPolicyTier}
      />
    );
  }, [
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    onSelectModelPolicyTier,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
  ]);

  return (
    <PanelSection title="AI model choice">
      <PanelSectionRow>
        <div className="bonsai-settings-bleed" style={{ width: "100%", minWidth: 0 }}>
          <div className="bonsai-prose" style={{ fontSize: 11, color: "#8fa0b4", lineHeight: 1.35, marginBottom: 8 }}>
            Which installed models bonsAI may try. Open for options.
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
            aria-label="Open AI model choice options"
          >
            {MODEL_POLICY_TIER_LABELS_PLAIN[modelPolicyTier]}
          </Button>
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}
