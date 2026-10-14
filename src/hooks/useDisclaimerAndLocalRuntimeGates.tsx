/**
 * Title: The two one-time warnings — beta notice and running AI on the Deck itself
 *
 * Purpose: Shows two popups, each only until the person has clicked past
 * it once. The first, on the very first time the plugin is opened, says
 * this is beta software and that AI suggestions should be checked before
 * being trusted. The second appears the first time someone turns on
 * running the AI on the Deck's own hardware rather than a separate
 * computer, and warns that a game already using a lot of the Deck's memory
 * and graphics power could crash or misbehave while the AI is also
 * running. Both are remembered in the browser's local storage, so once
 * clicked past they do not come back.
 *
 * Used for: index.tsx, on first mount and whenever the on-Deck AI setting
 * is turned on.
 *
 * Solves: The person should see and accept both warnings once, and never
 * be shown them again after that — and the second one should not appear
 * before the first has been accepted, so the two do not race each other.
 *
 * Does not: Turn anything off by itself. This file only shows the warnings
 * and remembers that they were seen; it is the Permissions tab and the
 * back end's own checks that actually stop an action needing a permission
 * from running when that permission is off.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { showModal, ConfirmModal } from "@decky/ui";

const DISCLAIMER_STORAGE_KEY = "bonsai:disclaimer-accepted";
const LOCAL_RUNTIME_BETA_DISMISSED_STORAGE_KEY = "bonsai:local-runtime-beta-dismissed-v1";
/** The Thinking row's own one-time notice (plan 57 step 2) -- see useThinkingNoticeGate.tsx. */
export const THINKING_NOTICE_STORAGE_KEY = "bonsai:thinking-notice-accepted-v1";
const GITHUB_ISSUES_URL = "https://github.com/qd313/bonsAI/issues";

export type DeckyModalSurvivalHooks = {
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

/**
 * The one-time notice when Run AI on this Deck is turned on (plan 93 lane B9: no more than 40 words).
 * It names no model: the starter set is described where it is offered, on the Ollama tab.
 */
export function localRuntimeBetaNoticeDescription(): string {
  return (
    "AI runs on this Deck. A PC on your home network is usually much faster. " +
    "Heavy AI during a game can crash it: use at your own risk. " +
    "To stop, turn off Run AI on this Deck (Ollama tab)."
  );
}

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

function hasDismissedLocalRuntimeBeta(): boolean {
  try {
    return window.localStorage.getItem(LOCAL_RUNTIME_BETA_DISMISSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markLocalRuntimeBetaDismissed(): void {
  try {
    window.localStorage.setItem(LOCAL_RUNTIME_BETA_DISMISSED_STORAGE_KEY, "1");
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

/**
 * First-run beta disclaimer and one-time “Ollama on Deck” warning.
 * Couples to ``disclaimerAckVersion`` so the local-runtime gate does not race ahead of disclaimer acceptance.
 */
export function useDisclaimerAndLocalRuntimeGates(
  settingsLoaded: boolean,
  ollamaLocalOnDeck: boolean,
  modalHooks?: DeckyModalSurvivalHooks & {
    /**
     * Writes the settings that changed to disk right now. The local-runtime notice closes Quick
     * Access as it opens, which throws away the automatic save still waiting on its 400 ms timer,
     * so the switch that opened the notice would never be saved (Deck 2026-09-30).
     */
    saveSettingsNow?: () => void;
  }
): DisclaimerGateApi {
  const [disclaimerAckVersion, setDisclaimerAckVersion] = useState(0);
  const ollamaLocalOnDeckPrevRef = useRef<boolean | null>(null);
  const localRuntimeBetaPromptIssuedRef = useRef(false);
  const modalHooksRef = useRef(modalHooks);
  useEffect(() => {
    modalHooksRef.current = modalHooks;
  }, [modalHooks]);

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
    if (!hasAcceptedDisclaimer()) {
      openDisclaimerModal(acknowledgeDisclaimer);
    }
  }, [acknowledgeDisclaimer, openDisclaimerModal]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (!hasAcceptedDisclaimer()) return;

    const prevDeck = ollamaLocalOnDeckPrevRef.current;
    ollamaLocalOnDeckPrevRef.current = ollamaLocalOnDeck;

    // The switch now starts on (plan 93), so a fresh install never flips it. The first look at the
    // loaded settings counts too: switch on and notice never seen -> show it once.
    const firstLookWithSwitchOn = prevDeck === null && ollamaLocalOnDeck;
    const userTurnedLocalOn = prevDeck === false && ollamaLocalOnDeck;

    if (!userTurnedLocalOn && !firstLookWithSwitchOn) return;
    if (hasDismissedLocalRuntimeBeta()) return;
    if (localRuntimeBetaPromptIssuedRef.current) return;

    localRuntimeBetaPromptIssuedRef.current = true;
    modalHooksRef.current?.saveSettingsNow?.();
    modalHooksRef.current?.onBeforeDeckyModal();
    const handle = showModal(
      <ConfirmModal
        strTitle="bonsAI - Local runtime (beta)"
        strDescription={localRuntimeBetaNoticeDescription()}
        strOKButtonText="Got it"
        bAlertDialog={true}
        onOK={() => {
          markLocalRuntimeBetaDismissed();
          localRuntimeBetaPromptIssuedRef.current = false;
          modalHooksRef.current?.onCompleteDeckyModalClose(() => handle.Close());
        }}
      />
    );
  }, [settingsLoaded, ollamaLocalOnDeck, disclaimerAckVersion]);

  return {
    disclaimerAckVersion,
    acknowledgeDisclaimer,
    showDisclaimerModalAgain,
    ollamaLocalOnDeckPrevRef,
    localRuntimeBetaPromptIssuedRef,
  };
}
