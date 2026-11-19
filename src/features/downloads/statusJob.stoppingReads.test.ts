/**
 * Title: A job that is stopping is read several times a second, with no screen of its own on screen
 *
 * Purpose: Pin the follower side of the fast reads after a Cancel (statusJob.ts). Read on the card as a person sees it
 * (the job is there or it is gone): with the status faked as "running" until the Cancel lands and "cancelled" straight
 * after, the card is gone within 400 ms of the press, not 1.5 seconds; the fast reads stop when the job ends, when the
 * Cancel is reported as failed, and after 20 seconds of a job that will not stop; nothing is read faster while nothing is
 * stopping.
 *
 * Does not: draw a screen (the *.stoppingReads.test.tsx files beside each screen do) or call a real back end.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStatusJob, type StatusJob } from "./statusJob";
import { cancelJob, resetRunningJobsForTests, runningJob, type JobFace } from "./runningJobs";

type St = { phase: "running" | "cancelled" };
const ID = "stopping-job";
const face = (): JobFace => ({ title: "Working", stoppingTitle: "Stopping", line1: "", line2: "", sites: "", fraction: null });

let phase: St["phase"] = "running";
let reads = 0;
let cancelAnswer: () => Promise<unknown> = async () => {
  phase = "cancelled";
  return {};
};
let job: StatusJob<St>;

/** Moves the clock until the follower has just read once, so the next slow read is a full 1.5 seconds away. */
async function justAfterARead(): Promise<void> {
  const before = reads;
  while (reads === before) await vi.advanceTimersByTimeAsync(50);
}

beforeEach(() => {
  vi.useFakeTimers();
  resetRunningJobsForTests();
  phase = "running";
  reads = 0;
  cancelAnswer = async () => {
    phase = "cancelled";
    return {};
  };
  job = createStatusJob<St>({
    id: ID,
    read: async () => {
      reads += 1;
      return { phase };
    },
    isRunning: (st) => st.phase === "running",
    face,
    result: () => undefined,
    cancel: () => cancelAnswer(),
  });
  job.begin();
  job.accepted();
  job.note({ phase: "running" });
});
afterEach(() => {
  job.reset();
  vi.useRealTimers();
});

describe("a Cancel is followed by fast reads, wherever the person is", () => {
  it("the card is gone within 400 ms of the press when the back end stops the job straight away", async () => {
    await vi.advanceTimersByTimeAsync(600);
    await justAfterARead();
    expect(cancelJob(ID)).toBe(true);
    expect(runningJob(ID)?.stopping).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(runningJob(ID)).toBeNull();
  });

  it("no fast reading goes on after the job ended", async () => {
    await vi.advanceTimersByTimeAsync(600);
    expect(cancelJob(ID)).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(runningJob(ID)).toBeNull();
    const after = reads;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(reads).toBe(after);
  });

  it("a Cancel that fails goes back to the slow pace", async () => {
    cancelAnswer = () => Promise.reject(new Error("RPC failed"));
    await vi.advanceTimersByTimeAsync(600);
    await justAfterARead();
    expect(cancelJob(ID)).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(runningJob(ID)).toMatchObject({ stopping: false, stopFailed: true });
    const before = reads;
    await vi.advanceTimersByTimeAsync(3100);
    expect(reads - before).toBeLessThanOrEqual(3);
  });

  it("a job that will not stop is read fast for about 20 seconds and then at the slow pace again", async () => {
    cancelAnswer = async () => ({});
    await vi.advanceTimersByTimeAsync(600);
    await justAfterARead();
    cancelJob(ID);
    const start = reads;
    await vi.advanceTimersByTimeAsync(19_000);
    expect(reads - start).toBeGreaterThan(40);
    await vi.advanceTimersByTimeAsync(2000);
    const later = reads;
    await vi.advanceTimersByTimeAsync(3100);
    expect(reads - later).toBeLessThanOrEqual(3);
  });

  it("nothing is read faster while nothing is stopping", async () => {
    await vi.advanceTimersByTimeAsync(600);
    const start = reads;
    await vi.advanceTimersByTimeAsync(6000);
    expect(reads - start).toBeLessThanOrEqual(4);
  });
});
