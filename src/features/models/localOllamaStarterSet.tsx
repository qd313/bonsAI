/**
 * Title: The starter models: what they are, what the box says, and how they start
 *
 * Purpose: The starter set is four kinds of download: the answer model (gemma4:e2b-it-qat, which can
 * chat, read screenshots and help in Strategy mode), the note-search model (nomic-embed-text) and the two
 * speech models the microphone reads from (tiny.en and base.en), then the voice engine that reads them, built on the
 * Deck from an image on ghcr.io. This file holds the one place that says what the starter set is, the
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
 * download anything itself (the back end's setup run fetches all four kinds, see starter_set_extras.py),
 * or offer the second, bigger Gemma 4 model: that one is only reachable through Browse models now.
 */
import { toaster } from "@decky/api";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../shared/deckyCall";
import { STARTER_NOTE_SEARCH_TAG, STARTER_SPEECH_MODELS, TIER1_ESSENTIALS_TAG } from "./deckEssentialsTags";
import {
  confirmDownload,
  DOWNLOADS_NOT_SAVED_LINE,
  DOWNLOADS_OFF_FAILED_LINE,
  internetDownloadsAreOn,
  sendDownloadsOnAgain,
  type DownloadNotice,
} from "../downloads/downloadNotice";
import { modelPullNotice, OLLAMA_PROGRAM_NOTICE, SPEECH_MODELS_NOTICE, VOICE_ENGINE_NOTICE } from "../downloads/downloadSites";
import {
  ANSWER_MODEL_DOWNLOAD_SIZE,
  NOTE_SEARCH_MODEL_DOWNLOAD_SIZE,
  OLLAMA_DOWNLOAD_SIZE,
  SPEECH_MODELS_DOWNLOAD_SIZE,
  totalDownloadSize,
  VOICE_ENGINE_DOWNLOAD_SIZE,
  type DownloadSize,
} from "../downloads/downloadSizes";
import { readStarterLeftOut, starterLeftOutLine, type StarterLeftOut } from "./starterSetLeftOut";
import type { LocalOllamaSetupStatus } from "../ai-connection/OllamaWhereAiRunsSection.types";
import {
  LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS,
  LOCAL_SETUP_NETWORK_AND_POWER_HINT,
  OLLAMA_MODELS_DISK_HINT,
} from "../ai-connection/OllamaWhereAiRunsSection.constants";
import { textPx } from "../../styles/textPx";

/** The words on the box's download button, and on the Browse models button that opens the same box. */
export const STARTER_SET_BUTTON_LABEL = "Install the starter set";

/**
 * The Ollama program's site is listed first only when this box also installs Ollama itself. A piece the person left
 * out on the first-time setup (starterSetLeftOut.ts) is not listed, because it is not downloaded.
 */
export function starterSetNotices(opts: { withOllama?: boolean; leftOut?: readonly StarterLeftOut[] } = {}): DownloadNotice[] {
  const leftOut = opts.leftOut ?? [];
  const program = opts.withOllama ? [OLLAMA_PROGRAM_NOTICE] : [];
  const noteSearch = !leftOut.includes("note_search");
  const models = modelPullNotice(
    noteSearch ? [TIER1_ESSENTIALS_TAG, STARTER_NOTE_SEARCH_TAG] : [TIER1_ESSENTIALS_TAG],
    totalDownloadSize(noteSearch ? [ANSWER_MODEL_DOWNLOAD_SIZE, NOTE_SEARCH_MODEL_DOWNLOAD_SIZE] : [ANSWER_MODEL_DOWNLOAD_SIZE]),
  );
  const voice = leftOut.includes("voice") ? [] : [SPEECH_MODELS_NOTICE, VOICE_ENGINE_NOTICE];
  return [...program, models, ...voice];
}

/**
 * The box's size sentence: the total of every piece it downloads, Ollama included when the box installs it too
 * (plan 105, § 12: the old "about 4.5 GiB in all" was the models alone), and nothing that was left out.
 */
export function starterSetSizeLine(withOllama: boolean, leftOut: readonly StarterLeftOut[] = []): string {
  const parts: [string, DownloadSize][] = [
    ...(withOllama ? ([["Ollama", OLLAMA_DOWNLOAD_SIZE]] as [string, DownloadSize][]) : []),
    ["the answer model", ANSWER_MODEL_DOWNLOAD_SIZE],
    ...(leftOut.includes("note_search") ? [] : ([["the note-search model", NOTE_SEARCH_MODEL_DOWNLOAD_SIZE]] as [string, DownloadSize][])),
    ...(leftOut.includes("voice")
      ? []
      : ([
          ["the speech models", SPEECH_MODELS_DOWNLOAD_SIZE],
          ["the voice engine", VOICE_ENGINE_DOWNLOAD_SIZE],
        ] as [string, DownloadSize][])),
  ];
  const names = parts.map(([name]) => name);
  const joined = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `Rough download: ${totalDownloadSize(parts.map(([, size]) => size))} in all (${joined}).`;
}

const TAG_STYLE = { color: "#9ce7ff" };

/**
 * What the box says under the site line; `engineAlreadyAsked` is true for the follow-up box of Install Ollama;
 * `downloadsOff` makes its Cancel sentence say nothing is installed; `leftOut` drops what the person left out on the
 * first-time setup and adds a line saying so.
 */
export function starterSetBoxBody(engineAlreadyAsked: boolean, downloadsOff = false, leftOut: readonly StarterLeftOut[] = []) {
  const noteSearch = !leftOut.includes("note_search");
  const voice = !leftOut.includes("voice");
  const leftOutLine = starterLeftOutLine(leftOut);
  return (
    <div className="bonsai-prose" style={{ fontSize: textPx(12), color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}>
      <div style={{ marginBottom: 8 }}>
        The starter set is the answer model <span style={TAG_STYLE}>{TIER1_ESSENTIALS_TAG}</span>, which can chat, read
        screenshots and text in pictures, and help in Strategy mode
        {noteSearch ? (
          <>
            ; the note-search model <span style={TAG_STYLE}>{STARTER_NOTE_SEARCH_TAG}</span>
          </>
        ) : null}
        {voice ? (
          <>
            ; and the speech models <span style={TAG_STYLE}>{STARTER_SPEECH_MODELS.join(" and ")}</span> and the voice
            engine for the microphone
          </>
        ) : null}
        . {starterSetSizeLine(engineAlreadyAsked, leftOut)}
      </div>
      <div style={{ marginBottom: 8, color: "#c5d4e3" }}>
        A model you already have is not downloaded again. If one download fails the others still go ahead, and the
        tab says which one failed.
        {voice
          ? " The speech models download and the voice engine is built on this Deck, which can take several minutes, even with the microphone permission off; Voice input stays off until you turn it on in the Permissions tab."
          : null}
      </div>
      {leftOutLine ? <div style={{ marginBottom: 8, color: "#c5d4e3" }}>{leftOutLine}</div> : null}
      {engineAlreadyAsked ? (
        <div style={{ marginBottom: 8, color: "#c5d4e3" }}>
          {downloadsOff
            ? "Cancel or B installs nothing. You can install Ollama and pull models later."
            : "Cancel or B installs Ollama only, with no models. You can pull models later from Browse models."}
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
 * A "downloads off" refusal while the screen shows them on sends the screen's value once and tries once more
 * (plan 104, B1); only a second refusal reads as off. `leaveOut` (the starter set only) names what the person left
 * out on the first-time setup; the back end keeps it for a restart after a reload (starter_left_out.py).
 * `onAnswered` (optional) is told once the start has been answered, accepted or not, or has failed, so a
 * button can show "Starting" for exactly that long.
 */
export function startLocalOllamaSetup(
  profile: string,
  onStatus?: (s: LocalOllamaSetupStatus) => void,
  onRefused?: (reason: string) => void,
  leaveOut: readonly StarterLeftOut[] = [],
  onAnswered?: () => void
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
  // The back end reads its own file for the Internet downloads permission. When it refuses with "downloads
  // off" while this screen shows them on, the two disagree (a save that never arrived): the screen's value is
  // sent once and the start is tried once more. Only a second refusal reads as "downloads off".
  const start = (alreadyResent: boolean): Promise<void> =>
    callDeckyWithTimeout<[{ profile: string; leave_out?: StarterLeftOut[] }], { accepted?: boolean; reason?: string; error?: string }>(
      "start_local_ollama_setup",
      [profile === LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS ? { profile, leave_out: [...leaveOut] } : { profile }],
      15000
    ).then(async (out) => {
      if (!out?.accepted) {
        if (out?.error === "downloads_off" && !alreadyResent && internetDownloadsAreOn()) {
          if (await sendDownloadsOnAgain()) return start(true);
          refuse(DOWNLOADS_NOT_SAVED_LINE, "Setup not started");
          return;
        }
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
    });
  void start(false)
    .catch((e: unknown) => {
      refuse(formatDeckyRpcError(e), "Setup RPC failed");
    })
    .finally(() => onAnswered?.());
}

/**
 * Browse models' "Install the starter set": the download notice first (the sites, the sizes, the ring
 * on Cancel), then the same setup run the old Tier 1 button started. Resolves true when it started. What the
 * person left out on the first-time setup stays out, and the box says so; with no note, every piece is listed.
 * `hooks` (optional): `onAccepted` runs the moment the box is accepted; `onAnswered` when the start has been answered.
 */
export async function askThenInstallStarterSet(hooks?: { onAccepted?: () => void; onAnswered?: () => void }): Promise<boolean> {
  const leftOut = readStarterLeftOut();
  const go = await confirmDownload(starterSetNotices({ leftOut }), {
    always: true,
    title: "Install the starter set?",
    body: starterSetBoxBody(false, false, leftOut),
    actionLabel: STARTER_SET_BUTTON_LABEL,
  });
  if (!go) return false;
  hooks?.onAccepted?.();
  startLocalOllamaSetup(LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS, undefined, undefined, leftOut, hooks?.onAnswered);
  return true;
}
