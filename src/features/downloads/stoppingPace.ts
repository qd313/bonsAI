/**
 * Title: How often a job's status is read, and how that speeds up after a Cancel
 *
 * Purpose: One answer to "how many milliseconds between two reads of this job's status" for every reader: the follower
 * in statusJob.ts and ollamaSetupJob.ts (no screen of the job's own on screen) and each screen that reads the status
 * while it is on screen (the Ollama tab, the knowledge library, the voice install, the first-time setup's card). From the
 * moment a Cancel is sent until the job ends, the Cancel is reported as failed, or about 20 seconds pass, the answer is
 * 300 ms; otherwise it is the reader's own routine pace (1.5 seconds, 1.2 for the voice install).
 *
 * Used for: statusJob.ts and ollamaSetupJob.ts (through `createPacedFollower`), useLocalOllamaSetupFlow.tsx, KnowledgeBaseSection.tsx,
 * VoiceInputSettingsSection.tsx, FirstRunSetupCard.tsx.
 *
 * Solves: A Cancel used to leave the card on "Stopping" until the next routine read, up to 1.5 seconds after the back
 * end had stopped the job in a fifth of a second. Every reader asks this one place, so they all speed up together and
 * the screen's copy of the status is never older than the card's.
 *
 * Does not: know what is read or why a job is stopping. The caller hands in when its Cancel was sent (a job's
 * `stoppingAt`, or null when nothing is stopping), and for the follower, the read to make.
 */
import { useEffect, useReducer } from "react";

import { onRunningJobsChange, type RunningJob } from "./runningJobs";

/** The routine pace of a status read. */
export const ROUTINE_READ_MS = 1500;
/** The pace while a job is stopping. */
const STOPPING_READ_MS = 300;
/** How long after the Cancel the fast pace may last, if the job does not end. */
const STOPPING_READ_WINDOW_MS = 20_000;

/** True while a Cancel sent at `stoppingAt` is within its 20 seconds of fast reads. */
function stoppingReadsOn(stoppingAt: number | null | undefined, now: number = Date.now()): boolean {
  return typeof stoppingAt === "number" && now - stoppingAt < STOPPING_READ_WINDOW_MS;
}

/** Milliseconds between two reads now: 300 while a Cancel is fresh, else `routineMs`. */
function readPaceMs(stoppingAt: number | null | undefined, routineMs: number = ROUTINE_READ_MS, now: number = Date.now()): number {
  return stoppingReadsOn(stoppingAt, now) ? STOPPING_READ_MS : routineMs;
}

/**
 * The pace for a screen's own poll, redrawn when it changes: put it in the poll effect's dependencies, so the poll is
 * set up again at the new pace. The fast pace ends by itself once its 20 seconds are over.
 */
export function useReadPaceMs(stoppingAt: number | null | undefined, routineMs: number = ROUTINE_READ_MS): number {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const fast = stoppingReadsOn(stoppingAt);
  useEffect(() => {
    if (!fast || typeof stoppingAt !== "number") return;
    const id = window.setTimeout(redraw, Math.max(0, stoppingAt + STOPPING_READ_WINDOW_MS - Date.now()) + 5);
    return () => window.clearTimeout(id);
  }, [fast, stoppingAt]);
  return fast ? STOPPING_READ_MS : routineMs;
}

/**
 * The follower of a job whose status no screen of its own is reading: `read` is called every 1.5 seconds while the job
 * runs and `screenReads()` is false, and every 300 ms from a Cancel until the job ends. Call `follow()` whenever the job
 * starts, ends or a screen comes or goes (it also hears a Cancel by itself, but only while its timer runs, so a finished
 * job leaves nothing listening); `stop()` is for test resets.
 */
export function createPacedFollower(opts: {
  job: () => RunningJob | null;
  screenReads: () => boolean;
  read: () => void;
}): { follow: () => void; stop: () => void } {
  let timer: number | null = null;
  /** The pace the timer was set up at: a Cancel changes the wanted pace, and the timer is set up again. */
  let timerMs = 0;
  let unlisten: (() => void) | null = null;

  function stop(): void {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }

  function follow(): void {
    const job = opts.job();
    const want = !opts.screenReads() && job !== null;
    const ms = readPaceMs(job?.stoppingAt, ROUTINE_READ_MS);
    if (timer !== null && (!want || ms !== timerMs)) stop();
    if (want && timer === null) {
      timerMs = ms;
      // Each tick looks again, so the fast pace ends by itself once its 20 seconds are over.
      timer = window.setInterval(() => {
        opts.read();
        follow();
      }, ms);
    }
    if (timer !== null && unlisten === null) unlisten = onRunningJobsChange(follow);
    if (timer === null && unlisten !== null) {
      unlisten();
      unlisten = null;
    }
  }

  return { follow, stop };
}
