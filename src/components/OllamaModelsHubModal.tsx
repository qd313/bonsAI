import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ConfirmModal, Focusable } from "@decky/ui";
import type { ModelPolicyTierId } from "../data/modelPolicy";
import { ModelPolicyTierPanel, useModelPolicyTierDraft } from "./ModelPolicyTierPanel";
import {
  ModelRoutingAdvancedPanel,
  useModelRoutingAdvancedDraft,
} from "./ModelRoutingAdvancedPanel";
import { PullModelsModal, type PullModelsFooterState } from "./PullModelsModal";

export type OllamaModelsHubSection = "policy" | "browse" | "advanced";

export type OllamaModelsHubModalProps = {
  initialSection?: OllamaModelsHubSection;
  activeRoutingTag: string | null;
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  onCommitOllamaModelsHub: (patch: {
    modelPolicyTier: ModelPolicyTierId;
    modelPolicyNonFossUnlocked: boolean;
    modelAllowHighVramFallbacks: boolean;
  }) => void | Promise<void>;
  onReadModelPolicy: () => void;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  onClose: () => void;
};

const HUB_SECTIONS: { id: OllamaModelsHubSection; label: string }[] = [
  { id: "policy", label: "Policy" },
  { id: "browse", label: "Browse & pull" },
  { id: "advanced", label: "Advanced" },
];

/**
 * Unified fullscreen hub: policy tiers, browse/pull table, and advanced routing.
 */
export function OllamaModelsHubModal(props: OllamaModelsHubModalProps) {
  const {
    initialSection = "policy",
    activeRoutingTag,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    onCommitOllamaModelsHub,
    onReadModelPolicy,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    onClose,
  } = props;

  const [section, setSection] = useState<OllamaModelsHubSection>(initialSection);
  const { draftTier, draftTierRef, setDraft } = useModelPolicyTierDraft(modelPolicyTier);
  const {
    draftNonFossUnlocked,
    setDraftNonFossUnlocked,
    draftHighVram,
    setDraftHighVram,
  } = useModelRoutingAdvancedDraft(modelPolicyNonFossUnlocked, modelAllowHighVramFallbacks);

  const [browseFooter, setBrowseFooter] = useState<PullModelsFooterState>({
    okText: "Pull selected",
    onOk: () => {},
    okDisabled: true,
  });

  const draftNonFossRef = useRef(modelPolicyNonFossUnlocked);
  const draftHighVramRef = useRef(modelAllowHighVramFallbacks);
  draftNonFossRef.current = draftNonFossUnlocked;
  draftHighVramRef.current = draftHighVram;

  useEffect(() => {
    setDraftNonFossUnlocked(modelPolicyNonFossUnlocked);
    setDraftHighVram(modelAllowHighVramFallbacks);
  }, [modelPolicyNonFossUnlocked, modelAllowHighVramFallbacks, setDraftNonFossUnlocked, setDraftHighVram]);

  const handleBrowseFooterChange = useCallback((state: PullModelsFooterState) => {
    setBrowseFooter(state);
  }, []);

  const commitPolicyAndAdvanced = useCallback(async () => {
    await onCommitOllamaModelsHub({
      modelPolicyTier: draftTierRef.current,
      modelPolicyNonFossUnlocked: draftNonFossRef.current,
      modelAllowHighVramFallbacks: draftHighVramRef.current,
    });
  }, [draftTierRef, onCommitOllamaModelsHub]);

  const handleDone = useCallback(() => {
    if (section === "browse") {
      browseFooter.onOk();
      return;
    }
    void commitPolicyAndAdvanced()
      .then(() => onClose())
      .catch((err) => {
        console.error("save_settings failed (AI models hub Done)", err);
      });
  }, [section, browseFooter, commitPolicyAndAdvanced, onClose]);

  const okButtonText = section === "browse" ? browseFooter.okText : "Done";
  const okDisabled = section === "browse" ? browseFooter.okDisabled : false;

  return (
    <ConfirmModal
      strTitle="AI models"
      strDescription={
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            textAlign: "left",
            maxWidth: "100%",
            maxHeight: "min(72vh, 520px)",
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          <Focusable flow-children="horizontal" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {HUB_SECTIONS.map((chip) => {
              const active = section === chip.id;
              return (
                <Button
                  key={chip.id}
                  onClick={() => setSection(chip.id)}
                  style={{
                    flex: "1 1 auto",
                    minHeight: 32,
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(255,255,255,0.12)",
                    background: active
                      ? "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)"
                      : "rgba(255,255,255,0.04)",
                    color: active ? "#e0f2fe" : "#9fb0c0",
                  }}
                  aria-pressed={active}
                >
                  {chip.label}
                </Button>
              );
            })}
          </Focusable>
          {section === "policy" ? (
            <ModelPolicyTierPanel
              modelPolicyTier={modelPolicyTier}
              modelPolicyNonFossUnlocked={draftNonFossUnlocked}
              draftTier={draftTier}
              onDraftTierChange={setDraft}
            />
          ) : null}
          {section === "browse" ? (
            <PullModelsModal
              embedded
              activeRoutingTag={activeRoutingTag}
              onBeforeNestedDeckyModal={onBeforeNestedDeckyModal}
              onCompleteNestedDeckyModalClose={onCompleteNestedDeckyModalClose}
              onCancel={onClose}
              onPullAccepted={onClose}
              onFooterStateChange={handleBrowseFooterChange}
            />
          ) : null}
          {section === "advanced" ? (
            <ModelRoutingAdvancedPanel
              modelPolicyTier={draftTier}
              modelPolicyNonFossUnlocked={draftNonFossUnlocked}
              modelAllowHighVramFallbacks={draftHighVram}
              onModelPolicyNonFossUnlockedChange={setDraftNonFossUnlocked}
              onModelAllowHighVramFallbacksChange={setDraftHighVram}
              onSelectModelPolicyTier={setDraft}
              onReadModelPolicy={onReadModelPolicy}
            />
          ) : null}
        </div>
      }
      strOKButtonText={okButtonText}
      strCancelButtonText="Cancel"
      onOK={() => {
        if (okDisabled) return;
        handleDone();
      }}
      onCancel={onClose}
    />
  );
}
