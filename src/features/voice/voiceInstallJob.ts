/**
 * Title: The voice engine install, as a job on the card and the bar
 *
 * Purpose: Turns the voice install's status (the back end's `get_voice_install_status`) into the job card's words
 * (downloads/runningJobs.ts; board 5 tab 2, round 2 "Elsewhere", plan 105 lane D4b, built in plan 106 lane F3): the
 * title "Voice engine install", what it is doing ("Fetching the build image", "Building the voice engine", "Downloading
 * the base.en speech model", "Checking the file"), how far, the sites it comes from, and how it ended. The voice
 * install had no Cancel at all; the card's Cancel calls `cancel_voice_install`. While no voice section is on screen to
 * read the status (its section folded shut, another tab, a Decky box rebuilding the tab) the job reads the status
 * itself every 1.5 seconds, so the bar at the bottom of the panel follows the install and goes when it ends.
 *
 * Used for: VoiceInputSettingsSection.tsx, which tells the job when an install is pressed, hands it every status it
 * reads and draws the card; index.tsx's bar reads the same job from runningJobs.ts.
 *
 * Solves: The install greyed its button to "Installing..." and showed the installer's stage names ("binary_build_start
 * (0%)"), with no way to stop it and no sign of it once you left the section.
 *
 * Does not: Start the install (the section does, after its notice), draw anything, or decide what a stop leaves on
 * disk (voice_stoppable_run.py and voice_model_download_service.py do: a pulled image stays in podman's storage and is
 * reused, the model's half file is deleted, the engine's files are checked and rebuilt by the next install).
 */
import { toaster } from "@decky/api";

import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../shared/deckyCall";
import { VOICE_BUILD_PACKAGE_SITES } from "../downloads/downloadSites";
import { KEEP_AWAKE_LINE, createStatusJob } from "../downloads/statusJob";
import type { JobFace, JobResult } from "../downloads/runningJobs";
import { takeVoiceInstallMarker, voiceInstallInStartGrace } from "./voiceInstallBusyStore";

/** The job's id in runningJobs.ts. */
export const VOICE_INSTALL_JOB = "voice-install";

/** The part of the back end's install status the job reads. */
export type VoiceJobStatus = {
  phase?: string;
  stage?: string;
  model_id?: string;
  progress_pct?: number;
  error?: string;
  done?: boolean;
};

/**
 * Where the engine comes from: the build image on ghcr.io (voice_engine_build_service.py: WHISPER_CPP_IMAGE), the
 * image's two Ubuntu package servers (the build fetches its compilers there; VOICE_BUILD_PACKAGE_SITES in
 * downloadSites.ts, kept equal to the back end's list by tests/test_download_sites_match_backend.py) and the speech
 * model on huggingface.co.
 */
export const VOICE_INSTALL_SITES = `From ghcr.io, ${VOICE_BUILD_PACKAGE_SITES.join(", ")} and huggingface.co`;
/** Once the engine is in place only the speech model is fetched. */
const MODEL_ONLY_SITES = "From huggingface.co";

/** The speech models' exact sizes in bytes (voice_model_download_service.py, VOICE_STT_MODEL_SPECS). */
const MODEL_BYTES: Record<string, number> = { "tiny.en": 77_704_715, "base.en": 147_964_211 };

/** Whether this run fetches the engine too. Set at the press; a run found already going says everything. */
let withEngine = true;

const mbOf = (bytes: number): number => Math.round(bytes / 1_000_000);

function face(st: VoiceJobStatus | null): JobFace {
  const base = { title: "Voice engine install", stoppingTitle: "Stopping the install", sites: withEngine ? VOICE_INSTALL_SITES : MODEL_ONLY_SITES };
  const stage = st?.stage ?? "";
  const model = st?.model_id || "base.en";
  if (stage === "download_start" || stage === "downloading") {
    const total = MODEL_BYTES[model] ?? MODEL_BYTES["base.en"]!;
    const pct = Math.min(100, Math.max(0, Math.round(st?.progress_pct ?? 0)));
    const far = `${mbOf((total * pct) / 100)} of ${mbOf(total)} MB`;
    return { ...base, line1: `Downloading the ${model} speech model`, line2: far, fraction: pct / 100, barLine: `${pct}% · ${far}` };
  }
  if (stage === "verifying") return { ...base, line1: "Checking the file", line2: KEEP_AWAKE_LINE, fraction: 1 };
  if (stage === "model_ready") return { ...base, line1: "Finishing up", line2: KEEP_AWAKE_LINE, fraction: 1 };
  if (stage === "binary_build_start") {
    return { ...base, line1: "Building the voice engine", line2: "This part has no percentage. It can take a few minutes.", fraction: null };
  }
  if (stage === "binary_ready") return { ...base, line1: "Getting the speech model ready", line2: KEEP_AWAKE_LINE, fraction: null };
  return { ...base, line1: "Fetching the build image", line2: KEEP_AWAKE_LINE, fraction: null };
}

/** How the run ended, for the bar when its card was out of sight (the drawing's own sentences). */
function result(st: VoiceJobStatus): JobResult | undefined {
  const error = (st.error ?? "").replace(/`+/g, "").trim();
  if (st.phase === "done" && !error) return { tone: "ok", title: "Voice install finished", sentence: "Voice engine installed." };
  if (st.phase === "cancelled") return { tone: "quiet", title: "Voice install cancelled", sentence: "Install cancelled." };
  if (st.phase === "failed") return { tone: "bad", title: "Voice install failed", sentence: error ? `Install failed: ${error}` : "Install failed." };
  return undefined;
}

/** A status that says "idle" just after the press is the back end not having heard of the install yet, not its end. */
const notYetSeen = (st: VoiceJobStatus | null | undefined): boolean => st?.phase === "idle" && voiceInstallInStartGrace();

const job = createStatusJob<VoiceJobStatus>({
  id: VOICE_INSTALL_JOB,
  read: async () => {
    const st = await callDeckyWithTimeout<[], VoiceJobStatus>("get_voice_install_status", [], DECKY_RPC_TIMEOUT_MS);
    return notYetSeen(st) ? null : st;
  },
  isRunning: (st) => st.phase === "running" && !st.done,
  face,
  result,
  cancel: () => callDeckyWithTimeout<[], { cancel_requested?: boolean }>("cancel_voice_install", [], DECKY_RPC_TIMEOUT_MS),
  // The follower is the only reader while no section is on screen: it owns the marker and the one "ready" toast.
  onEndedAway: (st) => {
    const wasOurs = takeVoiceInstallMarker();
    if (wasOurs && st.phase === "done") {
      toaster.toast({ title: "Voice engine ready", body: "Voice input is set up and ready to use.", duration: 4000 });
    }
  },
});

/** An install was pressed: the card is there at once. `engineReady`: only the speech model is still to fetch. */
export function beginVoiceInstallJob(engineReady: boolean): void {
  withEngine = !engineReady;
  job.begin();
}

/** A section is rebuilt while an install it did not start goes on: the card is there at once. */
export function resumeVoiceInstallJob(): void {
  withEngine = true;
  job.resume();
}

/** The back end took the run (or refused it: the card goes quietly). */
export const voiceInstallJobAccepted = (): void => job.accepted();
export const voiceInstallJobRefused = (): void => job.refused();

/** Every status the section reads comes through here: a running one keeps the card, anything else ends the job. */
export function noteVoiceInstallStatus(st: VoiceJobStatus | null | undefined): void {
  if (notYetSeen(st)) return;
  job.note(st);
}

/** The section says it is on screen and reads the status itself, for as long as it is mounted and polling (`reading`). */
export function useVoiceInstallJobReader(reading: boolean): void {
  job.useReader(reading);
}

/** Test-only reset. */
export function resetVoiceInstallJobForTests(): void {
  withEngine = true;
  job.reset();
}
