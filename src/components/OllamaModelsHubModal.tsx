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

  const handleHubClose = useCallback(
    (reason: string) => {
      // #region agent log
      fetch("http://127.0.0.1:7548/ingest/455d5c32-fa64-45d1-b31c-f17b50f3371a", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "441b11" },
        body: JSON.stringify({
          sessionId: "441b11",
          location: "OllamaModelsHubModal.tsx:close",
          message: "Hub modal closing",
          data: { reason, section },
          timestamp: Date.now(),
          hypothesisId: "B",
        }),
      }).catch(() => {});
      // #endregion
      onClose();
    },
    [onClose, section]
  );

  const handleDone = useCallback(() => {
    if (section === "browse") {
      browseFooter.onOk();
      return;
    }
    void commitPolicyAndAdvanced()
      .then(() => handleHubClose("done"))
      .catch((err) => {
        console.error("save_settings failed (AI models hub Done)", err);
      });
  }, [section, browseFooter, commitPolicyAndAdvanced, handleHubClose]);

  const selectSection = useCallback(
    (next: OllamaModelsHubSection, source: string) => {
      // #region agent log
      fetch("http://127.0.0.1:7548/ingest/455d5c32-fa64-45d1-b31c-f17b50f3371a", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "441b11" },
        body: JSON.stringify({
          sessionId: "441b11",
          location: "OllamaModelsHubModal.tsx:selectSection",
          message: "Hub section change",
          data: { from: section, to: next, source },
          timestamp: Date.now(),
          hypothesisId: "A",
        }),
      }).catch(() => {});
      // #endregion
      setSection(next);
    },
    [section]
  );

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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectSection(chip.id, "click");
                  }}
                  {...({
                    onOKButton: (evt: { stopPropagation: () => void }) => {
                      evt.stopPropagation();
                      selectSection(chip.id, "okButton");
                    },
                  } as Record<string, unknown>)}
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
              onCancel={() => handleHubClose("browseCancel")}
              onPullAccepted={() => handleHubClose("pullAccepted")}
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
        // #region agent log
        fetch("http://127.0.0.1:7548/ingest/455d5c32-fa64-45d1-b31c-f17b50f3371a", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "441b11" },
          body: JSON.stringify({
            sessionId: "441b11",
            location: "OllamaModelsHubModal.tsx:onOK",
            message: "Hub Done pressed",
            data: { section, okDisabled },
            timestamp: Date.now(),
            hypothesisId: "C",
          }),
        }).catch(() => {});
        // #endregion
        handleDone();
      }}
      onCancel={() => handleHubClose("cancel")}
    />
  );
}
