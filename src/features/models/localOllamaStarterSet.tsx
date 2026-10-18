/**
 * Title: The starter models: what they are, what the box says, and how they start
 *
 * Purpose: The starter set is three kinds of download: the answer model (gemma4:e2b-it-qat, which can
 * chat, read screenshots and help in Strategy mode), the note-search model (nomic-embed-text) and the two
 * speech models the microphone reads from (tiny.en and base.en). This file holds the one place that says what the starter set is, the
 * words of the box that asks before downloading it, the call that starts the download, and the
 * one-press "ask first, then start" used by the Browse models screen.
 *
 * Used for: useLocalOllamaSetupFlow (the box a first "Install Ollama" shows on a Deck with no
 * models) and PullModelsStarterSetChip (the "Install the starter set" button on Browse models).
 *
 * Solves: Both places must say the same size, ask the same way and start the same setup run (the
 * one the old "Install options..." button started), so they share this instead of each copying it.
 *
 * Does not: install Ollama's engine by itself (the setup run does that when the engine is missing),
 * download anything itself (the back end's setup run fetches all three kinds, see starter_set_extras.py),
 * or offer the second, bigger Gemma 4 model: that one is only reachable through Browse models now.
 */
import { toaster } from "@decky/api";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../utils/deckyCall";
import { STARTER_NOTE_SEARCH_TAG, STARTER_SPEECH_MODELS, TIER1_ESSENTIALS_TAG } from "../../data/deckEssentialsTags";
import { confirmDownload, DOWNLOADS_OFF_FAILED_LINE, type DownloadNotice } from "../downloads/downloadNotice";
import { modelPullNotice, SPEECH_MODELS_NOTICE } from "../downloads/downloadSites";
import type { LocalOllamaSetupStatus } from "../ai-connection/OllamaWhereAiRunsSection.types";
import {
  LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS,
  LOCAL_SETUP_NETWORK_AND_POWER_HINT,
  LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB,
  OLLAMA_MODELS_DISK_HINT,
} from "../ai-connection/OllamaWhereAiRunsSection.constants";
import { textPx } from "../../styles/textPx";

/** The words on the box's download button, and on the Browse models button that opens the same box. */
export const STARTER_SET_BUTTON_LABEL = "Install the starter set";

/** The model site and the size, in the shape the download notice takes. */
export function starterSetNotices(): DownloadNotice[] {
  return [modelPullNotice([TIER1_ESSENTIALS_TAG, STARTER_NOTE_SEARCH_TAG], "about 4.6 GB"), SPEECH_MODELS_NOTICE];
}

/** What the box says under the site line; `engineAlreadyAsked` is true for the follow-up box of Install Ollama. */
export function starterSetBoxBody(engineAlreadyAsked: boolean) {
  return (
    <div className="bonsai-prose" style={{ fontSize: textPx(12), color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}>
      <div style={{ marginBottom: 8 }}>
        The starter set is the answer model <span style={{ color: "#9ce7ff" }}>{TIER1_ESSENTIALS_TAG}</span>, which can
        chat, read screenshots and text in pictures, and help in Strategy mode; the note-search model{" "}
        <span style={{ color: "#9ce7ff" }}>{STARTER_NOTE_SEARCH_TAG}</span>; and the speech models{" "}
        <span style={{ color: "#9ce7ff" }}>{STARTER_SPEECH_MODELS.join(" and ")}</span> for the microphone.{" "}
        {LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB}
      </div>
      <div style={{ marginBottom: 8, color: "#c5d4e3" }}>
        A model you already have is not downloaded again. If one download fails the others still go ahead, and the
        tab says which one failed. The speech models download even with the microphone permission off; Voice input
        stays off until you turn it on in the Permissions tab.
      </div>
      {engineAlreadyAsked ? (
        <div style={{ marginBottom: 8, color: "#c5d4e3" }}>
          Cancel or B installs Ollama only, with no models. You can pull models later from Browse models.
        </div>
      ) : null}
      <div style={{ marginBottom: 8, color: "#c5d4e3" }}>{OLLAMA_MODELS_DISK_HINT}</div>
      {LOCAL_SETUP_NETWORK_AND_POWER_HINT}
    </div>
  );
}

/**
 * Starts the setup run for a profile (Ollama's engine if missing, then the profile's models).
 * `onStatus` hears the run's first status line when the screen keeps one. A screen that shows the run
 * in place passes `onRefused` too: a refusal reason then goes to it (and onto the tab as a failed
 * line) instead of a toast, and the "started" toast is left out because the tab already shows the run.
 */
export function startLocalOllamaSetup(
  profile: string,
  onStatus?: (s: LocalOllamaSetupStatus) => void,
  onRefused?: (reason: string) => void
): void {
  const refuse = (reason: string, toastTitle: string) => {
    if (!onRefused) {
      toaster.toast({ title: toastTitle, body: reason, duration: 6000 });
      return;
    }
    onRefused(reason);
    onStatus?.({ phase: "failed", stage: "", profile, error: reason, done: true });
  };
  if (onRefused) onStatus?.({ phase: "running", stage: "check", profile, done: false });
  void callDeckyWithTimeout<[{ profile: string }], { accepted?: boolean; reason?: string; error?: string }>(
    "start_local_ollama_setup",
    [{ profile }],
    15000
  )
    .then((out) => {
      if (!out?.accepted) {
        // In place, the tab's failed line names the likely cause in the same words as the Update press.
        const downloadsOff = out?.error === "downloads_off" && onRefused != null;
        refuse(downloadsOff ? DOWNLOADS_OFF_FAILED_LINE : (out?.reason ?? "Unknown error."), "Setup not started");
        return;
      }
      if (!onRefused) {
        toaster.toast({
          title: "Local Ollama setup started",
          body: "Pulls continue in the background (Ollama). You may close bonsAI; avoid sleep, reboot, Wi‑Fi off, or power loss until pulls finish.",
          duration: 6000,
        });
      }
      void callDeckyWithTimeout<[], LocalOllamaSetupStatus>("get_local_ollama_setup_status", [], DECKY_RPC_TIMEOUT_MS)
        .then((st) => onStatus?.(st))
        .catch(() => {});
    })
    .catch((e: unknown) => {
      refuse(formatDeckyRpcError(e), "Setup RPC failed");
    });
}

/**
 * Browse models' "Install the starter set": the download notice first (the sites, the sizes, the ring
 * on Cancel), then the same setup run the old Tier 1 button started. Resolves true when it started.
 */
export async function askThenInstallStarterSet(): Promise<boolean> {
  const go = await confirmDownload(starterSetNotices(), {
    always: true,
    title: "Install the starter set?",
    body: starterSetBoxBody(false),
    actionLabel: STARTER_SET_BUTTON_LABEL,
  });
  if (!go) return false;
  startLocalOllamaSetup(LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS);
  return true;
}
