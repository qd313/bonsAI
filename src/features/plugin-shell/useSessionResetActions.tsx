/**
 * Title: Clearing a session, and clearing everything
 *
 * Purpose: The two ways a person can deliberately throw a session away —
 * `resetPluginSession` (the Settings tab's *Clear session*, which forgets the current
 * question and answer but keeps every setting) and `onClearAllPluginData` (*Clear all
 * plugin data*, which resets settings, local Ollama models, and everything else, then
 * calls `resetPluginSession` itself as its last step).
 *
 * Used for: The Settings tab's two clear buttons, wired through `useSettingsTabPayload`.
 *
 * Solves: Both actions touch a lot of state that lives in `Content` — the Ask thread, the
 * active chat slot, the modal-survival snapshot, the unified input box, several local-storage
 * caches — and each step exists because an earlier version of one of these buttons was
 * measured on device to leave something behind. Keeping the two together, in one file, keeps
 * that history in one place instead of split across two.
 *
 * Does not: Decide when either button is pressed, or draw the confirmation modal — the
 * Settings tab does both. Does not touch settings.json, Ollama, or image files on disk itself
 * for `resetPluginSession`; that promise is why it detaches the chat slot pointer rather than
 * deleting the slot (see the comment inline).
 */
import { useCallback } from "react";
import { call, toaster } from "@decky/api";

import { callDeckyWithTimeout, formatDeckyRpcError } from "../../utils/deckyCall";
import {
  acknowledgePluginDataClearHandled,
  clearBonsaiSessionSurvival,
  markPluginDataCleared,
} from "../../utils/bonsaiSessionSurvival";
import { clearBonsaiBrowserStorage } from "../../utils/clearBonsaiBrowserStorage";
import { clearOllamaTabLocalSurvival } from "../../utils/ollamaTabLocalSurvival";
import { clearSettingsTabLocalSurvival } from "../../utils/settingsTabLocalSurvival";
import { IP_DEFAULT } from "../../data/storageKeys";
import { persistSearchQuery } from "./pluginStorage";
import type { useBonsaiAskOrchestration } from "../../hooks/useBonsaiAskOrchestration";
import type { useChatSlots } from "../../hooks/useChatSlots";
import type { useIntentPacks } from "../../hooks/useIntentPacks";
import type { useReplyLanguage } from "../../hooks/useReplyLanguage";
import type { useScreenshotBrowser } from "../../hooks/useScreenshotBrowser";
import type { useDisclaimerAndLocalRuntimeGates } from "../../hooks/useDisclaimerAndLocalRuntimeGates";
import type { usePluginSettings } from "../../hooks/usePluginSettings";
import type { OllamaConnectionState } from "./useOllamaConnectionState";

type AskOrchestration = ReturnType<typeof useBonsaiAskOrchestration>;
type ChatSlots = ReturnType<typeof useChatSlots>;
type IntentPacks = ReturnType<typeof useIntentPacks>;
type ReplyLanguage = ReturnType<typeof useReplyLanguage>;
type ScreenshotBrowser = ReturnType<typeof useScreenshotBrowser>;
type DisclaimerGates = ReturnType<typeof useDisclaimerAndLocalRuntimeGates>;
type PluginSettings = ReturnType<typeof usePluginSettings>;

export type UseSessionResetActionsArgs = {
  chatSlots: Pick<ChatSlots, "setActiveSlot">;
  resetAskSessionSlice: AskOrchestration["resetAskSessionSlice"];
  reseedSuggestedPrompts: AskOrchestration["reseedSuggestedPrompts"];
  uiT: ReplyLanguage["t"];
  setUnifiedInput: (value: string) => void;
  clearAskCameFromMicRef: React.MutableRefObject<() => void>;
  setSelectedIndex: (value: number) => void;
  setNavigationMessage: (value: string) => void;
  setSelectedAttachment: ScreenshotBrowser["setSelectedAttachment"];
  setLastConnectionStatus: OllamaConnectionState["setLastConnectionStatus"];
  resetOllamaTab: OllamaConnectionState["resetOllamaTab"];
  pauseDebouncedSettingsSave: PluginSettings["pauseDebouncedSettingsSave"];
  syncSettingsFromDisk: PluginSettings["syncSettingsFromDisk"];
  setOllamaIp: OllamaConnectionState["setOllamaIp"];
  localRuntimeBetaPromptIssuedRef: DisclaimerGates["localRuntimeBetaPromptIssuedRef"];
  ollamaLocalOnDeckPrevRef: DisclaimerGates["ollamaLocalOnDeckPrevRef"];
  resetPluginHelpDismissed: () => void;
  intentPacks: Pick<IntentPacks, "refresh">;
  showDisclaimerModalAgain: DisclaimerGates["showDisclaimerModalAgain"];
};

export type SessionResetActions = {
  resetPluginSession: () => void;
  onClearAllPluginData: () => Promise<void>;
};

/*
 * In: every piece of state and every setter either action needs to touch, all owned by
 * `Content` or one of its other hooks.
 * Out: the two clear actions, ready to hand to the Settings tab.
 * What can go wrong: each action's own comment records a bug it was written to fix (D32,
 * D34, D35) and the device evidence behind it. Reordering the steps inside either one risks
 * bringing one of those bugs back; see each comment before touching the order.
 */
export function useSessionResetActions({
  chatSlots,
  resetAskSessionSlice,
  reseedSuggestedPrompts,
  uiT,
  setUnifiedInput,
  clearAskCameFromMicRef,
  setSelectedIndex,
  setNavigationMessage,
  setSelectedAttachment,
  setLastConnectionStatus,
  resetOllamaTab,
  pauseDebouncedSettingsSave,
  syncSettingsFromDisk,
  setOllamaIp,
  localRuntimeBetaPromptIssuedRef,
  ollamaLocalOnDeckPrevRef,
  resetPluginHelpDismissed,
  intentPacks,
  showDisclaimerModalAgain,
}: UseSessionResetActionsArgs): SessionResetActions {
  const resetPluginSession = useCallback(() => {
    /*
     * Tell Python to forget the last answer *first* (D35, option 1, locked 2026-08-27) — and stop a
     * generation still in flight, which is the maintainer's call on D35's open sub-question.
     *
     * This is the route the maintainer was actually hitting. D32 (chat slot) and D34 (modal
     * snapshot) were both real and are both fixed, and the cleared thread still came back: the
     * restored turn was tagged `live`, so it came from neither. It came from the backend — the
     * finished answer lives on in `_background_state` so that a reply survives the user tabbing
     * away mid-generation, and `useBonsaiAskOrchestration.ts` calls `get_background_game_ai_status`
     * on *every* mount to repaint it. Clearing never told Python, so switching tabs was enough to
     * bring it back.
     *
     * Dispatched before anything else in this function, and not awaited. The remount that follows
     * the confirmation modal closing sends its own `get_background_game_ai_status`; both travel the
     * same socket in send order, and `forget_background_game_ai` resets the state under
     * `_background_lock` before its first suspension point, so the status call either finds idle
     * state or waits on the lock. Awaiting instead would hold the modal open for the Ollama stop
     * (up to ~1.5s), which is a worse trade for a button that should feel instant.
     */
    void callDeckyWithTimeout<[], { ok?: boolean; stopped?: boolean }>(
      "forget_background_game_ai",
      [],
    ).catch(() => {
      /* Best-effort: the UI is cleared either way, and a failure only means a remount can repaint. */
    });
    resetAskSessionSlice();
    /*
     * Detach the saved chat slot, or the cleared screen fills itself back in.
     *
     * `resetAskSessionSlice` clears React state and stops there, leaving `activeSlotIdRef` pointing
     * at the slot on disk. `reloadActiveSlotTranscript` runs after every completed Ask (via
     * `onSlotTurnsChanged` above), reads that pointer, and calls `setAskThreadCollapsed` with the
     * slot's turns — so the next Ask brought the whole cleared thread back, which is what the
     * maintainer reported as "I can't tell if it did anything" (D32).
     *
     * Detach rather than delete, which D32 leaves to the implementer: it keeps the modal's own
     * promise true — *"Does not change settings.json, Ollama, or image files on disk"* would become
     * false the moment we removed the slot file. Clearing the pointer is enough to satisfy the
     * other half of D32 ("and it must stay clean"), because `reloadActiveSlotTranscript` blanks the
     * thread rather than restoring anything when the pointer is null, and the session-survival
     * snapshot stores `chatSlots.activeSlotId` — now null — so a QAM reopen has nothing to restore.
     *
     * `ensureActiveSlotForAsk` mints a fresh slot on the next Ask. That is intended: a cleared
     * session is a new session. The slots left behind accumulate; that is NOT settled by D32 and is
     * tracked as its own follow-up on the roadmap entry.
     */
    chatSlots.setActiveSlot(null);
    /*
     * Then throw away the modal survival snapshot, or the confirmation box undoes the clear (D34,
     * option 1, locked 2026-08-27).
     *
     * Measured on device: detaching the pointer alone did nothing, because *Clear cache* is a
     * `ConfirmModal` and opening any Decky modal remounts the plugin. `onBeforeDeckyModal` snapshots
     * the whole live session — thread and `activeSlotId` — *before* the user presses Clear
     * (SettingsTab.tsx, `captureSessionBeforeModal` in useBonsaiPluginShell.ts). The modal then
     * closes, the plugin remounts, and `finalizeSessionRestoreAfterRemount` restores that pre-clear
     * snapshot over everything this function just cleared. Pressing Clear and asking nothing at all
     * still brought the thread straight back.
     *
     * Discarding the snapshot wholesale is D34's chosen option, and the accepted cost is that the
     * remount no longer restores `currentTab` either — so clearing from the Settings tab lands the
     * user back on the default tab. `clear_plugin_data` already does exactly this via
     * `markPluginDataCleared`, so this is the established shape rather than a new mechanism.
     *
     * Known and deliberately not handled: a settings edit still inside its save debounce would be
     * read back from disk on the remount rather than from the discarded snapshot. Reaching that
     * needs a toggle and a Clear press within a few hundred ms of each other, which is several
     * D-pad presses apart in practice; `flushSettingsSnapshotNow` is the lever if it ever bites.
     */
    clearBonsaiSessionSurvival();
    persistSearchQuery("");
    setUnifiedInput("");
    clearAskCameFromMicRef.current();
    setSelectedIndex(-1);
    setNavigationMessage("");
    setSelectedAttachment(null);
    void reseedSuggestedPrompts("random", undefined, true);
    toaster.toast({
      title: uiT("toast.sessionCleared.title"),
      body: uiT("toast.sessionCleared.body"),
      duration: 3800,
    });
  }, [chatSlots.setActiveSlot, resetAskSessionSlice, reseedSuggestedPrompts, uiT]);

  const onClearAllPluginData = useCallback(async () => {
    try {
      markPluginDataCleared();
      clearSettingsTabLocalSurvival();
      clearOllamaTabLocalSurvival();
      setLastConnectionStatus(null);
      resetOllamaTab();
      await pauseDebouncedSettingsSave();
      // Deliberately unwrapped: clear_plugin_data tears down local Ollama models
      // (ollama rm plus multi-GB rmtree), which can far exceed any UI deadline.
      await call("clear_plugin_data");
      clearBonsaiBrowserStorage();
      await syncSettingsFromDisk();
      acknowledgePluginDataClearHandled();
      setOllamaIp(IP_DEFAULT);
      localRuntimeBetaPromptIssuedRef.current = false;
      ollamaLocalOnDeckPrevRef.current = null;
      resetPluginHelpDismissed();
      resetPluginSession();
      await intentPacks.refresh();
      showDisclaimerModalAgain();
      toaster.toast({
        title: "Plugin data cleared",
        body: "Settings and local plugin storage were reset. Re-enter your Ollama host and permissions as needed.",
        duration: 4500,
      });
    } catch (e: unknown) {
      toaster.toast({
        title: uiT("toast.clearFailed.title"),
        body: formatDeckyRpcError(e),
        duration: 5000,
      });
    }
  }, [
    syncSettingsFromDisk,
    pauseDebouncedSettingsSave,
    resetPluginSession,
    showDisclaimerModalAgain,
    intentPacks.refresh,
    uiT,
  ]);

  return { resetPluginSession, onClearAllPluginData };
}
