/**
 * Title: Plugin shell — which tab is open, and surviving a popup
 *
 * Purpose: Tracks which tab the plugin is showing (Ask, Chats, Settings,
 * and so on), and fixes a Steam quirk: opening one of Steam's own popups
 * on top of the plugin (a picker, a confirm dialog) throws the plugin's
 * whole screen away and rebuilds it once the popup closes. Without this
 * hook, that rebuild would always land back on the Ask tab, no matter
 * which tab a person was actually on. It saves a snapshot — a copy of
 * the conversation and which tab was open, taken right before the popup —
 * and puts the right tab, and the focus ring, back once the popup closes.
 *
 * Used for: The plugin's main screen, and every place that opens one of
 * Steam's popups (the character picker, the models hub, and others).
 *
 * Solves: A person switching tabs, then opening a picker, used to always
 * end up back on the Ask tab when the picker closed — this is the one
 * place that remembers and restores where they actually were.
 *
 * Does not: Own the Ask conversation itself, or what is being asked —
 * see bonsaiSessionSurvival and useBonsaiAskOrchestration for that.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  captureBonsaiSessionForModal,
  peekBonsaiSessionPendingRestore,
  type BonsaiSessionSurvivalSnapshot,
} from "../utils/bonsaiSessionSurvival";
import { bonsaiDebugLog, bumpContentMountCount } from "../utils/bonsaiDebugIngest";
import {
  captureSettingsTabLocalSnapshot,
} from "../utils/settingsTabLocalSurvival";
import {
  captureOllamaTabLocalSnapshot,
} from "../utils/ollamaTabLocalSurvival";
import { resolveResumeTab, saveLastTab } from "../features/plugin-shell/pluginStorage";
import {
  peekModalReturnFocus,
  restoreModalReturnFocusWithRetry,
} from "../features/plugin-shell/modalReturnFocusRegistry";

/**
 * If Decky unmounts plugin `Content` when `showModal` closes, React state resets to defaults; this
 * outlives the component so `useLayoutEffect` can restore the tab on the next mount.
 */
let __bonsaiTabRestoreAfterModal: string | null = null;

/**
 * In: nothing.
 * Out: which tab name to open with, checked in order: a pending restore
 * left by session survival, a tab queued by a just-closed popup, or
 * failing both, the person's saved resume preference (defaulting to
 * Main).
 * Can go wrong: nothing — every source has a fallback, ending in "main".
 */
function resolveInitialTab(): string {
  const snap = peekBonsaiSessionPendingRestore();
  if (snap?.currentTab) return snap.currentTab;
  if (__bonsaiTabRestoreAfterModal != null) return __bonsaiTabRestoreAfterModal;
  // The two sources above are modal round-trip machinery and are empty on a normal open, which is
  // why every reopen used to land on Main. What happens instead is the user's D15 choice —
  // `resolveResumeTab` reads it from the synchronous mirror and falls back to Main.
  return resolveResumeTab("main");
}

export type UseBonsaiPluginShellOptions = {
  /** Builds the full session snapshot for modal survival capture. */
  getSessionSnapshot: () => BonsaiSessionSurvivalSnapshot;
};

/**
 * In: a function that builds a full snapshot of the Ask session, called
 * right before a Steam popup is about to throw the screen away.
 * Out: which tab is open, the ref popups use to say where to come back
 * to, and every function a popup-opener or the tab bar needs to call.
 * Can go wrong: the focus return after a popup closes runs on a fixed
 * short delay rather than waiting for a real "the tab is ready" signal;
 * the code already tolerates a miss as a no-op, but on an unusually slow
 * device the delay could in principle fire too early.
 *
 * 1. On first mount, logs a debug line noting the mount count and which
 *    tab it is about to show — used to catch an unexpected extra
 *    remount on a real device.
 * 2. Sets up the "current tab" state, seeded from whichever tab a
 *    just-closed popup wants to return to, or failing that, the tab the
 *    person had open last time.
 * 3. Three refs: which tab to return to after a popup closes, a
 *    short-lived lock that blocks Steam's own tab-switch signal from
 *    undoing that return, and a stand-in for "finish closing a popup"
 *    that always points at the newest version of that function.
 * 4. A second mount-time effect: if a tab was queued up by a just-closed
 *    popup, switches to it immediately.
 * 5. Whenever the current tab changes, saves it, so reopening the plugin
 *    later resumes on the last tab actually shown.
 * 6. `armPostPickerTabLock()` arms a short window during which a
 *    spurious "back to Main" signal from Steam is ignored, unless the
 *    popup itself is closing back to Main anyway.
 * 7. `finalizeShowModalAndRestoreActiveTab()` is the one function every
 *    popup-closer calls: it puts the tab back, closes the popup, and
 *    after a brief pause puts the tab back again and returns the
 *    focus ring to whichever button opened the popup — a second pass is
 *    needed because the tab's own controls are not mounted yet on the
 *    first one.
 * 8. Keeps a ref pointed at the newest
 *    `finalizeShowModalAndRestoreActiveTab`, so a caller that grabbed a
 *    reference to it earlier still reaches the current version.
 * 9. `captureSessionBeforeModal()` saves the tab to return to, two
 *    tab-specific local snapshots, and the whole session, right before a
 *    popup is about to replace the screen.
 * 10. `onTabsShowTab()` handles Steam's own tab-switch signal (the
 *     shoulder buttons), honoring the lock from step 6 so it cannot
 *     undo a return-to-tab that just happened.
 * 11. `selectTab()` is for a tab chosen on the plugin's own tab bar
 *     rather than Steam's — it always wins outright, clearing the lock
 *     instead of being blocked by it.
 * 12. `prepareModalWithReturnTab()` captures the session and records
 *     which tab to come back to, for a popup that wants to return
 *     somewhere other than the current tab.
 * 13. Every piece above is bundled together and returned.
 */
export function useBonsaiPluginShell({ getSessionSnapshot }: UseBonsaiPluginShellOptions) {
  useLayoutEffect(() => {
    const mount = bumpContentMountCount();
    bonsaiDebugLog("index.tsx:Content", "content mounted", "H1", {
      mount,
      pendingPeek: !!peekBonsaiSessionPendingRestore(),
      tab: resolveInitialTab(),
    });
  }, []);

  const [currentTab, setCurrentTab] = useState(resolveInitialTab);
  const characterPickerReturnTabRef = useRef<string>("main");
  const postPickerTabLockRef = useRef<{ until: number; tab: string } | null>(null);
  const finalizeModalCloseRef = useRef<(close: () => void) => void>((close) => close());

  useLayoutEffect(() => {
    const pending = __bonsaiTabRestoreAfterModal;
    if (pending != null) {
      __bonsaiTabRestoreAfterModal = null;
      setCurrentTab(pending);
    }
  }, []);

  // Written on every change rather than on close: Decky gives the plugin no reliable "closing"
  // hook, so there is no later moment guaranteed to run. Written in every mode, including
  // `always_main` — what the mode selects is whether the *next open* reads this, and recording it
  // unconditionally means switching back to a resuming mode works immediately.
  useEffect(() => {
    saveLastTab(currentTab);
  }, [currentTab]);

  const armPostPickerTabLock = useCallback((back: string) => {
    if (back === "main") {
      postPickerTabLockRef.current = null;
      return;
    }
    postPickerTabLockRef.current = { until: Date.now() + 750, tab: back };
  }, []);

  const finalizeShowModalAndRestoreActiveTab = useCallback(
    (close: () => void) => {
      const back = characterPickerReturnTabRef.current;
      bonsaiDebugLog("index.tsx:finalizeModal", "modal close", "H4", { backTab: back });
      __bonsaiTabRestoreAfterModal = back;
      armPostPickerTabLock(back);
      setCurrentTab(back);
      close();
      window.setTimeout(() => {
        setCurrentTab(back);
        __bonsaiTabRestoreAfterModal = null;
        // Focus last: the tab has to be active and its controls mounted before the opener can be
        // focused, and after a Content remount the ref callbacks only re-register on that mount.
        // A miss is a no-op, which is exactly the behavior this had before.
        // Logged because this bug has already survived two attempts that looked successful: the
        // registry used to report "claimed" whenever the control existed, so nobody could tell a
        // restore from a miss without a Deck in hand. `claimed` now means Steam's ring actually
        // moved, and `opener` names which of the five entry points it was, so a device run says
        // which cases work rather than that "some pickers" do. PICKER-FOCUS-01.
        const opener = peekModalReturnFocus();
        window.requestAnimationFrame(() => {
          restoreModalReturnFocusWithRetry((claimed, attempts) => {
            bonsaiDebugLog("modalReturnFocus:restore", "return focus", "H4", {
              opener,
              backTab: back,
              claimed,
              attempts,
            });
          });
        });
      }, 80);
    },
    [armPostPickerTabLock],
  );

  useEffect(() => {
    finalizeModalCloseRef.current = finalizeShowModalAndRestoreActiveTab;
  }, [finalizeShowModalAndRestoreActiveTab]);

  const onCompleteDeckyModalClose = useCallback(
    (close: () => void) => finalizeModalCloseRef.current(close),
    [],
  );

  const captureSessionBeforeModal = useCallback(() => {
    characterPickerReturnTabRef.current = currentTab;
    const settingsLocal = captureSettingsTabLocalSnapshot();
    const ollamaLocal = captureOllamaTabLocalSnapshot();
    const snapshot = getSessionSnapshot();
    captureBonsaiSessionForModal(snapshot);
    bonsaiDebugLog("index.tsx:captureSessionBeforeModal", "captured", "H4", {
      tab: currentTab,
      inputLen: snapshot.unifiedInput.length,
      hasExchange: !!snapshot.lastExchange,
      settingsLocal: !!settingsLocal,
      ollamaLocal: !!ollamaLocal,
    });
  }, [currentTab, getSessionSnapshot]);

  const onTabsShowTab = useCallback((tabID: string) => {
    bonsaiDebugLog("index.tsx:onTabsShowTab", "bumper tab", "H3", { to: tabID });
    const lock = postPickerTabLockRef.current;
    const now = Date.now();
    if (lock && now < lock.until && tabID === "main" && lock.tab !== "main") {
      setCurrentTab(lock.tab);
      return;
    }
    if (lock && now < lock.until) {
      if (tabID === lock.tab) {
        postPickerTabLockRef.current = null;
      } else if (tabID !== "main") {
        postPickerTabLockRef.current = null;
      }
    }
    if (lock && now >= lock.until) {
      postPickerTabLockRef.current = null;
    }
    setCurrentTab(tabID);
  }, []);

  /**
   * A tab chosen on bonsAI's own bar (plan 30). Sets the tab and clears the post-picker lock rather
   * than going through `onTabsShowTab`: that lock exists to block Steam's spurious jump to Main
   * after a modal closes, and a press on our bar is never spurious — redirecting it would be the
   * bug, not the protection. Steam's shoulder switches keep going through `onTabsShowTab`.
   */
  const selectTab = useCallback((tabID: string) => {
    bonsaiDebugLog("useBonsaiPluginShell:selectTab", "bar tab", "H3", { to: tabID });
    postPickerTabLockRef.current = null;
    setCurrentTab(tabID);
  }, []);

  const prepareModalWithReturnTab = useCallback(
    (returnTab?: string) => {
      captureSessionBeforeModal();
      characterPickerReturnTabRef.current = returnTab ?? currentTab;
    },
    [captureSessionBeforeModal, currentTab],
  );

  return {
    currentTab,
    setCurrentTab,
    characterPickerReturnTabRef,
    finalizeShowModalAndRestoreActiveTab,
    onCompleteDeckyModalClose,
    captureSessionBeforeModal,
    prepareModalWithReturnTab,
    onTabsShowTab,
    selectTab,
  };
}
