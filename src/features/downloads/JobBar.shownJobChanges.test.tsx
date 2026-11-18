/**
 * Title: The bar's Cancel ignores a press just after the job the bar shows changes
 *
 * Purpose: Plan 106 lane F3, the second opinion's second change. With two jobs out of sight the bar shows the newest.
 * A person with the ring on its Cancel, aiming at that job, can have it end a moment before the press: the bar then
 * shows the other job, the ring stays on the same button, and the press would stop a download they never chose. A press
 * on the bar's Cancel within half a second of the shown job changing does nothing (the same half second as the guard at
 * the start of a job); after that it cancels the job now shown, and only that one. A press with nothing changing is not
 * held up. X from anywhere is left as it was.
 *
 * Does not: move the ring (JobBar.chipHandOver.test.tsx does); the Deck row reads the ring.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { JobBar } from "./JobBar";
import { cancelJobFromX, endJob, publishJob, resetRunningJobsForTests, runningJob, type JobFace } from "./runningJobs";
import { putSteamRingOn } from "../../test-harness/steamRing";

const face = (title: string): JobFace => ({ title, stoppingTitle: `Stopping ${title}`, line1: "Working", line2: "", sites: "From example.com", fraction: 0.3 });
const older = vi.fn(() => Promise.resolve({}));
const newer = vi.fn(() => Promise.resolve({}));
const wait = (ms: number) => act(async () => new Promise<void>((r) => setTimeout(r, ms)));
const cancelOn = (title: string) => screen.getByLabelText(`Cancel: ${title}`);

beforeEach(() => {
  resetRunningJobsForTests();
  older.mockClear();
  newer.mockClear();
  // Both jobs are old enough to be past their own start guard.
  publishJob("older", face("Updating the library"), older, Date.now() - 5000);
  publishJob("newer", face("Voice engine install"), newer, Date.now() - 2000);
});
afterEach(() => cleanup());

describe("a Cancel press on the bar just after the shown job changes", () => {
  it("two jobs, ring on Cancel, the shown one ends: a press within half a second does nothing; after it, it cancels the other", async () => {
    render(
      <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="settings">
        <JobBar activeTab="settings" />
      </div>,
    );
    await wait(520);
    act(() => putSteamRingOn(cancelOn("Voice engine install")));
    act(() => endJob("newer"));
    // The ring is still on the same button; it now means the library download.
    fireEvent.click(cancelOn("Updating the library"));
    expect(older).not.toHaveBeenCalled();
    expect(newer).not.toHaveBeenCalled();
    expect(runningJob("older")!.stopping).toBe(false);
    await wait(520);
    fireEvent.click(cancelOn("Updating the library"));
    expect(older).toHaveBeenCalledTimes(1);
    expect(newer).not.toHaveBeenCalled();
  });

  it("a press with nothing changing is not held up, and a switch with the chip holds a press for half a second too", async () => {
    render(
      <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="settings">
        <JobBar activeTab="settings" />
      </div>,
    );
    await wait(520);
    fireEvent.click(screen.getByLabelText("Show the other running job"));
    fireEvent.click(cancelOn("Updating the library"));
    expect(older).not.toHaveBeenCalled();
    await wait(520);
    fireEvent.click(cancelOn("Updating the library"));
    expect(older).toHaveBeenCalledTimes(1);
  });

  it("a press right after the first press of a quiet bar still works (nothing changed)", async () => {
    render(
      <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="settings">
        <JobBar activeTab="settings" />
      </div>,
    );
    await wait(520);
    fireEvent.click(cancelOn("Voice engine install"));
    expect(newer).toHaveBeenCalledTimes(1);
  });

  it("X from anywhere is left as it was: it is not held back by the bar's change guard", async () => {
    render(
      <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="settings">
        <JobBar activeTab="settings" />
      </div>,
    );
    await wait(520);
    act(() => endJob("newer"));
    act(() => void cancelJobFromX());
    expect(older).toHaveBeenCalledTimes(1);
  });
});
