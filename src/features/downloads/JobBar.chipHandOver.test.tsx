/**
 * Title: The "2 jobs" chip going away under the ring: the ring is never left on nothing
 *
 * Purpose: Plan 106 lane F3 (the second card note from plan 105's second opinion). With two jobs out of sight the bar
 * shows the newest with a "2 jobs" chip, and a person can walk onto the chip (Left from Cancel). When one of the two
 * ends, or its card comes back into sight, the chip leaves the page; the ring was on it, and Steam is left holding
 * nothing, so the next press starts from nowhere. Now the ring goes to the bar's Cancel; and if the bar goes with it
 * (both jobs ended), to where the ring came from, else the tab's first stop, else the tab bar. A ring somewhere else
 * is left alone.
 *
 * Does not: know Steam's real timing (the hand-over looks at once and again 150 ms later); the Deck row reads the ring.
 */
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { JobBar } from "./JobBar";
import { endJob, noteJobCardSeen, publishJob, resetRunningJobsForTests, type JobFace } from "./runningJobs";
import { registerNavFocus, resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";

const face = (title: string): JobFace => ({ title, stoppingTitle: `Stopping ${title}`, line1: "Working", line2: "", sites: "From example.com", fraction: 0.3 });
const CHIP = "Show the other running job";
const ringName = () => steamRingHolder()?.getAttribute("aria-label") ?? "(no ring)";
const flush = () => act(async () => new Promise<void>((r) => setTimeout(r, 200)));

function drawBar() {
  return render(
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="settings">
      <div data-tab-bar tabIndex={0} />
      <JobBar />
    </div>,
  );
}

beforeEach(() => {
  resetRunningJobsForTests();
  resetNavFocusRegistry();
  publishJob("older", face("Updating the library"), () => {}, Date.now() - 5000);
  publishJob("newer", face("Voice engine install"), () => {}, Date.now() - 2000);
});
afterEach(() => cleanup());

describe("the 2 jobs chip leaves under the ring", () => {
  it("one of the two jobs ends: the chip goes and the ring is on the bar's Cancel, not on nothing", async () => {
    drawBar();
    const chip = screen.getByLabelText(CHIP);
    act(() => putSteamRingOn(chip));
    expect(ringName()).toBe(CHIP);
    act(() => endJob("older"));
    await waitFor(() => expect(screen.queryByLabelText(CHIP)).toBeNull());
    await flush();
    expect(ringName()).toBe("Cancel: Voice engine install");
  });

  it("the card of one job comes back into sight: the chip goes and the ring is on Cancel", async () => {
    drawBar();
    act(() => putSteamRingOn(screen.getByLabelText(CHIP)));
    act(() => noteJobCardSeen("older", true));
    await waitFor(() => expect(screen.queryByLabelText(CHIP)).toBeNull());
    await flush();
    expect(ringName()).toBe("Cancel: Voice engine install");
  });

  it("both jobs end with the ring on the chip: the bar goes too and the ring goes to the tab bar", async () => {
    const tabBar = vi.fn(() => {
      putSteamRingOn(document.querySelector("[data-tab-bar]"));
    });
    drawBar();
    registerNavFocus("tab-bar", { current: { TakeFocus: tabBar } });
    act(() => putSteamRingOn(screen.getByLabelText(CHIP)));
    act(() => {
      endJob("older");
      endJob("newer");
    });
    await flush();
    expect(tabBar).toHaveBeenCalled();
  });

  it("a ring somewhere else is left where it is when the chip goes", async () => {
    drawBar();
    const outside = document.querySelector<SteamEl>("[data-tab-bar]")!;
    act(() => putSteamRingOn(outside));
    act(() => endJob("older"));
    await waitFor(() => expect(screen.queryByLabelText(CHIP)).toBeNull());
    await flush();
    expect(steamRingHolder()).toBe(outside);
  });
});
