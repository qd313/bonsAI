/**
 * Title: The library download and the voice install at the same time: one bar, the newest job, and a "2 jobs" chip
 *
 * Purpose: Plan 106 lane F3 (row P105-JOB-CARD-ELSEWHERE-01, "two jobs at once"). Both downloads running with their
 * cards out of sight (another tab): the bar is one bar showing the newest job with a "2 jobs" chip; A on the chip
 * switches to the other job and the chip stays; each job's Cancel on the bar stops its own download (the library's
 * through `cancel_rag_corpus_download`, the voice install's through `cancel_voice_install`) and no other; when one ends
 * the chip goes and the bar shows the other, and when the other ends too the bar says how it ended; X cancels the job
 * the bar shows.
 *
 * Does not: draw either tab; the sections' own tests do.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JobBar } from "./JobBar";
import { cancelJobFromX } from "./runningJobs";
import { beginKbLibraryJob, kbLibraryJobAccepted } from "../knowledge-library/knowledgeLibraryJob";
import { beginVoiceInstallJob, voiceInstallJobAccepted } from "../voice/voiceInstallJob";
import { ragCorpusStatusFixture, getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const MIB = 1024 * 1024;
const BAR = "[data-bonsai-job-bar]";
let kb: "running" | "done" = "running";
let voice: "running" | "done" = "running";

const bar = () => document.querySelector<HTMLElement>(BAR);
const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method).length;
const wait = (ms: number) => act(async () => new Promise<void>((r) => setTimeout(r, ms)));

beforeEach(() => {
  resetFakeDeckyRpc();
  kb = "running";
  voice = "running";
  setRpcHandler("get_rag_corpus_status", () =>
    kb === "running"
      ? ragCorpusStatusFixture({ installed: true, phase: "running", done: false, stage: "download", bytes_downloaded: 62 * MIB, bytes_total: 210 * MIB })
      : ragCorpusStatusFixture({ installed: true, phase: "done", done: true }),
  );
  setRpcHandler("get_voice_install_status", () =>
    voice === "running" ? { phase: "running", stage: "binary_build_start", done: false, model_id: "base.en" } : { phase: "done", stage: "model_ready", done: true, model_id: "base.en" },
  );
});
afterEach(() => cleanup());

/** Both downloads pressed (the library first, then the voice install), on a tab with neither card. */
async function startBoth() {
  beginKbLibraryJob(true);
  kbLibraryJobAccepted();
  await wait(5);
  beginVoiceInstallJob(false);
  voiceInstallJobAccepted();
  render(
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="search">
      <JobBar activeTab="search" />
    </div>,
  );
}

describe("both downloads at once", () => {
  it("one bar, the newest job (the voice install) and a \"2 jobs\" chip", async () => {
    await startBoth();
    expect(document.querySelectorAll(BAR)).toHaveLength(1);
    expect(bar()!.textContent).toContain("Voice engine install");
    expect(screen.getByLabelText("Show the other running job").textContent).toBe("2 jobs");
  });

  it("A on the chip switches to the library and the chip stays; again switches back", async () => {
    await startBoth();
    fireEvent.click(screen.getByLabelText("Show the other running job"));
    expect(bar()!.textContent).toContain("Updating the library");
    // The job reads its own status every 1.5 seconds with no section on screen; until then it has the starting words.
    await waitFor(() => expect(bar()!.textContent).toContain("30% · 62 of 210 MB"), { timeout: 4000 });
    expect(screen.getByLabelText("Show the other running job")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Show the other running job"));
    expect(bar()!.textContent).toContain("Voice engine install");
  });

  it("each Cancel on the bar stops its own download and no other", async () => {
    await startBoth();
    await wait(520);
    fireEvent.click(screen.getByLabelText("Cancel: Voice engine install"));
    await waitFor(() => expect(calls("cancel_voice_install")).toBe(1));
    expect(calls("cancel_rag_corpus_download")).toBe(0);
    fireEvent.click(screen.getByLabelText("Show the other running job"));
    // A press just after the shown job changes is held back for half a second (JobBar.shownJobChanges.test.tsx).
    await wait(520);
    fireEvent.click(screen.getByLabelText("Cancel: Updating the library"));
    await waitFor(() => expect(calls("cancel_rag_corpus_download")).toBe(1));
    expect(calls("cancel_voice_install")).toBe(1);
  });

  it("X cancels the job the bar shows, not the other", async () => {
    await startBoth();
    await wait(520);
    act(() => void cancelJobFromX());
    await waitFor(() => expect(calls("cancel_voice_install")).toBe(1));
    expect(calls("cancel_rag_corpus_download")).toBe(0);
  });

  it("one ends: the chip goes and the bar shows the other; the other ends: the bar says how it ended", async () => {
    await startBoth();
    voice = "done";
    await waitFor(() => expect(screen.queryByLabelText("Show the other running job")).toBeNull(), { timeout: 4000 });
    expect(bar()!.textContent).toContain("Updating the library");
    kb = "done";
    await waitFor(() => expect(bar()?.textContent).toContain("Library download finished"), { timeout: 4000 });
  });
});
