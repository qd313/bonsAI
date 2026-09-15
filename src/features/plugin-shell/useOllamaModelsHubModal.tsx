/**
 * Title: Models hub popup
 *
 * Purpose: Opens the popup where a person browses, picks, and installs the
 * AI models the plugin is allowed to use, and saves the policy choices
 * made there (which tier of model is allowed, and whether bigger models
 * are allowed on lower-memory hardware).
 *
 * Used for: The Ollama tab's models hub button, and a one-tap shortcut
 * elsewhere on that tab that turns on picture-capable models directly.
 *
 * Solves: Refuses to save "any installed model" as a choice unless its
 * separate unlock switch is already on, so a person cannot end up with a
 * setting that looks chosen but was never actually allowed.
 *
 * Does not: Draw the hub's contents — see the OllamaModelsHubModal
 * component for that. This hook only opens it and saves what it returns.
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

/**
 * In: the current model policy settings, the setters and save plumbing
 * for them, and the tab-restore functions every popup uses.
 * Out: `openOllamaModelsHub()` to open the popup, and
 * `onApplyTier2MultimodalPolicy()`, a shortcut that turns on picture-aware
 * models without opening the popup at all.
 * Can go wrong: choosing "any installed model" without its own unlock
 * switch on is refused with a toast and a jump to the Ollama tab, rather
 * than being saved in a half-allowed state.
 */
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
