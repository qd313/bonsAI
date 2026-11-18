/**
 * Title: The knowledge library's download or update, as a job on the card and the bar
 *
 * Purpose: Turns the library download's status (the back end's `get_rag_corpus_status`) into the job card's words
 * (downloads/runningJobs.ts; board 5 tab 2, round 2 "Elsewhere", plan 105 lane D4b, built in plan 106 lane F3): the
 * title ("Updating the library" with a library already installed, "Downloading the library" without), what it is
 * doing, how far, the sites it comes from, and how it ended. While no knowledge library section is on screen to read
 * the status (its section folded shut, another tab, a Decky box rebuilding the tab) the job reads the status itself
 * every 1.5 seconds, so the bar at the bottom of the panel follows the download and goes when it ends.
 *
 * Used for: KnowledgeBaseSection.tsx, which tells the job when a download is pressed, hands it every status it reads
 * and draws the card; index.tsx's bar reads the same job from runningJobs.ts.
 *
 * Solves: The library's download had its own Cancel button and a "43% (62 / 210 MB)" line, and nothing at all once the
 * person left the section. Now it is the same card as the Ollama tab's, and the bar shows it elsewhere.
 *
 * Does not: Start a download (the section does, after its notices), cancel it by itself (the card's Cancel calls
 * `cancel_rag_corpus_download` through runningJobs.ts), or draw anything.
 */
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../shared/deckyCall";
import { KEEP_AWAKE_LINE, createStatusJob } from "../downloads/statusJob";
import type { JobFace, JobResult } from "../downloads/runningJobs";
import { setKbDownloadMarker } from "./kbDownloadMarker";
import { noteKbStatusRead, type KbStatusForSwitch } from "./kbLibrarySignal";

/** The job's id in runningJobs.ts. */
export const KB_LIBRARY_JOB = "kb-library";

/** The part of the back end's status the job reads. */
export type KbJobStatus = KbStatusForSwitch & {
  stage?: string;
  bytes_downloaded?: number;
  bytes_total?: number;
  error?: string;
  done?: boolean;
};

/** Where the library comes from (downloads/downloadSites.ts: KNOWLEDGE_LIBRARY_NOTICES), as the card and the lines under the buttons say it. */
export const KB_LIBRARY_SITES = "From huggingface.co (github.com if it does not answer)";
const MIB = 1024 * 1024;

/** "update" when a library is already installed (the old one stays until the new one lands), else "download". */
let kind: "update" | "download" = "download";

const mb = (bytes: number | undefined): number => Math.round((bytes ?? 0) / MIB);

function face(st: KbJobStatus | null): JobFace {
  const title = kind === "update" ? "Updating the library" : "Downloading the library";
  const base = { title, stoppingTitle: "Stopping the download", sites: KB_LIBRARY_SITES };
  if (st?.stage === "download" && (st.bytes_total ?? 0) > 0) {
    const far = `${mb(st.bytes_downloaded)} of ${mb(st.bytes_total)} MB`;
    const pct = Math.min(100, Math.max(0, Math.round(((st.bytes_downloaded ?? 0) * 100) / (st.bytes_total ?? 1))));
    const fraction = Math.min(1, Math.max(0, (st.bytes_downloaded ?? 0) / (st.bytes_total ?? 1)));
    return { ...base, line1: "Downloading the knowledge library", line2: far, fraction, barLine: `${pct}% · ${far}` };
  }
  if (st?.stage === "complete") return { ...base, line1: "Finishing up", line2: KEEP_AWAKE_LINE, fraction: 1 };
  return { ...base, line1: "Looking up the newest library", line2: KEEP_AWAKE_LINE, fraction: null };
}

/** What the lines under the buttons say once a download has installed. */
export const kbLibraryDoneSentence = (): string => (kind === "update" ? "Library updated." : "Library downloaded.");

/** How the run ended, for the bar when its card was out of sight (the drawing's own sentences). */
function result(st: KbJobStatus): JobResult | undefined {
  const error = (st.error ?? "").replace(/`+/g, "").trim();
  if (st.phase === "done" && !error) {
    return { tone: "ok", title: "Library download finished", sentence: kbLibraryDoneSentence() };
  }
  if (st.phase === "cancelled") {
    return { tone: "quiet", title: "Library download cancelled", sentence: "Download cancelled. Nothing was installed — start it again whenever you like." };
  }
  if (st.phase === "failed") {
    return { tone: "bad", title: "Library download failed", sentence: error ? `Download failed: ${error}` : "Download failed." };
  }
  return undefined;
}

const job = createStatusJob<KbJobStatus>({
  id: KB_LIBRARY_JOB,
  read: () => callDeckyWithTimeout<[{ pc_ip: string }], KbJobStatus>("get_rag_corpus_status", [{ pc_ip: "" }], DECKY_RPC_TIMEOUT_MS),
  isRunning: (st) => st.phase === "running" && !st.done,
  face,
  result,
  cancel: () => callDeckyWithTimeout<[], { cancel_requested?: boolean }>("cancel_rag_corpus_download", [], DECKY_RPC_TIMEOUT_MS),
  // The follower is the only reader while no section is on screen: it keeps the switch and the marker in step.
  onFollowed: (st) => noteKbStatusRead(st),
  onEndedAway: () => setKbDownloadMarker(null),
});

/** A download or an Update was pressed: the card is there at once. `installed`: a library is already in place. */
export function beginKbLibraryJob(installed: boolean): void {
  kind = installed ? "update" : "download";
  job.begin();
}

/** A section is rebuilt while a download it did not start goes on: the card is there at once. */
export function resumeKbLibraryJob(installed: boolean): void {
  kind = installed ? "update" : "download";
  job.resume();
}

/** The back end took the run (or refused it: the card goes quietly). */
export const kbLibraryJobAccepted = (): void => job.accepted();
export const kbLibraryJobRefused = (): void => job.refused();

/** Every status the section reads comes through here: a running one keeps the card, anything else ends the job. */
export function noteKbLibraryStatus(st: KbJobStatus | null | undefined): void {
  if (st && st.phase === "running" && !st.done && !job.lastRunning()) kind = st.installed ? "update" : "download";
  job.note(st);
}

/** The section says it is on screen and reads the status itself, for as long as it is mounted. */
export function useKbLibraryJobReader(): void {
  job.useReader();
}

/** Test-only reset. */
export function resetKbLibraryJobForTests(): void {
  kind = "download";
  job.reset();
}
