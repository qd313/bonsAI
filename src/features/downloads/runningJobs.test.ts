/**
 * Title: The running-jobs memory: a job's card words, its start time, and the half-second guard on Cancel
 *
 * Purpose: Pin runningJobs.ts (plan 105, lane D4): a job published twice keeps the time it started; a Cancel in the
 * first half second after the start is ignored (a double press on Update cannot start and cancel at once, the plan's
 * small question 4); a later Cancel is sent once and marks the job as stopping; ending a job forgets it.
 *
 * Does not: draw the card (JobCard.test.tsx) or read a run's status (ollamaSetupJob.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cancelJob, DOUBLE_PRESS_GUARD_MS, endJob, publishJob, resetRunningJobsForTests, runningJob, type JobFace } from "./runningJobs";

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
