/**
 * Title: AI character picker popup
 *
 * Purpose: Opens the popup where a person picks the AI's on-screen
 * character (or lets it be chosen at random), and saves that choice.
 *
 * Used for: Tapping the character avatar on the Main tab.
 *
 * Solves: Updates the avatar on screen the instant a choice is made,
 * before waiting to hear back from the save — so picking a character
 * never feels like it did nothing while the save is still in flight.
 *
 * Does not: Own the list of characters to choose from — see
 * data/characterCatalog and the popup component itself for that.
 */
import { useCallback } from "react";
import { showModal } from "@decky/ui";
import { toaster } from "@decky/api";

import { CharacterPickerModal } from "../../components/CharacterPickerModal";
import { callDeckyWithTimeout, formatDeckyRpcError } from "../../utils/deckyCall";
import {
  normalizeAiCharacterCustomText,
  normalizeAiCharacterPresetId,
} from "../../data/bonsaiSettingsNormalizers";
import type { BonsaiSettings } from "../../data/bonsaiSettingsSchema";
import { patchPendingSessionSettingsSnapshot } from "../../utils/bonsaiSessionSurvival";

export type UseCharacterPickerModalArgs = {
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  setAiCharacterRandom: (v: boolean) => void;
  setAiCharacterPresetId: (v: string) => void;
  setAiCharacterCustomText: (v: string) => void;
  /**
   * Builds a full settings payload from the current snapshot plus a patch. Depending on this
   * alone is sufficient: it is memoized on the settings snapshot, so its identity already
   * changes whenever any setting does.
   */
  buildSettingsPayload: (patch?: Partial<BonsaiSettings>) => BonsaiSettings;
  hydrateFromSettings: (settings: BonsaiSettings) => void;
  captureSessionBeforeModal: () => void;
  finalizeShowModalAndRestoreActiveTab: (close: () => void) => void;
};

/**
 * In: the current character choice and the setters/save functions to
 * apply a new one.
 * Out: one function that opens the popup. Nothing until it is called.
 * Can go wrong: the choice is applied to the screen before the save to
 * the backend finishes — if that save then fails, the avatar has
 * already changed but the failure is only reported as a toast, not
 * undone.
 */
export function useCharacterPickerModal({
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  setAiCharacterRandom,
  setAiCharacterPresetId,
  setAiCharacterCustomText,
  buildSettingsPayload,
  hydrateFromSettings,
  captureSessionBeforeModal,
  finalizeShowModalAndRestoreActiveTab,
}: UseCharacterPickerModalArgs): () => void {
  return useCallback(() => {
    captureSessionBeforeModal();
    // Note this opener does not set the shell's return-tab ref, unlike the plugin-help and
    // desktop-note openers. Preserved from the code this was extracted from.
    const handle = showModal(
      <CharacterPickerModal
        initialDraft={{
          random: aiCharacterRandom,
          presetId: aiCharacterPresetId,
          customText: aiCharacterCustomText,
        }}
        onCancel={() => {
          finalizeShowModalAndRestoreActiveTab(() => handle.Close());
        }}
        onOK={async (next) => {
          const pid = normalizeAiCharacterPresetId(next.presetId);
          const ctxt = normalizeAiCharacterCustomText(next.customText);
          // Applied locally first so the avatar updates even if the save round-trip fails.
          setAiCharacterRandom(next.random);
          setAiCharacterPresetId(pid);
          setAiCharacterCustomText(ctxt);
          try {
            const saved = await callDeckyWithTimeout<[BonsaiSettings], BonsaiSettings>(
              "save_settings",
              [
                buildSettingsPayload({
                  ai_character_random: next.random,
                  ai_character_preset_id: pid,
                  ai_character_custom_text: ctxt,
                }),
              ]
            );
            hydrateFromSettings(saved);
            // The session snapshot captured before this modal opened still holds the OLD character
            // settings. Decky remounts Content when the modal closes, and that restore re-hydrates
            // settings from the snapshot — overwriting the save that just succeeded, which is why
            // picking a character appeared to do nothing and the picker reopened on Random.
            // `useOllamaModelsHubModal` already patches the snapshot after its save; this one did not.
            patchPendingSessionSettingsSnapshot({
              aiCharacterRandom: next.random,
              aiCharacterPresetId: pid,
              aiCharacterCustomText: ctxt,
            });
            finalizeShowModalAndRestoreActiveTab(() => handle.Close());
          } catch (err: unknown) {
            console.error("save_settings failed (character picker OK)", err);
            toaster.toast({
              title: "Character not saved",
              body: formatDeckyRpcError(err),
              duration: 5000,
            });
          }
        }}
      />
    );
  }, [
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    setAiCharacterRandom,
    setAiCharacterPresetId,
    setAiCharacterCustomText,
    buildSettingsPayload,
    hydrateFromSettings,
    captureSessionBeforeModal,
    finalizeShowModalAndRestoreActiveTab,
  ]);
}
