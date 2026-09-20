/**
 * Title: The AI models screen
 *
 * Purpose: The full-screen popup for everything about which AI models this
 * plugin can use: browsing and downloading models (with the model licence
 * choice folded in as one of the Browse screen's own filters), plus a set
 * of advanced routing switches reached from a small "Advanced" link. It
 * keeps a change to either as a draft until the person presses Done, at
 * which point every pending change is saved together.
 *
 * Used for: The Ollama tab's "Manage models" entry.
 *
 * Solves: Puts the licence choice, the download catalog, and the advanced
 * switches behind one Done button instead of separate popups each with
 * their own save step, so opening Advanced does not lose an unsaved pick.
 *
 * Does not: Install Ollama itself, or actually download a model — the
 * browse-and-pull screen is a separate component (PullModelsModal) that
 * this file only hosts and asks to save on Done.
 *
 * Gotchas:
 * - While the Browse screen is open with nothing queued to pull, Done
 *   means "save the licence pick and close", not "pull" — see handleDone.
 *   PullModelsModal reports back through onFooterStateChange whether
 *   something is actually queued (hasQueuedPull), and this file only lets
 *   Done act as "Pull selected" once it is.
 * - Until 2026-09-20 this screen had a third, separate "Policy" section
 *   for the same three-tier choice the Browse screen's Licence filter
 *   makes now (plan 62, § 3d) — that section and its own chip are gone;
 *   the licence pick is one of the Filters panel's rows inside
 *   PullModelsModal, wired here exactly the same draft-until-Done way.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ConfirmModal, Focusable } from "@decky/ui";
import type { ModelPolicyTierId } from "../data/modelPolicy";
import { useModelPolicyTierDraft } from "./ModelPolicyTierPanel";
import {
  ModelRoutingAdvancedPanel,
  useModelRoutingAdvancedDraft,
} from "./ModelRoutingAdvancedPanel";
import { PullModelsModal, type PullModelsFooterState } from "./PullModelsModal";
import { BonsaiModalScope } from "./BonsaiModalScope";

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
  onApplyTier2MultimodalPolicy?: () => void | Promise<void>;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  onClose: () => void;
};

/**
 * The two real sections left once Policy folded into Browse's own Filters panel. "policy" is
 * still a value `initialSection` accepts (existing callers ask for it as a shortcut into the
 * licence pick) — see the section-init logic below for how that maps onto "browse".
 */
const HUB_SECTIONS: { id: Exclude<OllamaModelsHubSection, "policy">; label: string }[] = [
  { id: "browse", label: "Browse & pull" },
  { id: "advanced", label: "Advanced" },
];

/**
 * Unified fullscreen hub: the browse/pull table (licence choice included, as a filter) and
 * advanced routing.
 */
export function OllamaModelsHubModal(props: OllamaModelsHubModalProps) {
  const {
    initialSection = "browse",
    activeRoutingTag,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    onCommitOllamaModelsHub,
    onReadModelPolicy,
    onApplyTier2MultimodalPolicy,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    onClose,
  } = props;

  // "policy" used to be its own section; it is now the Filters panel's Licence group, inside
  // Browse. A caller still asking for it lands on Browse with that panel already open.
  const [section, setSection] = useState<Exclude<OllamaModelsHubSection, "policy">>(
    initialSection === "policy" ? "browse" : initialSection
  );
  const openedOnLicenceShortcut = useRef(initialSection === "policy");
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
    hasQueuedPull: false,
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
    (_reason: string) => {
      onClose();
    },
    [onClose]
  );

  /**
   * Done always saves the licence + advanced draft first, then either closes (nothing queued to
   * pull, or the Advanced screen) or hands off to PullModelsModal's own pull. Before the Filters
   * panel folded Policy in, saving that draft only ever happened from the Policy or Advanced
   * section's own Done press -- pressing Done while Browse had nothing queued left the tier
   * change unsaved. Committing unconditionally here closes that gap along with the move.
   */
  const handleDone = useCallback(() => {
    void commitPolicyAndAdvanced()
      .then(() => {
        if (section === "browse" && browseFooter.hasQueuedPull) {
          browseFooter.onOk();
          return;
        }
        handleHubClose("done");
      })
      .catch((err) => {
        console.error("save_settings failed (AI models hub Done)", err);
      });
  }, [section, browseFooter, commitPolicyAndAdvanced, handleHubClose]);

  const selectSection = useCallback((next: Exclude<OllamaModelsHubSection, "policy">, _source: string) => {
    setSection(next);
  }, []);

  const okButtonText = section === "browse" && browseFooter.hasQueuedPull ? browseFooter.okText : "Done";
  const okDisabled = section === "browse" && browseFooter.hasQueuedPull ? browseFooter.okDisabled : false;

  return (
    <ConfirmModal
      strTitle="AI models"
      strDescription={
        <BonsaiModalScope className="bonsai-models-hub-shell bonsai-prose">
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
                  className="bonsai-models-hub-chip"
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
          {section === "browse" ? (
            <PullModelsModal
              embedded
              activeRoutingTag={activeRoutingTag}
              modelPolicyTier={draftTier}
              modelPolicyNonFossUnlocked={draftNonFossUnlocked}
              onSelectModelPolicyTier={setDraft}
              onApplyTier2Policy={async () => {
                setDraft("open_weight");
                await onApplyTier2MultimodalPolicy?.();
              }}
              onBeforeNestedDeckyModal={onBeforeNestedDeckyModal}
              onCompleteNestedDeckyModalClose={onCompleteNestedDeckyModalClose}
              onCancel={() => handleHubClose("browseCancel")}
              onPullAccepted={() => handleHubClose("pullAccepted")}
              onFooterStateChange={handleBrowseFooterChange}
              initialFiltersOpen={openedOnLicenceShortcut.current}
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
        </BonsaiModalScope>
      }
      strOKButtonText={okButtonText}
      strCancelButtonText="Cancel"
      onOK={() => {
        if (okDisabled) return;
        handleDone();
      }}
      onCancel={() => handleHubClose("cancel")}
    />
  );
}
