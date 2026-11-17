/**
 * Title: The running-jobs memory: a job's card words, its start time, and the half-second guard on Cancel
 *
 * Purpose: Pin runningJobs.ts (plan 105, lane D4): a job published twice keeps the time it started; a Cancel in the
 * first half second after the start is ignored (a double press on Update cannot start and cancel at once, the plan's
 * small question 4); a later Cancel is sent once and marks the job as stopping; ending a job forgets it. The bar's
 * view: a job wants the bar only while its card is out of sight; with two, the newest first and "2 jobs" switching;
 * a job ending out of sight leaves its result on the bar for four seconds, a failure until its card is seen; X
 * cancels the job the bar shows, else the newest.
 *
 * Does not: draw the card (JobCard.test.tsx) or read a run's status (ollamaSetupJob.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  barView,
  cancelJob,
  cancelJobFromX,
  DOUBLE_PRESS_GUARD_MS,
  endJob,
  noteJobCardSeen,
  publishJob,
  resetRunningJobsForTests,
  runningJob,
  switchBarJob,
  type JobFace,
} from "./runningJobs";

const FACE: JobFace = {
  title: "Updating AI & models",
  stoppingTitle: "Stopping the update",
  line1: "Checking what is installed",
  line2: "Keep the Deck awake and online until this finishes.",
  sites: "From ollama.com and registry.ollama.ai",
  fraction: null,
};

beforeEach(() => resetRunningJobsForTests());

describe("running jobs", () => {
  it("keeps the time a job started when its words change", () => {
    publishJob("a", FACE, () => {}, 1000);
    publishJob("a", { ...FACE, line1: "Restarting Ollama" }, () => {}, 4000);
    expect(runningJob("a")).toMatchObject({ startedAt: 1000, stopping: false, face: { line1: "Restarting Ollama" } });
  });

  it("ignores a Cancel within half a second of the start, then sends one and only one", () => {
    const cancel = vi.fn();
    publishJob("a", FACE, cancel, 1000);
    expect(cancelJob("a", 1000 + DOUBLE_PRESS_GUARD_MS - 1)).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
    expect(runningJob("a")?.stopping).toBe(false);
    expect(cancelJob("a", 1000 + DOUBLE_PRESS_GUARD_MS)).toBe(true);
    expect(cancelJob("a", 5000)).toBe(false);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(runningJob("a")?.stopping).toBe(true);
  });

  it("forgets a job once it ends; a Cancel then does nothing", () => {
    const cancel = vi.fn();
    publishJob("a", FACE, cancel, 1000);
    endJob("a");
    expect(runningJob("a")).toBeNull();
    expect(cancelJob("a", 9000)).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("the bar's view", () => {
  it("a job wants the bar only while its card is out of sight", () => {
    publishJob("a", FACE, () => {}, 1000);
    expect(barView(2000).job?.id).toBe("a");
    noteJobCardSeen("a", true);
    expect(barView(2000)).toMatchObject({ job: null, result: null });
    noteJobCardSeen("a", false);
    expect(barView(2000).job?.id).toBe("a");
  });

  it("two jobs out of sight: the newest, a count of 2, and the switch to the other and back", () => {
    publishJob("old", FACE, () => {}, 1000);
    publishJob("new", { ...FACE, title: "Updating the library" }, () => {}, 2000);
    expect(barView(3000)).toMatchObject({ job: { id: "new" }, count: 2 });
    switchBarJob();
    expect(barView(3000).job?.id).toBe("old");
    switchBarJob();
    expect(barView(3000).job?.id).toBe("new");
  });

  it("a job ending out of sight leaves its result for four seconds; a failure stays until its card is seen", () => {
    publishJob("a", FACE, () => {}, 1000);
    endJob("a", { tone: "ok", title: "Update finished", sentence: "Updated." }, 10_000);
    expect(barView(12_000).result).toMatchObject({ id: "a", title: "Update finished" });
    expect(barView(14_100).result).toBeNull();
    publishJob("b", FACE, () => {}, 20_000);
    endJob("b", { tone: "bad", title: "Update failed", sentence: "No network." }, 21_000);
    expect(barView(99_000).result?.title).toBe("Update failed");
    noteJobCardSeen("b", true);
    expect(barView(99_000).result).toBeNull();
  });

  it("a job ending with its card in sight leaves nothing on the bar", () => {
    publishJob("a", FACE, () => {}, 1000);
    noteJobCardSeen("a", true);
    endJob("a", { tone: "ok", title: "Update finished", sentence: "Updated." }, 2000);
    expect(barView(2500)).toMatchObject({ job: null, result: null });
  });

  it("X cancels the job the bar shows, else the newest; with none running it is left alone", () => {
    const a = vi.fn();
    const b = vi.fn();
    publishJob("a", FACE, a, 1000);
    publishJob("b", FACE, b, 2000);
    noteJobCardSeen("b", true);
    expect(cancelJobFromX(5000)).toBe(true);
    expect(a).toHaveBeenCalledTimes(1);
    noteJobCardSeen("a", true);
    expect(cancelJobFromX(5000)).toBe(true);
    expect(b).toHaveBeenCalledTimes(1);
    resetRunningJobsForTests();
    expect(cancelJobFromX(5000)).toBe(false);
  });
});

describe("two cards for one job", () => {
  it("while either is in sight the job keeps off the bar, whichever order the two come and go in", () => {
    publishJob("a", FACE, () => {}, 1000);
    noteJobCardSeen("a", true, "first-run-card");
    noteJobCardSeen("a", true);
    // The tab's card goes after the other came (a tab still sliding away): the other still holds the job off the bar.
    noteJobCardSeen("a", false);
    expect(barView(2000).job).toBeNull();
    noteJobCardSeen("a", false, "first-run-card");
    expect(barView(2000).job?.id).toBe("a");
  });
});
