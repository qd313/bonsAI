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
 * - The Browse/Advanced section-button row is gone too (plan 62, § 3e #3): with only two
 *   sections left, and Policy no longer one of them, a whole row of buttons cost back the same
 *   height dropping Policy alone would have saved (two buttons stretch to fill the row exactly
 *   like three did). Advanced is now a small link at the top of the screen instead, wired with no
 *   custom Up/Down of its own -- the row it replaces never had any either, so Steam's own spatial
 *   nav already knows how to reach it and leave it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ConfirmModal } from "@decky/ui";
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
 * The tallest the scrolling body may be and still leave the dialog's own title, Done and Cancel
 * on screen. Measured on the Deck's own screen 2026-09-23
 * (docs/test-evidence/plan64-MODELS-LIST-CAP-01-try2.json): the page is 534px tall, Steam's top
 * and bottom bars take 40 and 42, the dialog sits 24 below the top bar, and its own padding,
 * title, gaps and 56px footer take 156 -- 262 in all, which leaves 272 for this box. The old cap,
 * 72vh (384px there), pushed Done 46px below the visible edge whenever the long list showed.
 * Fixed pixels rather than vh because every part of those 262 is a fixed size; 270 leaves 8px of
 * slack, and 520 still caps it on a tall monitor.
 */
const HUB_BODY_MAX_HEIGHT = "min(calc(100vh - 270px), 520px)";

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

  const toggleAdvanced = useCallback(() => {
    setSection((current) => (current === "advanced" ? "browse" : "advanced"));
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
            maxHeight: HUB_BODY_MAX_HEIGHT,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              className="bonsai-models-hub-advanced-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleAdvanced();
              }}
              {...({
                onOKButton: (evt: { stopPropagation: () => void }) => {
                  evt.stopPropagation();
                  toggleAdvanced();
                },
              } as Record<string, unknown>)}
              aria-pressed={section === "advanced"}
            >
              {section === "advanced" ? "‹ Browse & pull" : "Advanced ›"}
            </Button>
          </div>
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
