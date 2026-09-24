/**
 * Title: Restoring a session after Decky remounts the plugin
 *
 * Purpose: The two effects that run right after `Content` mounts, to tell a QAM close/reopen
 * (a plain mount, nothing to restore but the saved chat) apart from a Decky modal closing (a
 * real snapshot to restore), and to clear the pending-restore marker once that restore lands.
 *
 * Used for: `index.tsx`, once, immediately after `Content` mounts.
 *
 * Solves: Nothing new — the same remount-detection logic `index.tsx` used to carry inline,
 * moved out so the file composing the whole panel does not also have to hold the device
 * evidence behind it (SESSION-CONTEXT-COUNT-01) inline.
 *
 * Does not: Decide what counts as a "session survived" snapshot — `bonsaiSessionSurvival.ts`
 * does that. This only reacts to what it hands back.
 */
import { useEffect, useLayoutEffect } from "react";

import {
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  finalizeSessionRestoreAfterRemount,
  shouldIgnoreRestoredSettingsSnapshot,
} from "../../utils/bonsaiSessionSurvival";
import { consumePendingFocusMainTab } from "../../utils/bonsaiReplySurface";
import { bonsaiDebugLog } from "../../utils/bonsaiDebugIngest";
import { toBonsaiSettingsPayload } from "../../utils/settingsPayload";
import { loadActiveChatSlotId } from "./pluginStorage";
import type { useBonsaiPluginShell } from "../../hooks/useBonsaiPluginShell";
import type { useChatSlots } from "../../hooks/useChatSlots";
import type { useScreenshotBrowser } from "../../hooks/useScreenshotBrowser";
import type { usePluginHelpModal } from "./usePluginHelpModal";
import type { OllamaConnectionState } from "./useOllamaConnectionState";
import type { usePluginSettings } from "../../hooks/usePluginSettings";
import type { useBonsaiAskOrchestration } from "../../hooks/useBonsaiAskOrchestration";

type PluginShell = ReturnType<typeof useBonsaiPluginShell>;
type ChatSlots = ReturnType<typeof useChatSlots>;
type ScreenshotBrowser = ReturnType<typeof useScreenshotBrowser>;
type PluginHelpModal = ReturnType<typeof usePluginHelpModal>;
type PluginSettings = ReturnType<typeof usePluginSettings>;
type AskOrchestration = ReturnType<typeof useBonsaiAskOrchestration>;

export type UseSessionRestoreAfterRemountArgs = {
  pluginDataClearSeenRef: React.MutableRefObject<number>;
  pendingSessionRestoreFinalizeRef: React.MutableRefObject<boolean>;
  activeSlotIdRef: React.MutableRefObject<string | null>;
  chatSlots: Pick<ChatSlots, "selectSlot">;
  setCurrentTab: PluginShell["setCurrentTab"];
  setUnifiedInput: (value: string) => void;
  setSelectedIndex: (value: number) => void;
  setNavigationMessage: (value: string) => void;
  restoreScreenshotBrowserSnapshot: ScreenshotBrowser["restoreScreenshotBrowserSnapshot"];
  restorePluginHelpDismissed: PluginHelpModal["restorePluginHelpDismissed"];
  setOllamaIp: OllamaConnectionState["setOllamaIp"];
  hydrateFromSettings: PluginSettings["hydrateFromSettings"];
  restoreSessionSnapshot: AskOrchestration["restoreSessionSnapshot"];
};

/*
 * In: the two refs that carry state across this hook's own two effects, plus every setter and
 * restore function a recovered snapshot needs to reapply.
 * Out: nothing — both effects only call the setters and refs they were given.
 * What can go wrong: the second effect depends on the first having set
 * `pendingSessionRestoreFinalizeRef.current = true` first; they must stay adjacent, in this
 * order, for that hand-off to work the same render cycle apart it always has.
 */
export function useSessionRestoreAfterRemount({
  pluginDataClearSeenRef,
  pendingSessionRestoreFinalizeRef,
  activeSlotIdRef,
  chatSlots,
  setCurrentTab,
  setUnifiedInput,
  setSelectedIndex,
  setNavigationMessage,
  restoreScreenshotBrowserSnapshot,
  restorePluginHelpDismissed,
  setOllamaIp,
  hydrateFromSettings,
  restoreSessionSnapshot,
}: UseSessionRestoreAfterRemountArgs): void {
  useLayoutEffect(() => {
    if (shouldIgnoreRestoredSettingsSnapshot(pluginDataClearSeenRef.current)) {
      clearBonsaiSessionSurvival();
      return;
    }
    const survived = consumeBonsaiSessionAfterRemount();
    bonsaiDebugLog("index.tsx:consume", survived ? "restored snapshot" : "no snapshot", "H1", {
      tab: survived?.currentTab,
      inputLen: survived?.unifiedInput?.length ?? 0,
      hasExchange: !!survived?.lastExchange,
    });
    if (!survived) {
      /*
       * A plain mount — a QAM close/reopen, the ordinary way this panel comes back. There is no
       * snapshot to restore, but the saved chat is still on disk and the pointer to it now
       * survives, so load it here. Without this the thread came back empty and the session
       * context strip counted only the answer the background poll repainted
       * (SESSION-CONTEXT-COUNT-01): measured on device with four entries in the slot file and
       * one turn on screen, tagged `live`.
       */
      const storedSlotId = loadActiveChatSlotId();
      if (storedSlotId) {
        activeSlotIdRef.current = storedSlotId;
        void chatSlots.selectSlot(storedSlotId);
      }
      return;
    }
    if (consumePendingFocusMainTab()) {
      setCurrentTab("main");
    } else if (survived.currentTab) {
      setCurrentTab(survived.currentTab);
    }
    setUnifiedInput(survived.unifiedInput);
    setSelectedIndex(survived.selectedIndex);
    setNavigationMessage(survived.navigationMessage);
    restoreScreenshotBrowserSnapshot({
      selectedAttachment: survived.selectedAttachment,
      isScreenshotBrowserOpen: survived.isScreenshotBrowserOpen,
      mediaError: survived.mediaError,
      recentScreenshots: survived.recentScreenshots,
      isLoadingRecentScreenshots: survived.isLoadingRecentScreenshots,
    });
    restorePluginHelpDismissed(survived.pluginHelpDismissed);
    setOllamaIp(survived.ollamaIp);
    hydrateFromSettings(toBonsaiSettingsPayload(survived.settingsSnapshot));
    restoreSessionSnapshot(survived);
    if (survived.activeSlotId) {
      activeSlotIdRef.current = survived.activeSlotId;
      void chatSlots.selectSlot(survived.activeSlotId);
    }
    pendingSessionRestoreFinalizeRef.current = true;
  }, [chatSlots.selectSlot, restoreSessionSnapshot, hydrateFromSettings]);

  useEffect(() => {
    if (!pendingSessionRestoreFinalizeRef.current) return;
    pendingSessionRestoreFinalizeRef.current = false;
    finalizeSessionRestoreAfterRemount();
    bonsaiDebugLog("index.tsx:finalizeRestore", "cleared pending snapshot", "H1", {});
  }, []);
}
