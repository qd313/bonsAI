/**
 * Title: Ollama models hub modal
 * Purpose: Own the models hub modal plus the two model-policy writes it can commit.
 * Used for: index.tsx — the Ollama tab hub entry point and the Tier 2 multimodal shortcut.
 * Solves: Keeps a policy guard, two save_settings round-trips, and nested-modal lifecycle
 *         plumbing out of the shell component.
 * Does not: Render the hub's contents — see components/OllamaModelsHubModal.
 */
import { useCallback } from "react";
import { showModal } from "@decky/ui";
import { toaster } from "@decky/api";

import {
  OllamaModelsHubModal,
  type OllamaModelsHubSection,
} from "../../components/OllamaModelsHubModal";
import { callDeckyWithTimeout } from "../../utils/deckyCall";
import { patchPendingSessionSettingsSnapshot } from "../../utils/bonsaiSessionSurvival";
import type { BonsaiSettings } from "../../data/bonsaiSettingsSchema";
import type { ModelPolicyTierId } from "../../data/modelPolicy";

type ModelPolicyPatch = {
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
};

export type UseOllamaModelsHubModalArgs = {
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  setModelPolicyTier: (v: ModelPolicyTierId) => void;
  setModelPolicyNonFossUnlocked: (v: boolean) => void;
  setModelAllowHighVramFallbacks: (v: boolean) => void;
  /** Tag the router last chose, shown as the active model in the hub. */
  activeRoutingTag: string | null;
  buildSettingsPayload: (patch?: Partial<BonsaiSettings>) => BonsaiSettings;
  hydrateFromSettings: (settings: BonsaiSettings) => void;
  /** Held off so a debounced autosave cannot race the explicit write below. */
  pauseDebouncedSettingsSave: () => Promise<void>;
  goToOllamaTab: () => void;
  openModelPolicyReadme: () => void;
  captureSessionBeforeModal: () => void;
  finalizeShowModalAndRestoreActiveTab: (close: () => void) => void;
};

export type OllamaModelsHubController = {
  openOllamaModelsHub: (opts?: { initialSection?: OllamaModelsHubSection }) => void;
  /** Also passed to the Ollama tab, which offers this as a one-tap fix. */
  onApplyTier2MultimodalPolicy: () => Promise<void>;
};

export function useOllamaModelsHubModal({
  modelPolicyTier,
  modelPolicyNonFossUnlocked,
  modelAllowHighVramFallbacks,
  setModelPolicyTier,
  setModelPolicyNonFossUnlocked,
  setModelAllowHighVramFallbacks,
  activeRoutingTag,
  buildSettingsPayload,
  hydrateFromSettings,
  pauseDebouncedSettingsSave,
  goToOllamaTab,
  openModelPolicyReadme,
  captureSessionBeforeModal,
  finalizeShowModalAndRestoreActiveTab,
}: UseOllamaModelsHubModalArgs): OllamaModelsHubController {
  const onCommitOllamaModelsHub = useCallback(
    async (patch: ModelPolicyPatch) => {
      // Tier 3 without its explicit unlock is not a persistable pair — send the user to the
      // Advanced section rather than silently downgrading the choice.
      if (patch.modelPolicyTier === "non_foss" && !patch.modelPolicyNonFossUnlocked) {
        toaster.toast({
          title: "Unlock required",
          body: "Turn on Tier 3 unlock under Advanced before Any installed model.",
          duration: 5000,
        });
        goToOllamaTab();
        return;
      }
      setModelPolicyTier(patch.modelPolicyTier);
      setModelPolicyNonFossUnlocked(patch.modelPolicyNonFossUnlocked);
      setModelAllowHighVramFallbacks(patch.modelAllowHighVramFallbacks);
      await pauseDebouncedSettingsSave();
      const saved = await callDeckyWithTimeout<[BonsaiSettings], BonsaiSettings>("save_settings", [
        buildSettingsPayload({
          model_policy_tier: patch.modelPolicyTier,
          model_policy_non_foss_unlocked: patch.modelPolicyNonFossUnlocked,
          model_allow_high_vram_fallbacks: patch.modelAllowHighVramFallbacks,
        }),
      ]);
      hydrateFromSettings(saved);
      // The modal remount discards React state, so the survival snapshot has to learn the new
      // policy too or a restore would resurrect the old one.
      patchPendingSessionSettingsSnapshot({
        modelPolicyTier: patch.modelPolicyTier,
        modelPolicyNonFossUnlocked: patch.modelPolicyNonFossUnlocked,
        modelAllowHighVramFallbacks: patch.modelAllowHighVramFallbacks,
      });
    },
    [
      buildSettingsPayload,
      hydrateFromSettings,
      setModelPolicyTier,
      setModelPolicyNonFossUnlocked,
      setModelAllowHighVramFallbacks,
      goToOllamaTab,
      pauseDebouncedSettingsSave,
    ]
  );

  const onApplyTier2MultimodalPolicy = useCallback(async () => {
    await pauseDebouncedSettingsSave();
    setModelPolicyTier("open_weight");
    const saved = await callDeckyWithTimeout<[BonsaiSettings], BonsaiSettings>("save_settings", [
      buildSettingsPayload({ model_policy_tier: "open_weight" }),
    ]);
    hydrateFromSettings(saved);
    patchPendingSessionSettingsSnapshot({ modelPolicyTier: "open_weight" });
  }, [buildSettingsPayload, hydrateFromSettings, setModelPolicyTier, pauseDebouncedSettingsSave]);

  const openOllamaModelsHub = useCallback(
    (opts?: { initialSection?: OllamaModelsHubSection }) => {
      captureSessionBeforeModal();
      const handle = showModal(
        <OllamaModelsHubModal
          initialSection={opts?.initialSection}
          activeRoutingTag={activeRoutingTag}
          modelPolicyTier={modelPolicyTier}
          modelPolicyNonFossUnlocked={modelPolicyNonFossUnlocked}
          modelAllowHighVramFallbacks={modelAllowHighVramFallbacks}
          onCommitOllamaModelsHub={onCommitOllamaModelsHub}
          onReadModelPolicy={openModelPolicyReadme}
          onApplyTier2MultimodalPolicy={onApplyTier2MultimodalPolicy}
          onBeforeNestedDeckyModal={captureSessionBeforeModal}
          onCompleteNestedDeckyModalClose={finalizeShowModalAndRestoreActiveTab}
          onClose={() => {
            finalizeShowModalAndRestoreActiveTab(() => handle.Close());
          }}
        />
      );
    },
    // captureSessionBeforeModal and finalizeShowModalAndRestoreActiveTab are listed here but
    // were absent from the original array despite being used in the body. Both are stable
    // callbacks from the shell hook, so this only makes the closure honest.
    [
      activeRoutingTag,
      modelPolicyTier,
      modelPolicyNonFossUnlocked,
      modelAllowHighVramFallbacks,
      onCommitOllamaModelsHub,
      openModelPolicyReadme,
      onApplyTier2MultimodalPolicy,
      captureSessionBeforeModal,
      finalizeShowModalAndRestoreActiveTab,
    ]
  );

  return { openOllamaModelsHub, onApplyTier2MultimodalPolicy };
}
