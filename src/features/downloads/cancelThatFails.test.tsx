/**
 * Title: A Cancel that does not land: the card puts the button back and says so
 *
 * Purpose: Plan 106, lane R2 (review item 5). If the Cancel request itself is refused or never answered, the job card
 * used to say "Stopping" for good while the job ran on, and pressing Cancel again did nothing. Read on the card and
 * the bar the way a person sees them: a refused request puts Cancel back with "Could not stop. Try again."; a request
 * that never answers does the same once its time limit (10 seconds) is up; the next press sends a new request; an
 * answer that comes late, after the job ended or after a newer press, changes nothing; a Cancel that works still
 * reads "Stopping".
 *
 * Does not: read a real run's status (OllamaWhereAiRunsSection.jobCard.test.tsx and FirstRunSetupCard.test.tsx do).
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { JobCard } from "./JobCard";
import {
  CANCEL_TIMEOUT_MS,
  cancelJob,
  COULD_NOT_STOP,
  endJob,
  publishJob,
  resetRunningJobsForTests,
  runningJob,
  useRunningJob,
  type JobFace,
} from "./runningJobs";

const FACE: JobFace = {
  title: "Updating AI & models",
  stoppingTitle: "Stopping the update",
  line1: "Downloading model 1 of 2",
  line2: "1.3 GB of 3.2 GB",
  sites: "From ollama.com and registry.ollama.ai",
  fraction: 0.2,
};
const STARTED = Date.now() - 5000;

function Card(): React.ReactElement | null {
  const job = useRunningJob("a");
  return job ? <JobCard job={job} cancelLabel="Cancel the job" cancelNavRef={{ current: null }} onMoveUp={() => true} onMoveDown={() => true} /> : null;
}
const press = () => act(async () => void fireEvent.click(screen.getByLabelText("Cancel the job")));
const cancelText = () => screen.getByLabelText("Cancel the job").textContent;
const settle = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  resetRunningJobsForTests();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("a Cancel request that fails or never answers", () => {
  it("a refused request puts Cancel back with the words, and the next press sends a new request", async () => {
    // The first request is refused; the second is out and waiting.
    const cancel = vi.fn<() => Promise<unknown>>().mockRejectedValueOnce(new Error("RPC failed")).mockReturnValue(new Promise(() => {}));
    publishJob("a", FACE, cancel, STARTED);
    render(<Card />);
    await press();
    await settle();
    expect(screen.getByText(COULD_NOT_STOP)).toBeTruthy();
    expect(screen.queryByText("Stopping the update")).toBeNull();
    expect(cancelText()).toBe("CancelX");
    expect(runningJob("a")).toMatchObject({ stopping: false, stopFailed: true });
    await press();
    expect(cancel).toHaveBeenCalledTimes(2);
    // While the second request is out the card is stopping again, and the failure words are gone.
    expect(screen.getByText("Stopping the update")).toBeTruthy();
    expect(screen.queryByText(COULD_NOT_STOP)).toBeNull();
  });

  it("a request that never answers does the same once the time limit is up, not before", async () => {
    const cancel = vi.fn(() => new Promise<never>(() => {}));
    publishJob("a", FACE, cancel, STARTED);
    render(<Card />);
    await press();
    expect(cancelText()).toBe("Stopping");
    await act(async () => void (await vi.advanceTimersByTimeAsync(CANCEL_TIMEOUT_MS - 100)));
    expect(cancelText()).toBe("Stopping");
    await act(async () => void (await vi.advanceTimersByTimeAsync(200)));
    expect(screen.getByText(COULD_NOT_STOP)).toBeTruthy();
    expect(cancelText()).toBe("CancelX");
    await press();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it("a Cancel that works stays on Stopping and never shows the failure words", async () => {
    const cancel = vi.fn(() => Promise.resolve({ cancel_requested: true }));
    publishJob("a", FACE, cancel, STARTED);
    render(<Card />);
    await press();
    await act(async () => void (await vi.advanceTimersByTimeAsync(CANCEL_TIMEOUT_MS + 1000)));
    expect(cancelText()).toBe("Stopping");
    expect(screen.queryByText(COULD_NOT_STOP)).toBeNull();
  });

  it("a status poll that republishes the job keeps the failure words until the next press", async () => {
    publishJob("a", FACE, () => Promise.reject(new Error("RPC failed")), STARTED);
    render(<Card />);
    await press();
    await settle();
    act(() => publishJob("a", { ...FACE, line1: "Downloading model 2 of 2" }, () => Promise.reject(new Error("RPC failed"))));
    expect(screen.getByText(COULD_NOT_STOP)).toBeTruthy();
    expect(screen.getByText("Downloading model 2 of 2")).toBeTruthy();
  });

  it("a failure that arrives after the job ended does not bring the job back", async () => {
    let fail: (e: Error) => void = () => {};
    publishJob("a", FACE, () => new Promise<never>((_, reject) => (fail = reject)), STARTED);
    expect(cancelJob("a")).toBe(true);
    endJob("a");
    fail(new Error("late"));
    await vi.advanceTimersByTimeAsync(CANCEL_TIMEOUT_MS + 1000);
    expect(runningJob("a")).toBeNull();
  });

  it("an answer to an older press cannot undo a newer one", async () => {
    const failures: Array<(e: Error) => void> = [];
    publishJob("a", FACE, () => new Promise<never>((_, reject) => failures.push(reject)), STARTED);
    expect(cancelJob("a")).toBe(true);
    await vi.advanceTimersByTimeAsync(CANCEL_TIMEOUT_MS + 10);
    expect(runningJob("a")).toMatchObject({ stopping: false, stopFailed: true });
    expect(cancelJob("a")).toBe(true);
    failures[0]!(new Error("the first press answers late"));
    await vi.advanceTimersByTimeAsync(0);
    expect(runningJob("a")).toMatchObject({ stopping: true, stopFailed: false });
  });
});
