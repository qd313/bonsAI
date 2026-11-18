/**
 * Title: The downloads running right now, for the job card and the bar that follows you
 *
 * Purpose: A small memory, outside React, of every long job the plugin is running (the Ollama tab's install or
 * update now; the knowledge library's download and the voice install next, lane D4b): what its card says (the
 * title, two lines, the sites, how far), when it started, whether a Cancel is on its way (one that fails or goes
 * unanswered puts the button back and the card says "Could not stop. Try again."), how to cancel it, and
 * whether its card is in sight. The job card (JobCard.tsx) draws one job where its buttons were; the bar at the
 * bottom of the panel (JobBar.tsx; plan 105, board 5 tab 2, round 2 "Elsewhere") reads the same job from here, so
 * the two can never say different things. The bar shows only the jobs whose card cannot be seen, newest first, one
 * at a time ("2 jobs" switches), and for a few seconds after one ends out of sight, how it ended (a failure stays
 * until its card is seen again).
 *
 * Used for: OllamaWhereAiRunsSection.tsx through ollamaSetupJob.ts, which turns the setup run's status into a card;
 * JobCard.tsx (whether its card is in sight); JobBar.tsx; TabBodyFocusRoot.tsx (X cancels from anywhere).
 *
 * Solves: Two things a job's own screen cannot hold. A job outlives the screen that started it: folding its section
 * shut, switching tabs or a Decky box closing all take the screen away, and the job must still be known (and still
 * cancellable) elsewhere. And a double press must not start and cancel at once: `cancelJob` ignores a Cancel in the
 * first half second after the job started (`DOUBLE_PRESS_GUARD_MS`, the plan's small question 4).
 *
 * Does not: Poll anything, draw anything, or move the ring. Each job's owner publishes its face as it changes and
 * ends it when it ends.
 */
import { useSyncExternalStore } from "react";

/** A Cancel pressed within this long of the job starting is ignored: a double press cannot start and cancel at once. */
export const DOUBLE_PRESS_GUARD_MS = 500;

/** How long a Cancel request may go unanswered before the card gives up on it and puts Cancel back. */
export const CANCEL_TIMEOUT_MS = 10_000;

/** What the card says when a Cancel request failed or never answered: what happened, then what to do. */
export const COULD_NOT_STOP = "Could not stop. Try again.";

/** What a running job's card shows (board 5 tab 2: `b5t2Card2`). */
export interface JobFace {
  /** The card's title while it runs: "Updating AI & models". */
  title: string;
  /** The title once Cancel is on its way: "Stopping the update". */
  stoppingTitle: string;
  /** What it is doing now: "Downloading model 1 of 2 · gemma4:e2b-it-qat". */
  line1: string;
  /** How far and how fast, or what to keep in mind: "1.3 GB of 3.2 GB · 25 MB/s · about 1m left". */
  line2: string;
  /** Where the downloads come from: "From ollama.com and registry.ollama.ai". */
  sites: string;
  /** How far the whole job is, 0 to 1; null while the step has no percentage (the bar shows moving stripes). */
  fraction: number | null;
}

/** One running job. */
export interface RunningJob {
  id: string;
  face: JobFace;
  /** When it was first published, for the double-press guard (and, with several, which is newest). */
  startedAt: number;
  /** True once a Cancel has been sent: the card reads its stopping title until the owner ends the job. */
  stopping: boolean;
  /** True when the last Cancel request failed or timed out: Cancel is back, and the card says so. */
  stopFailed: boolean;
}

/** The title a card or the bar shows for `job`: the failure words, the stopping title, or the running title. */
export function jobTitle(job: RunningJob): string {
  return job.stopFailed ? COULD_NOT_STOP : job.stopping ? job.face.stoppingTitle : job.face.title;
}

/** How a job ended, for the bar when its card was out of sight: "Update finished" and the run's own sentence. */
export interface JobResult {
  tone: "ok" | "bad" | "quiet";
  title: string;
  sentence: string;
}

/** How long a result stays on the bar (the drawing's 4 seconds); a failure stays until its card is seen. */
const RESULT_MS = 4000;

const jobs = new Map<string, RunningJob>();
/** Asks the job's owner to stop it. A returned promise is watched: a rejection, or no answer in time, puts Cancel back. */
type CancelFn = () => void | Promise<unknown>;
const cancels = new Map<string, CancelFn>();
/**
 * Per job, which Cancel press is the latest, so an answer to an older press cannot undo a newer one. The numbers come
 * from one counter for the whole app that is never reset, so a new job that reuses an id never matches an old press.
 */
const cancelSeq = new Map<string, number>();
let pressCount = 0;
/**
 * Per job, which of its cards are on screen now: JobCard.tsx says so for the card in its tab ("card"), and a second
 * card for the same job elsewhere says so under its own name (the first-time setup's card on Main, "first-run-card"),
 * so the two can come and go in any order (a tab still sliding away unmounts after the new one mounts).
 */
const seen = new Map<string, Set<string>>();
const cardInSight = (id: string): boolean => (seen.get(id)?.size ?? 0) > 0;
const results = new Map<string, { result: JobResult; at: number }>();
/** The job the person switched the bar to with "2 jobs"; null for the newest. */
let pinned: string | null = null;
const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version += 1;
  for (const fn of listeners) fn();
}

/** Start job `id`, or change what its card says. `cancel` asks the job's owner to stop it; `now` is for tests. */
export function publishJob(id: string, face: JobFace, cancel: CancelFn, now: number = Date.now()): void {
  const was = jobs.get(id);
  jobs.set(id, { id, face, startedAt: was?.startedAt ?? now, stopping: was?.stopping ?? false, stopFailed: was?.stopFailed ?? false });
  cancels.set(id, cancel);
  changed();
}

/**
 * Job `id` has ended (finished, failed or stopped): it leaves the card and the bar. With its card out of sight, the
 * bar says how it ended (`result`) for a few seconds; a failure stays until the card is seen.
 */
export function endJob(id: string, result?: JobResult, now: number = Date.now()): void {
  if (!jobs.delete(id)) return;
  cancels.delete(id);
  cancelSeq.delete(id);
  if (result && !cardInSight(id)) {
    results.set(id, { result, at: now });
    if (result.tone !== "bad") window.setTimeout(changed, RESULT_MS + 20);
  }
  changed();
}

/**
 * Job `id`'s card has come into sight (or gone out of it); `who` names which card, when a job has more than one. While
 * any of its cards is in sight the job keeps off the bar, and a result waiting for it is shown there and goes.
 */
export function noteJobCardSeen(id: string, inSight: boolean, who = "card"): void {
  const cards = seen.get(id) ?? new Set<string>();
  if (inSight === cards.has(who) && !(inSight && results.has(id))) return;
  if (inSight) {
    cards.add(who);
    results.delete(id);
  } else cards.delete(who);
  seen.set(id, cards);
  changed();
}

/** What the bar shows: the job (newest first, or the one switched to), how many want the bar, or a result. */
export interface BarView {
  job: RunningJob | null;
  count: number;
  result: (JobResult & { id: string }) | null;
}

/** The bar's view now. Nothing (job and result null) means no bar. */
export function barView(now: number = Date.now()): BarView {
  const away = [...jobs.values()].filter((j) => !cardInSight(j.id)).sort((a, b) => b.startedAt - a.startedAt);
  if (away.length) return { job: away.find((j) => j.id === pinned) ?? away[0]!, count: away.length, result: null };
  const ended = [...results.entries()]
    .filter(([, r]) => r.result.tone === "bad" || now - r.at < RESULT_MS)
    .sort((a, b) => b[1].at - a[1].at)[0];
  return { job: null, count: 0, result: ended ? { id: ended[0], ...ended[1].result } : null };
}

/** "2 jobs" on the bar: show the next job that wants the bar. */
export function switchBarJob(): void {
  const away = [...jobs.values()].filter((j) => !cardInSight(j.id)).sort((a, b) => b.startedAt - a.startedAt);
  if (away.length < 2) return;
  const at = away.findIndex((j) => j.id === (pinned ?? away[0]!.id));
  pinned = away[(at + 1) % away.length]!.id;
  changed();
}

/** X, from anywhere: cancel the job the bar shows, else the newest running one. Out: true when a job was there. */
export function cancelJobFromX(now: number = Date.now()): boolean {
  const target = barView(now).job ?? [...jobs.values()].sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!target) return false;
  cancelJob(target.id, now);
  return true;
}

/** The Cancel request of press `seq` for job `id` failed or never answered: put Cancel back, unless the job moved on. */
function cancelDidNotLand(id: string, seq: number): void {
  const job = jobs.get(id);
  if (!job || !job.stopping || cancelSeq.get(id) !== seq) return;
  jobs.set(id, { ...job, stopping: false, stopFailed: true });
  changed();
}

/** Watch the owner's Cancel request: a rejection or no answer within `CANCEL_TIMEOUT_MS` means it did not land. */
function watchCancel(id: string, seq: number, sent: Promise<unknown>): void {
  const timer = window.setTimeout(() => cancelDidNotLand(id, seq), CANCEL_TIMEOUT_MS);
  sent.then(
    () => window.clearTimeout(timer),
    () => {
      window.clearTimeout(timer);
      cancelDidNotLand(id, seq);
    },
  );
}

/**
 * Cancel job `id`, the way every Cancel press does. Out: true when the cancel was sent; false when there is no such
 * job, a cancel is already on its way, or the press came within `DOUBLE_PRESS_GUARD_MS` of the start. If the owner's
 * request then fails or does not answer in time, the job is no longer stopping and says so (`stopFailed`); the next
 * press sends a new request.
 */
export function cancelJob(id: string, now: number = Date.now()): boolean {
  const job = jobs.get(id);
  if (!job || job.stopping || now - job.startedAt < DOUBLE_PRESS_GUARD_MS) return false;
  const seq = ++pressCount;
  cancelSeq.set(id, seq);
  jobs.set(id, { ...job, stopping: true, stopFailed: false });
  changed();
  let sent: void | Promise<unknown>;
  try {
    sent = cancels.get(id)?.();
  } catch (e) {
    sent = Promise.reject(e);
  }
  if (sent && typeof (sent as Promise<unknown>).then === "function") watchCancel(id, seq, sent as Promise<unknown>);
  return true;
}

/** Job `id` while it runs, else null. */
export function runningJob(id: string): RunningJob | null {
  return jobs.get(id) ?? null;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Job `id` while it runs, else null, redrawing the caller when it changes. */
export function useRunningJob(id: string): RunningJob | null {
  useSyncExternalStore(subscribe, () => version);
  return runningJob(id);
}

/** The bar's view, redrawing the caller when it changes. */
export function useBarView(): BarView {
  useSyncExternalStore(subscribe, () => version);
  return barView();
}

/** Test-only reset. */
export function resetRunningJobsForTests(): void {
  jobs.clear();
  cancels.clear();
  cancelSeq.clear();
  seen.clear();
  results.clear();
  pinned = null;
  changed();
}
