/**
 * Title: Help popup and its "seen it" chip
 *
 * Purpose: Opens the plugin's help popup, and remembers whether a person
 * has already opened it, so the help chip on the Main tab only offers
 * itself once. That "already seen" flag survives a popup throwing the
 * plugin's screen away and rebuilding it, which plain React state alone
 * would not.
 *
 * Used for: The Main tab's help chip, and the Clear all plugin data reset,
 * which needs to make the chip reappear.
 *
 * Solves: The same "already seen" flag used to live in three different
 * places (on-screen state, a value kept alive between screen rebuilds, and
 * permanent storage); this hook is the one place that keeps all three in
 * step instead of each caller doing it by hand.
 *
 * Does not: Draw the help chip itself — the Main tab does that; this only
 * opens the popup and tracks whether it has been seen.
 */
import { useCallback, useEffect, useState } from "react";
import { showModal } from "@decky/ui";

import { PluginHelpModal } from "../../components/PluginHelpModal";
import { markPluginHelpDismissedPersist, pluginHelpDismissedFromStorage } from "./pluginStorage";
import { peekBonsaiSessionPendingRestore } from "../../utils/bonsaiSessionSurvival";

/**
 * Survives Decky remounting `Content` while `showModal` is open — the same lifecycle problem
 * `useBonsaiPluginShell` solves for the active tab. React state is lost across that remount,
 * localStorage only records a permanent dismissal, so this holds the in-between.
 */
let moduleDismissed = false;

export type UsePluginHelpModalArgs = {
  /** Active tab, restored after the modal closes. */
  currentTab: string;
  /** Snapshot session state before Decky tears down `Content` to show the modal. */
  captureSessionBeforeModal: () => void;
  /** Close the modal and return focus to the tab that opened it. */
  finalizeShowModalAndRestoreActiveTab: (close: () => void) => void;
  /** Shared "tab to return to" ref owned by `useBonsaiPluginShell`. */
  returnTabRef: React.MutableRefObject<string>;
};

export type PluginHelpModalController = {
  /** True once the user has opened help, so the chip stops offering itself. */
  pluginHelpDismissed: boolean;
  /** Open the modal. Dismisses the chip first — opening help is the dismissal. */
  openPluginHelpModal: () => void;
  /** Restore dismissal from a session-survival snapshot. */
  restorePluginHelpDismissed: (dismissed: boolean) => void;
  /** Clear dismissal so the chip reappears, for Clear all plugin data. */
  resetPluginHelpDismissed: () => void;
};

/**
 * In: the current tab (to return to after the popup closes) and the
 * shared tab-restore functions every popup uses.
 * Out: whether help has been dismissed, a function to open the popup, and
 * two functions to restore or reset that dismissed flag.
 * Can go wrong: nothing — every source of the flag (a saved session,
 * permanent storage, or the in-memory fallback) has the same shape, so
 * there is no state that could disagree with itself.
 */
export function usePluginHelpModal({
  currentTab,
  captureSessionBeforeModal,
  finalizeShowModalAndRestoreActiveTab,
  returnTabRef,
}: UsePluginHelpModalArgs): PluginHelpModalController {
  const [pluginHelpDismissed, setPluginHelpDismissed] = useState(() => {
    const snapshot = peekBonsaiSessionPendingRestore();
    if (snapshot?.pluginHelpDismissed != null) {
      moduleDismissed = snapshot.pluginHelpDismissed;
      return snapshot.pluginHelpDismissed;
    }
    if (pluginHelpDismissedFromStorage()) {
      moduleDismissed = true;
      return true;
    }
    return moduleDismissed;
  });

  useEffect(() => {
    moduleDismissed = pluginHelpDismissed;
  }, [pluginHelpDismissed]);

  const openPluginHelpModal = useCallback(() => {
    captureSessionBeforeModal();
    markPluginHelpDismissedPersist();
    moduleDismissed = true;
    setPluginHelpDismissed(true);
    returnTabRef.current = currentTab;
    const handle = showModal(
      <PluginHelpModal onClose={() => finalizeShowModalAndRestoreActiveTab(() => handle.Close())} />
    );
  }, [currentTab, captureSessionBeforeModal, finalizeShowModalAndRestoreActiveTab, returnTabRef]);

  const restorePluginHelpDismissed = useCallback((dismissed: boolean) => {
    setPluginHelpDismissed(dismissed);
    moduleDismissed = dismissed;
  }, []);

  const resetPluginHelpDismissed = useCallback(() => {
    moduleDismissed = false;
    setPluginHelpDismissed(false);
  }, []);

  return {
    pluginHelpDismissed,
    openPluginHelpModal,
    restorePluginHelpDismissed,
    resetPluginHelpDismissed,
  };
}
