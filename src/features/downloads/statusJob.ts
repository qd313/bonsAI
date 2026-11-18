/**
 * Title: A running download that is read from the back end's status, as a job on the card and the bar
 *
 * Purpose: The shape every download that has a status call shares (plan 106, lane F3: the knowledge library's
 * download and the voice install; the Ollama install keeps its own, ollamaSetupJob.ts). Hand it how to read the
 * status, how to tell a running one, the card's words, how a run ended and how to stop it, and it keeps the job
 * (runningJobs.ts) in step with the back end wherever the person is: a status that says "running" publishes the
 * card, anything else ends it, and while no screen of the job's own is on screen to read the status, it reads it
 * itself every 1.5 seconds, so the bar at the bottom of the panel follows the job to another tab or a folded
 * section and goes the moment the run ends.
 *
 * Used for: knowledgeLibraryJob.ts, voiceInstallJob.ts.
 *
 * Solves: Two things a screen cannot hold. The screen that pressed the button is often gone (a Decky box closing
 * rebuilds the tab; another tab; a folded section), yet the job goes on and must stay known and cancellable. And a
 * status read between the press and the back end's answer still says "nothing running" (or the last run's end):
 * until the starter says the back end took the run, such an answer waits, so the card is never taken away under the ring.
 *
 * Does not: Start a run, draw anything or move the ring. The starter puts the card up at the press and then says
 * whether the back end took the run; the screens hand it every status they read.
 */
import { useEffect } from "react";

import { endJob, publishJob, runningJob, type JobFace, type JobResult } from "./runningJobs";

/** What every status job says to the person while it waits for its first words. */
export const KEEP_AWAKE_LINE = "Keep the Deck awake and online until this finishes.";

/** How often the status is read while no screen of the job's own reads it. */
const FOLLOW_MS = 1500;
/** An unanswered start holds back "nothing running" answers for at most this long (the start's own deadline). */
const START_HOLD_MS = 15_000;

export interface StatusJobSpec<S> {
  /** The job's id in runningJobs.ts. */
  id: string;
  /** Reads the status from the back end (a rejection is ignored; the next read tries again). */
  read: () => Promise<S | null | undefined>;
  /** True while the status says the run is going. */
  isRunning: (st: S) => boolean;
  /** The card's words; `null` is the moment of the press, before any status. */
  face: (st: S | null) => JobFace;
  /** How the run ended, for the bar when its card was out of sight; undefined says nothing. */
  result: (st: S) => JobResult | undefined;
  /** Asks the back end to stop the run. The request is handed back: a refusal or silence puts Cancel back. */
  cancel: () => Promise<unknown>;
  /** Told about every status the follower reads (not the screens'): the owner keeps its own notes in step. */
  onFollowed?: (st: S) => void;
  /** Told when a run's end was seen by the follower, the screen being away. */
  onEndedAway?: (st: S) => void;
}

export interface StatusJob<S> {
  /** The press: the card is there at once. */
  begin: () => void;
  /** A screen is rebuilt while a run it did not start goes on: the card is there at once, nothing is held back. */
  resume: () => void;
  /** The back end took the run: from here a status that says "not running" is the run's end. */
  accepted: () => void;
  /** The back end refused (or the call failed): the card goes without a word on the bar. */
  refused: () => void;
  /** A status was read (null: nothing is known; the job ends quietly). */
  note: (st: S | null | undefined) => void;
  /**
   * A screen of the job's own is on screen and reads the status itself, for as long as it is mounted and `reading` (a
   * screen whose own reading has stopped, a poll that ended on a failed read, hands the reading back to the job).
   */
  useReader: (reading?: boolean) => void;
  /** The last status seen while it was a running one: where a screen rebuilt mid-run starts. */
  lastRunning: () => S | null;
  /** Test-only reset. */
  reset: () => void;
}

/**
 * In: how to read, judge, word and stop one kind of run (`StatusJobSpec`). Out: its job: the press, the answer to the
 * start, every status read, the reading screen's hook, and a reset for tests. See the header for the rules it keeps.
 */
export function createStatusJob<S>(spec: StatusJobSpec<S>): StatusJob<S> {
  let last: S | null = null;
  let owners = 0;
  let timer: number | null = null;
  /** Until when "nothing running" answers are held back: set by `begin`, cleared by `accepted` or a running status. */
  let holdUntil = 0;

  function follow(): void {
    const want = owners === 0 && runningJob(spec.id) !== null;
    if (want && timer === null) timer = window.setInterval(readOnce, FOLLOW_MS);
    if (!want && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function note(st: S | null | undefined): void {
    if (st && spec.isRunning(st)) {
      holdUntil = 0;
      last = st;
      publishJob(spec.id, spec.face(st), spec.cancel);
    } else if (st && Date.now() < holdUntil) {
      return;
    } else {
      last = null;
      endJob(spec.id, st ? spec.result(st) : undefined);
    }
    follow();
  }

  function readOnce(): void {
    void Promise.resolve(spec.read())
      .then((st) => {
        if (!st) return;
        const wasRunning = runningJob(spec.id) !== null;
        spec.onFollowed?.(st);
        note(st);
        if (wasRunning && runningJob(spec.id) === null) spec.onEndedAway?.(st);
      })
      .catch(() => {});
  }

  return {
    begin() {
      holdUntil = Date.now() + START_HOLD_MS;
      publishJob(spec.id, spec.face(null), spec.cancel);
      follow();
    },
    resume() {
      if (runningJob(spec.id) === null) publishJob(spec.id, spec.face(null), spec.cancel);
      follow();
    },
    accepted() {
      holdUntil = 0;
    },
    refused() {
      holdUntil = 0;
      last = null;
      endJob(spec.id);
      follow();
    },
    note,
    useReader(reading = true) {
      useEffect(() => {
        if (!reading) return;
        owners += 1;
        follow();
        return () => {
          owners -= 1;
          follow();
        };
      }, [reading]);
    },
    lastRunning: () => last,
    reset() {
      last = null;
      owners = 0;
      holdUntil = 0;
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      endJob(spec.id);
    },
  };
}
