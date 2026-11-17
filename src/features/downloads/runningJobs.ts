/**
 * Title: The downloads running right now, for the job card and the bar that follows you
 *
 * Purpose: A small memory, outside React, of every long job the plugin is running (the Ollama tab's install or
 * update now; the knowledge library's download and the voice install next, lane D4b): what its card says (the
 * title, two lines, the sites, how far), when it started, whether a Cancel is on its way, and how to cancel it.
 * The job card (JobCard.tsx) draws one job where its buttons were; the bar at the bottom of the panel (plan 105,
 * board 5 tab 2, round 2 "Elsewhere") reads the same job from here, so the two can never say different things.
 *
 * Used for: OllamaWhereAiRunsSection.tsx through ollamaSetupJob.ts, which turns the setup run's status into a card.
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
}

const jobs = new Map<string, RunningJob>();
const cancels = new Map<string, () => void>();
const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version += 1;
  for (const fn of listeners) fn();
}

/** Start job `id`, or change what its card says. `cancel` asks the job's owner to stop it; `now` is for tests. */
export function publishJob(id: string, face: JobFace, cancel: () => void, now: number = Date.now()): void {
  const was = jobs.get(id);
  jobs.set(id, { id, face, startedAt: was?.startedAt ?? now, stopping: was?.stopping ?? false });
  cancels.set(id, cancel);
  changed();
}

/** Job `id` has ended (finished, failed or stopped): it leaves the card and the bar. */
export function endJob(id: string): void {
  if (!jobs.delete(id)) return;
  cancels.delete(id);
  changed();
}

/**
 * Cancel job `id`, the way every Cancel press does. Out: true when the cancel was sent; false when there is no such
 * job, a cancel is already on its way, or the press came within `DOUBLE_PRESS_GUARD_MS` of the start.
 */
export function cancelJob(id: string, now: number = Date.now()): boolean {
  const job = jobs.get(id);
  if (!job || job.stopping || now - job.startedAt < DOUBLE_PRESS_GUARD_MS) return false;
  jobs.set(id, { ...job, stopping: true });
  changed();
  cancels.get(id)?.();
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

/** Test-only reset. */
export function resetRunningJobsForTests(): void {
  jobs.clear();
  cancels.clear();
  changed();
}
