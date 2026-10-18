/**
 * Title: The two one-time first-run popups — the beta notice, then where the AI runs
 *
 * Purpose: Shows two popups, each only until the person has gone past it once. The first, on the very
 * first time the plugin is opened, says this is beta software and that AI suggestions should be checked
 * before being trusted. The second, right after it and before the help chip, asks where the AI should
 * run: on this Deck or on a PC on the home network (FirstRunWhereAiRunsModal.tsx; plan 96 N1). It
 * replaced the old "Local runtime (beta)" notice, whose warning (the game slows while the AI answers) is
 * now the help line under that popup's first switch. Both are remembered in the browser's local storage,
 * so once gone past they do not come back.
 *
 * A Decky uninstall and reinstall wipes the plugin's saved settings but not Steam's browser
 * storage, so those "already seen" flags can outlive the plugin. When the back end reports a start
 * with no settings file (a first run), this clears the plugin's own browser flags once, before it
 * decides what to show, so a wiped Deck gets both popups and the help chip again.
 *
 * Used for: index.tsx, on first mount and again once the saved settings have loaded.
 *
 * Solves: The person should see and accept both popups once, and never be shown them again after that —
 * and the second one should not appear before the first has been accepted, so the two do not race.
 * Anything the person changed that is still waiting for its automatic save is saved before the popup
 * opens, because opening it closes Quick Access and throws that waiting save away.
 *
 * Does not: Turn anything off by itself, or change a setting unless the person changes it in the popup
 * (which saves it at once). The popup is shown only when the screen hands in the settings it needs
 * (`whereAiRuns`). Two names are historic and kept because the reset code in useSessionResetActions.tsx
 * still holds them: `localRuntimeBetaPromptIssuedRef` now means "the where-the-AI-runs popup was opened
 * this load", and `ollamaLocalOnDeckPrevRef` is reset but no longer read.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { showModal, ConfirmModal } from "@decky/ui";
import { clearBonsaiBrowserStorage } from "../settings/clearBonsaiBrowserStorage";
import type { BonsaiSettings } from "../settings/bonsaiSettingsSchema";
import {
  FirstRunWhereAiRunsModal,
  type FirstRunWhereAiRunsHost,
} from "../ai-connection/first-run/FirstRunWhereAiRunsModal";
import { FIRST_RUN_WHERE_AI_RUNS_SEEN_STORAGE_KEY } from "../../shared/storageKeys";

const DISCLAIMER_STORAGE_KEY = "bonsai:disclaimer-accepted";
/** The Thinking row's own one-time notice (plan 57 step 2) -- see useThinkingNoticeGate.tsx. */
export const THINKING_NOTICE_STORAGE_KEY = "bonsai:thinking-notice-accepted-v1";
const GITHUB_ISSUES_URL = "https://github.com/qd313/bonsAI/issues";

export type DeckyModalSurvivalHooks = {
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

/** Shared copy for the global beta banner (first run and replay after clearing plugin data); plan 93 lane B9: no more than 40 words. */
const BONSAI_BETA_NOTICE_DESCRIPTION =
  "Welcome to bonsAI! This plugin is in beta, and its AI can be wrong, so check anything important. " +
  "Heavy AI on the Deck can crash a game. Use at your own risk.\n\n" +
  "Report bugs at " +
  GITHUB_ISSUES_URL;

function hasAcceptedDisclaimer(): boolean {
  try {
    return window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markDisclaimerAccepted(): void {
  try {
    window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function hasSeenWhereAiRuns(): boolean {
  try {
    return window.localStorage.getItem(FIRST_RUN_WHERE_AI_RUNS_SEEN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markWhereAiRunsSeen(): void {
  try {
    window.localStorage.setItem(FIRST_RUN_WHERE_AI_RUNS_SEEN_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export type DisclaimerGateApi = {
  disclaimerAckVersion: number;
  acknowledgeDisclaimer: () => void;
  /** Replay disclaimer after ``clear_plugin_data`` (storage wiped but React may still be mounted). */
  showDisclaimerModalAgain: () => void;
  ollamaLocalOnDeckPrevRef: React.MutableRefObject<boolean | null>;
  localRuntimeBetaPromptIssuedRef: React.MutableRefObject<boolean>;
};

/** What the screen hands the gate so the where-the-AI-runs popup can show and change the settings it names. */
export type WhereAiRunsGateHost = Pick<
  FirstRunWhereAiRunsHost,
  "ollamaLocalAutostart" | "ollamaIp" | "setOllamaLocalOnDeck" | "setOllamaLocalAutostart" | "setOllamaIp" | "persistOllamaIp"
>;

/**
 * First-run beta disclaimer, then the one-time "Where should the AI run?" popup.
 * Couples to ``disclaimerAckVersion`` so the popup does not race ahead of disclaimer acceptance.
 */
export function useDisclaimerAndLocalRuntimeGates(
  settingsLoaded: boolean,
  ollamaLocalOnDeck: boolean,
  modalHooks?: DeckyModalSurvivalHooks & {
    /**
     * Writes settings to disk right now. Called with no patch before the popup opens: opening it closes
     * Quick Access, which throws away the automatic save still waiting on its 400 ms timer (Deck
     * 2026-09-30). Called with a patch by the popup each time the person changes a switch or the address,
     * so the change is on disk before the popup can close and rebuild the screen.
     */
    saveSettingsNow?: (patch?: Partial<BonsaiSettings>) => void;
    /** The settings the where-the-AI-runs popup shows and changes; left out, that popup is not shown. */
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
  const [disclaimerAckVersion, setDisclaimerAckVersion] = useState(0);
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

  /**
   * True once it is safe to decide what to show. On a first run the plugin's own browser flags are
   * cleared first, once per load: the back end answers true only once per start, but this guard
   * also keeps a re-render from wiping the flags the person sets by clicking the notices.
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

  const acknowledgeDisclaimer = useCallback(() => {
    markDisclaimerAccepted();
    setDisclaimerAckVersion((v) => v + 1);
  }, []);

  const openDisclaimerModal = useCallback(
    (onAck: () => void, options?: { skipSessionCapture?: boolean }) => {
      if (!options?.skipSessionCapture) {
        modalHooksRef.current?.onBeforeDeckyModal();
      }
      const handle = showModal(
        <ConfirmModal
          strTitle="bonsAI - Beta Notice"
          strDescription={BONSAI_BETA_NOTICE_DESCRIPTION}
          strOKButtonText="Got it"
          bAlertDialog={true}
          onOK={() => {
            onAck();
            modalHooksRef.current?.onCompleteDeckyModalClose(() => handle.Close());
          }}
        />
      );
    },
    []
  );

  const showDisclaimerModalAgain = useCallback(() => {
    openDisclaimerModal(acknowledgeDisclaimer, { skipSessionCapture: true });
  }, [acknowledgeDisclaimer, openDisclaimerModal]);

  useEffect(() => {
    if (!settleFirstRun()) return;
    if (!hasAcceptedDisclaimer()) {
      openDisclaimerModal(acknowledgeDisclaimer);
    }
  }, [acknowledgeDisclaimer, openDisclaimerModal, settleFirstRun, firstRun]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (!settleFirstRun()) return;
    if (!hasAcceptedDisclaimer()) return;
    if (hasSeenWhereAiRuns()) return;
    if (localRuntimeBetaPromptIssuedRef.current) return;
    const hooks = modalHooksRef.current;
    const whereAiRuns = hooks?.whereAiRuns;
    if (!hooks || !whereAiRuns) return;

    localRuntimeBetaPromptIssuedRef.current = true;
    // Shown once, whatever the person does in it: marked now so a rebuilt screen cannot ask again.
    markWhereAiRunsSeen();
    hooks.saveSettingsNow?.();
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
  }, [settingsLoaded, disclaimerAckVersion, settleFirstRun, firstRun]);

  return {
    disclaimerAckVersion,
    acknowledgeDisclaimer,
    showDisclaimerModalAgain,
    ollamaLocalOnDeckPrevRef,
    localRuntimeBetaPromptIssuedRef,
  };
}
