/**
 * Title: The one-time first-time setup popup (which now carries the beta line)
 *
 * Purpose: Shows the first-time setup popup once, the first time the plugin is opened
 * (FirstRunWhereAiRunsModal.tsx; plan 105, lane D3): the checklist of downloads, the Internet downloads switch,
 * "OK, install on this Deck", "Use the AI on my PC", "Not now", and one short beta line. It replaced two boxes:
 * the Beta Notice (its warning is the beta line now) and the old "Where should the AI run?" popup (its PC half is
 * the popup's second screen). Both of their "already seen" flags are set the moment the popup opens, in the
 * browser's local storage, so once shown it does not come back, whatever the person pressed.
 *
 * A Decky uninstall and reinstall wipes the plugin's saved settings but not Steam's browser
 * storage, so those "already seen" flags can outlive the plugin. When the back end reports a start
 * with no settings file (a first run), this clears the plugin's own browser flags once, before it
 * decides what to show, so a wiped Deck gets the popup and the help chip again.
 *
 * Used for: index.tsx, on first mount and again once the saved settings have loaded; useSessionResetActions.tsx,
 * which shows the popup again after Clear all data (`showDisclaimerModalAgain`).
 *
 * Solves: First-time setup took three boxes (plan 105, § 12: six presses to the first question); it is one now.
 * Anything the person changed that is still waiting for its automatic save is saved before the popup opens,
 * because opening it closes Quick Access and throws that waiting save away.
 *
 * Does not: Turn anything on by itself, or change a setting unless the person changes it in the popup (which saves
 * it at once). The popup is shown only when the screen hands in the settings it needs (`whereAiRuns`). Some names
 * are historic and kept because the reset code in useSessionResetActions.tsx still holds them:
 * `showDisclaimerModalAgain` now shows the first-time setup popup, `localRuntimeBetaPromptIssuedRef` means "the
 * popup was opened this load", and `ollamaLocalOnDeckPrevRef` is reset but no longer read.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { showModal } from "@decky/ui";
import { clearBonsaiBrowserStorage } from "../settings/clearBonsaiBrowserStorage";
import type { BonsaiSettings } from "../settings/bonsaiSettingsSchema";
import {
  FirstRunWhereAiRunsModal,
  type FirstRunWhereAiRunsHost,
} from "../ai-connection/first-run/FirstRunWhereAiRunsModal";
import { DISCLAIMER_STORAGE_KEY, FIRST_RUN_WHERE_AI_RUNS_SEEN_STORAGE_KEY } from "../../shared/storageKeys";
/** The Thinking row's own one-time notice (plan 57 step 2) -- see useThinkingNoticeGate.tsx. */
export const THINKING_NOTICE_STORAGE_KEY = "bonsai:thinking-notice-accepted-v1";

export type DeckyModalSurvivalHooks = {
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

function hasSeenFirstRunPopup(): boolean {
  try {
    return window.localStorage.getItem(FIRST_RUN_WHERE_AI_RUNS_SEEN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** The popup carries the beta line, so showing it is both the beta notice seen and the setup popup seen. */
function markFirstRunPopupSeen(): void {
  try {
    window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "1");
    window.localStorage.setItem(FIRST_RUN_WHERE_AI_RUNS_SEEN_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export type DisclaimerGateApi = {
  /** Show the first-time setup popup again after ``clear_plugin_data`` (storage wiped but React may still be mounted). */
  showDisclaimerModalAgain: () => void;
  ollamaLocalOnDeckPrevRef: React.MutableRefObject<boolean | null>;
  localRuntimeBetaPromptIssuedRef: React.MutableRefObject<boolean>;
};

/** What the screen hands the gate so the popup can show and change the settings it names. */
export type WhereAiRunsGateHost = Pick<
  FirstRunWhereAiRunsHost,
  "ollamaLocalAutostart" | "ollamaIp" | "setOllamaLocalOnDeck" | "setOllamaLocalAutostart" | "setOllamaIp" | "persistOllamaIp"
>;

/** The first-time setup popup, once, on a first open (and again after Clear all data). */
export function useDisclaimerAndLocalRuntimeGates(
  settingsLoaded: boolean,
  ollamaLocalOnDeck: boolean,
  modalHooks?: DeckyModalSurvivalHooks & {
    /**
     * Writes settings to disk right now. Called with no patch before the popup opens: opening it closes
     * Quick Access, which throws away the automatic save still waiting on its 400 ms timer (Deck
     * 2026-09-30). Called with a patch by the popup each time the person changes the address or where the AI
     * runs, so the change is on disk before the popup can close and rebuild the screen; settles once tried.
     */
    saveSettingsNow?: (patch?: Partial<BonsaiSettings>) => void | Promise<void>;
    /** The settings the popup shows and changes; left out, the popup is not shown. */
    whereAiRuns?: WhereAiRunsGateHost;
    /**
     * What the back end said about this start: true when it found no settings file, null while the
     * answer is still on its way (nothing is decided until it arrives), false otherwise. Left out,
     * the gate behaves as it always did and never clears anything.
     */
    firstRun?: boolean | null;
    /** Called right after the stale browser flags are cleared, so on-screen state can follow (the help chip). */
    onFirstRunFlagsCleared?: () => void;
  }
): DisclaimerGateApi {
  const ollamaLocalOnDeckPrevRef = useRef<boolean | null>(null);
  const localRuntimeBetaPromptIssuedRef = useRef(false);
  const ollamaLocalOnDeckRef = useRef(ollamaLocalOnDeck);
  ollamaLocalOnDeckRef.current = ollamaLocalOnDeck;
  const modalHooksRef = useRef(modalHooks);
  useEffect(() => {
    modalHooksRef.current = modalHooks;
  }, [modalHooks]);
  const firstRun = modalHooks?.firstRun;
  const firstRunHandledRef = useRef(false);
  /** Bumped by the replay after Clear all data so the popup can open again in the same load. */
  const [replay, setReplay] = useState(0);

  /**
   * True once it is safe to decide what to show. On a first run the plugin's own browser flags are
   * cleared first, once per load: the back end answers true only once per start, but this guard
   * also keeps a re-render from wiping the flags the popup sets when it opens.
   */
  const settleFirstRun = useCallback((): boolean => {
    const answer = modalHooksRef.current?.firstRun;
    if (answer === null) return false;
    if (answer === true && !firstRunHandledRef.current) {
      firstRunHandledRef.current = true;
      clearBonsaiBrowserStorage();
      ollamaLocalOnDeckPrevRef.current = null;
      localRuntimeBetaPromptIssuedRef.current = false;
      modalHooksRef.current?.onFirstRunFlagsCleared?.();
    }
    return true;
  }, []);

  /** After Clear all data the flags are gone and the reset code has cleared the "opened" ref: open it again. */
  const showDisclaimerModalAgain = useCallback(() => setReplay((n) => n + 1), []);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (!settleFirstRun()) return;
    if (hasSeenFirstRunPopup()) return;
    if (localRuntimeBetaPromptIssuedRef.current) return;
    const hooks = modalHooksRef.current;
    const whereAiRuns = hooks?.whereAiRuns;
    if (!hooks || !whereAiRuns) return;

    localRuntimeBetaPromptIssuedRef.current = true;
    // Shown once, whatever the person does in it: marked now so a rebuilt screen cannot ask again.
    markFirstRunPopupSeen();
    void hooks.saveSettingsNow?.();
    hooks.onBeforeDeckyModal();
    let closed = false;
    const handle = showModal(
      <FirstRunWhereAiRunsModal
        host={{
          ...whereAiRuns,
          ollamaLocalOnDeck: ollamaLocalOnDeckRef.current,
          saveSettingsNow: (patch) => hooks.saveSettingsNow?.(patch),
          onBeforeDeckyModal: hooks.onBeforeDeckyModal,
          onCompleteDeckyModalClose: hooks.onCompleteDeckyModalClose,
        }}
        onClose={() => {
          if (closed) return;
          closed = true;
          hooks.onCompleteDeckyModalClose(() => handle.Close());
        }}
      />
    );
  }, [settingsLoaded, settleFirstRun, firstRun, replay]);

  return {
    showDisclaimerModalAgain,
    ollamaLocalOnDeckPrevRef,
    localRuntimeBetaPromptIssuedRef,
  };
}
