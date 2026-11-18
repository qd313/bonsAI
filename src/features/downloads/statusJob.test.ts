/**
 * Title: A status-read download as a job: the press, the follower, and a stale answer
 *
 * Purpose: Pin statusJob.ts (plan 106, lane F3), the part the knowledge library's download and the voice install
 * share. The press puts the card up at once; a status read between the press and the back end's answer that says
 * "nothing running" does not take it away (until `accepted()`); a running status keeps it with the status's words;
 * anything else ends it with how it ended; while no screen of the job's own reads the status, the job reads it itself
 * every 1.5 seconds and stops when the run ends or a screen is back; a refused start ends the job without a word on
 * the bar; a screen rebuilt mid-run gets the card at once.
 *
 * Does not: draw anything or call a real back end.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStatusJob, type StatusJob } from "./statusJob";
import { barView, resetRunningJobsForTests, runningJob, type JobFace } from "./runningJobs";

type St = { phase: "running" | "done" | "failed" | "idle"; label?: string };
const ID = "test-job";

const face = (st: St | null): JobFace => ({
  title: "Working",
  stoppingTitle: "Stopping",
  line1: st?.label ?? "Starting",
  line2: "",
  sites: "From example.com",
  fraction: null,
});

let reads: St[] = [];
let readCount = 0;
let job: StatusJob<St>;

beforeEach(() => {
  vi.useFakeTimers();
  resetRunningJobsForTests();
  reads = [];
  readCount = 0;
  job = createStatusJob<St>({
    id: ID,
    read: async () => {
      readCount += 1;
      return reads.length > 1 ? reads.shift()! : reads[0] ?? null;
    },
    isRunning: (st) => st.phase === "running",
    face,
    result: (st) => (st.phase === "done" ? { tone: "ok", title: "Work finished", sentence: "Done." } : st.phase === "failed" ? { tone: "bad", title: "Work failed", sentence: "It broke." } : undefined),
    cancel: async () => ({}),
  });
});
afterEach(() => {
  job.reset();
  vi.useRealTimers();
});

describe("the press and the first answers", () => {
  it("the card is there at once, with the starting words", () => {
    job.begin();
    expect(runningJob(ID)?.face.line1).toBe("Starting");
  });

  it("an answer that says nothing is running, read before the back end took the run, does not take the card away", () => {
    job.begin();
    job.note({ phase: "idle" });
    job.note({ phase: "done" });
    expect(runningJob(ID)).not.toBeNull();
  });

  it("once the back end has taken the run, an answer that says it is over ends the card", () => {
    job.begin();
    job.accepted();
    job.note({ phase: "done" });
    expect(runningJob(ID)).toBeNull();
  });

  it("a running answer keeps the card with the answer's words, and ends the hold on its own", () => {
    job.begin();
    job.note({ phase: "running", label: "Downloading" });
    expect(runningJob(ID)?.face.line1).toBe("Downloading");
    job.note({ phase: "failed" });
    expect(runningJob(ID)).toBeNull();
  });

  it("a refused start takes the card away without a word on the bar", () => {
    job.begin();
    job.refused();
    expect(runningJob(ID)).toBeNull();
    expect(barView()).toMatchObject({ job: null, result: null });
  });

  it("a screen rebuilt mid-run gets the card at once, and what a running status said is kept for it", () => {
    job.resume();
    expect(runningJob(ID)).not.toBeNull();
    job.note({ phase: "running", label: "Downloading" });
    expect(job.lastRunning()).toEqual({ phase: "running", label: "Downloading" });
    job.note({ phase: "done" });
    expect(job.lastRunning()).toBeNull();
  });
});

describe("the follower: the job reads the status itself while no screen of its own does", () => {
  it("reads every 1.5 seconds, ends the job when the run ends, and says how it ended on the bar", async () => {
    reads = [{ phase: "running", label: "Downloading" }, { phase: "done" }];
    job.begin();
    job.accepted();
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    expect(readCount).toBe(1);
    expect(runningJob(ID)?.face.line1).toBe("Downloading");
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    expect(runningJob(ID)).toBeNull();
    expect(barView().result).toMatchObject({ title: "Work finished", sentence: "Done." });
    const after = readCount;
    await act(async () => void (await vi.advanceTimersByTimeAsync(6000)));
    expect(readCount).toBe(after);
  });

  it("does not read while a screen of the job's own is on screen, and starts again when it goes", async () => {
    reads = [{ phase: "running" }];
    const screen = renderHook(() => job.useReader());
    job.begin();
    job.accepted();
    await act(async () => void (await vi.advanceTimersByTimeAsync(4600)));
    expect(readCount).toBe(0);
    screen.unmount();
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    expect(readCount).toBe(1);
  });

  it("a screen whose own reading has stopped hands the reading back to the job", async () => {
    reads = [{ phase: "running" }];
    let reading = true;
    const screen = renderHook(() => job.useReader(reading));
    job.begin();
    job.accepted();
    await act(async () => void (await vi.advanceTimersByTimeAsync(3100)));
    expect(readCount).toBe(0);
    reading = false;
    screen.rerender();
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    expect(readCount).toBe(1);
    reading = true;
    screen.rerender();
    await act(async () => void (await vi.advanceTimersByTimeAsync(3100)));
    expect(readCount).toBe(1);
  });

  it("a read that fails is not the end of the run: the job stays and the next read tries again", async () => {
    let calls = 0;
    const flaky = createStatusJob<St>({
      id: "flaky",
      read: async () => {
        calls += 1;
        if (calls === 1) throw new Error("no answer");
        return { phase: "done" };
      },
      isRunning: (st) => st.phase === "running",
      face,
      result: () => undefined,
      cancel: async () => ({}),
    });
    flaky.begin();
    flaky.accepted();
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    expect(runningJob("flaky")).not.toBeNull();
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    expect(runningJob("flaky")).toBeNull();
    flaky.reset();
  });
});
