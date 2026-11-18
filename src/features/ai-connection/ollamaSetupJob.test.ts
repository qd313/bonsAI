/**
 * Title: The Ollama setup run as a job card: its plain words, its share done, and the job outliving the tab
 *
 * Purpose: Pin ollamaSetupJob.ts (plan 105, lane D4): each step of a run reads in plain words on the card (never the
 * installer's raw line), a download step names the model and how far and how fast, the share done follows the
 * downloads, the starter run names every site it reaches (fewer when Voice input's downloads were left out), and the
 * job ends when the run ends even with no Ollama tab on screen to read its status.
 *
 * Does not: draw the card (JobCard.test.tsx) or press anything (OllamaWhereAiRunsSection.jobCard.test.tsx).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { noteOllamaSetupStatus, OLLAMA_SETUP_JOB, ollamaSetupFace, resetOllamaSetupJobForTests } from "./ollamaSetupJob";
import { runningJob } from "../downloads/runningJobs";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import type { LocalOllamaSetupStatus } from "./OllamaWhereAiRunsSection.types";

const PULL: LocalOllamaSetupStatus = {
  phase: "running",
  stage: "pull",
  profile: "update_installed",
  pull_step: 1,
  total_pull_steps: 2,
  current_tag: "a:1",
  progress_text: "Downloading 6e4c38e1172f: 43% 1.3 GB/3.2 GB 25 MB/s 1m10s",
};

beforeEach(() => {
  resetFakeDeckyRpc();
  resetOllamaSetupJobForTests();
});
afterEach(() => vi.useRealTimers());

describe("what the card says", () => {
  it("a step with no percentage: plain words and moving stripes", () => {
    const face = ollamaSetupFace({ phase: "running", stage: "check", profile: "update_installed" }, "update");
    expect(face).toMatchObject({ title: "Updating AI & models", stoppingTitle: "Stopping the update", line1: "Checking what is installed", fraction: null });
    expect(face.sites).toBe("From ollama.com, github.com and ollama.ai");
  });

  it("a download: which model, then how far and how fast, never the raw installer line", () => {
    const face = ollamaSetupFace(PULL, "update");
    expect(face.line1).toBe("Downloading model 1 of 2 · a:1");
    expect(face.line2).toBe("1.3 GB of 3.2 GB · 25 MB/s · about 1m10s left");
    expect(face.fraction).toBeCloseTo(0.215, 3);
    expect(JSON.stringify(face)).not.toContain("6e4c38e1172f");
  });

  it("the starter run names every site, fewer once Voice input's downloads were left out", () => {
    const st = { ...PULL, profile: "tier1_essentials", starter_pieces: { ollama: "done", answer: "waiting", note_search: "waiting", speech: "waiting", voice: "waiting" } };
    expect(ollamaSetupFace(st, "setup").title).toBe("Setting up the AI");
    expect(ollamaSetupFace(st, "setup").sites).toBe("From ollama.com, github.com and 4 more");
    const lean = { ...st, starter_pieces: { ...st.starter_pieces, speech: "left_out", voice: "left_out" } };
    expect(ollamaSetupFace(lean, "setup").sites).toBe("From ollama.com, github.com and ollama.ai");
  });
});

describe("the job", () => {
  it("a running status publishes it, called Installing when Ollama did not answer before the press; an end ends it", () => {
    noteOllamaSetupStatus({ phase: "running", stage: "install", profile: "update_installed" }, false);
    expect(runningJob(OLLAMA_SETUP_JOB)?.face.title).toBe("Installing Ollama");
    noteOllamaSetupStatus({ phase: "cancelled", stage: "", profile: "update_installed", error: "Cancelled." });
    expect(runningJob(OLLAMA_SETUP_JOB)).toBeNull();
  });

  it("with no Ollama tab reading the run, it reads the status itself and ends when the run ends", async () => {
    vi.useFakeTimers();
    let status: LocalOllamaSetupStatus = PULL;
    setRpcHandler("get_local_ollama_setup_status", () => status);
    noteOllamaSetupStatus(PULL, true);
    await vi.advanceTimersByTimeAsync(1600);
    expect(getRpcCallLog().filter((c) => c.method === "get_local_ollama_setup_status")).toHaveLength(1);
    expect(runningJob(OLLAMA_SETUP_JOB)).not.toBeNull();
    status = { phase: "done", stage: "complete", profile: "update_installed", result_line: "Updated." };
    await vi.advanceTimersByTimeAsync(1600);
    expect(runningJob(OLLAMA_SETUP_JOB)).toBeNull();
    await vi.advanceTimersByTimeAsync(5000);
    expect(getRpcCallLog().filter((c) => c.method === "get_local_ollama_setup_status")).toHaveLength(2);
  });
});
