import React, { useEffect, useRef, useState, useCallback } from "react";
import { showModal, ConfirmModal } from "@decky/ui";
import { TIER1_FOSS_STARTER_PRIMARY_TAGS } from "../data/tier1FossStarterTags";

const DISCLAIMER_STORAGE_KEY = "bonsai:disclaimer-accepted";
const LOCAL_RUNTIME_BETA_DISMISSED_STORAGE_KEY = "bonsai:local-runtime-beta-dismissed-v1";
const GITHUB_ISSUES_URL = "https://github.com/cantcurecancer/bonsAI/issues";

/**
 * Shared copy for the global beta banner (first run and replay after clearing plugin data).
 * LAN + in-game VRAM wording sits with the hardware-risk section before the Help link line.
 */
const BONSAI_BETA_NOTICE_DESCRIPTION =
  "Welcome to bonsAI!\n\n" +
  "This plugin is currently in beta. Some features may not work as expected, " +
  "and AI-generated recommendations \u2014 especially TDP and performance changes \u2014 " +
  "should be verified before relying on them.\n\n" +
  "bonsAI modifies system hardware settings based on AI suggestions. " +
  "Use at your own risk.\n\n" +
  "If you have another PC on your LAN that can host Ollama, that path is typically much faster than inference on-device.\n\n" +
  "Running heavy local AI while a game has high VRAM / graphics load may crash the game or cause unstable behavior " +
  "from memory pressure — use at your own risk.\n\n" +
  "To report bugs or request features, visit:\n" +
  GITHUB_ISSUES_URL +
  "\n\n" +
  "By continuing, you acknowledge this is experimental software.";

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

/** Full local-runtime banner text (one-time when Ollama on Deck is enabled). */
function localRuntimeBetaNoticeDescription(): string {
  const tagLine = TIER1_FOSS_STARTER_PRIMARY_TAGS.join(", ");
  return (
    "You are using Ollama on this device (local runtime).\n\n" +
    "If you have another PC on your LAN that can host Ollama, that path is typically much faster than on-device inference.\n\n" +
    "Heavy local AI while a game has high VRAM / graphics load may crash the game or cause unstable behavior from memory pressure — " +
    "use at your own risk. This path is beta: screenshots and attachments use vision-capable models where available; Expert and heavier models can add delay.\n\n" +
    "Speed (Fast) is the default for quick answers. Use Strategy when you need branching choices. Expert is heavier and slower.\n\n" +
    `Tier-1 FOSS starter tags include ${tagLine}. Use Starter (README) and Full Tier-1 FOSS under Connection to pull models.\n\n` +
    "You can turn off Ollama on Deck in Settings if you prefer a LAN host."
  );
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
export function useDisclaimerAndLocalRuntimeGates(settingsLoaded: boolean, ollamaLocalOnDeck: boolean): DisclaimerGateApi {
  const [disclaimerAckVersion, setDisclaimerAckVersion] = useState(0);
  const ollamaLocalOnDeckPrevRef = useRef<boolean | null>(null);
  const localRuntimeBetaPromptIssuedRef = useRef(false);

  const acknowledgeDisclaimer = useCallback(() => {
    markDisclaimerAccepted();
    setDisclaimerAckVersion((v) => v + 1);
  }, []);

  const showDisclaimerModalAgain = useCallback(() => {
    showModal(
      <ConfirmModal
        strTitle="bonsAI - Beta Notice"
        strDescription={BONSAI_BETA_NOTICE_DESCRIPTION}
        strOKButtonText="Got it"
        bAlertDialog={true}
        onOK={() => {
          acknowledgeDisclaimer();
        }}
      />
    );
  }, [acknowledgeDisclaimer]);

  useEffect(() => {
    if (!hasAcceptedDisclaimer()) {
      showModal(
        <ConfirmModal
          strTitle="bonsAI - Beta Notice"
          strDescription={BONSAI_BETA_NOTICE_DESCRIPTION}
          strOKButtonText="Got it"
          bAlertDialog={true}
          onOK={() => {
            acknowledgeDisclaimer();
          }}
        />
      );
    }
  }, [acknowledgeDisclaimer]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (!hasAcceptedDisclaimer()) return;

    const prevDeck = ollamaLocalOnDeckPrevRef.current;
    if (prevDeck === null) {
      ollamaLocalOnDeckPrevRef.current = ollamaLocalOnDeck;
      return;
    }

    const userTurnedLocalOn = !prevDeck && ollamaLocalOnDeck;
    ollamaLocalOnDeckPrevRef.current = ollamaLocalOnDeck;

    if (!userTurnedLocalOn) return;
    if (hasDismissedLocalRuntimeBeta()) return;
    if (localRuntimeBetaPromptIssuedRef.current) return;

    localRuntimeBetaPromptIssuedRef.current = true;
    showModal(
      <ConfirmModal
        strTitle="bonsAI - Local runtime (beta)"
        strDescription={localRuntimeBetaNoticeDescription()}
        strOKButtonText="Got it"
        bAlertDialog={true}
        onOK={() => {
          markLocalRuntimeBetaDismissed();
          localRuntimeBetaPromptIssuedRef.current = false;
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
