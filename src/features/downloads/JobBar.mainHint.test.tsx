/**
 * Title: The bar on the Main tab does not promise an X that does nothing there
 *
 * Purpose: Plan 106 lane F3 (the first card note from plan 105's second opinion). The bar's Cancel shows the X key's
 * glyph because X cancels the job from anywhere in a tab (TabBodyFocusRoot). The Main tab has no such container (its
 * first stop is already a registered stop, plan 30 W4), so there X does nothing, and the D-pad cannot reach the bar
 * either (the only way onto it is Down from a folded tab's Open all button). So on Main the bar says plain "Cancel";
 * on every other tab it keeps "Cancel X". A press on the bar's button works on both (a tap, or A on it).
 *
 * Does not: make X work on Main. That needs a container around the whole Main body, which changes Main's D-pad graph.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobBar } from "./JobBar";
import { publishJob, resetRunningJobsForTests } from "./runningJobs";

const cancel = vi.fn(() => Promise.resolve({}));
const BAR_CANCEL = "Cancel: Updating AI & models";
const key = () => screen.getByLabelText(BAR_CANCEL).querySelector(".bonsai-job-key");

beforeEach(() => {
  resetRunningJobsForTests();
  cancel.mockClear();
  publishJob(
    "ollama-setup",
    { title: "Updating AI & models", stoppingTitle: "Stopping the update", line1: "Working", line2: "", sites: "From ollama.com", fraction: 0.2 },
    cancel,
    Date.now() - 2000,
  );
});
afterEach(() => cleanup());

describe("the X glyph on the bar's Cancel", () => {
  it("is not drawn on the Main tab, where X does nothing", () => {
    render(<JobBar activeTab="main" />);
    expect(screen.getByLabelText(BAR_CANCEL).textContent).toBe("Cancel");
    expect(key()).toBeNull();
  });

  it("is drawn on every other tab, where X cancels the job", () => {
    for (const tab of ["ollama", "settings", "search", "permissions", "about"]) {
      const view = render(<JobBar activeTab={tab} />);
      expect(screen.getByLabelText(BAR_CANCEL).textContent, tab).toBe("CancelX");
      view.unmount();
    }
  });

  it("is drawn when the bar is not told which tab it is on (a test drawing it alone)", () => {
    render(<JobBar />);
    expect(key()).not.toBeNull();
  });

  it("on Main the bar's Cancel still works when pressed (after the half second the bar holds a press for when it appears)", async () => {
    render(<JobBar activeTab="main" />);
    await act(async () => new Promise<void>((r) => setTimeout(r, 520)));
    fireEvent.click(screen.getByLabelText(BAR_CANCEL));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
