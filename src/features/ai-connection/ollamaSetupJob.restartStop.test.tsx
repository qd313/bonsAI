/**
 * Title: A Cancel during the AI server's restart says why it waits
 *
 * Purpose: After an update has swapped Ollama's program, the back end restarts the AI server, and that one step cannot be
 * stopped half way (it would leave the Deck with no AI running): a Cancel pressed then is honoured as soon as the restart
 * is done. Read on the job card as a person sees it: during the restart the stopping title reads "Stopping after the
 * restart"; in any other step it still reads "Stopping the update" (or the install's, or the setup's own words).
 *
 * Does not: run the restart (the back end does) or pin the rest of the card (OllamaWhereAiRunsSection.jobCard.test.tsx).
 */
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});
vi.mock("../../shared/deckyCall", async (orig) => ({
  ...(await orig<typeof import("../../shared/deckyCall")>()),
  callDeckyWithTimeout: vi.fn(() => new Promise(() => {})),
}));

import { JobCard } from "../downloads/JobCard";
import { cancelJob, resetRunningJobsForTests, useRunningJob } from "../downloads/runningJobs";
import { noteOllamaSetupStatus, OLLAMA_SETUP_JOB, resetOllamaSetupJobForTests } from "./ollamaSetupJob";

const run = (stage: string, profile = "update_installed") => ({ phase: "running", stage, profile, done: false, accepted: true }) as never;

function Card(): React.ReactElement | null {
  const job = useRunningJob(OLLAMA_SETUP_JOB);
  return job ? <JobCard job={job} cancelLabel="Cancel the job" cancelNavRef={{ current: null }} onMoveUp={() => true} onMoveDown={() => true} /> : null;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  resetRunningJobsForTests();
  resetOllamaSetupJobForTests();
});
afterEach(() => {
  resetOllamaSetupJobForTests();
  vi.useRealTimers();
});

describe("the stopping title of an AI update", () => {
  it("during the restart a Cancel reads Stopping after the restart", () => {
    render(<Card />);
    act(() => noteOllamaSetupStatus(run("restart"), true));
    act(() => void cancelJob(OLLAMA_SETUP_JOB, Date.now() + 1000));
    expect(screen.getByText("Stopping after the restart")).toBeTruthy();
    expect(screen.queryByText("Stopping the update")).toBeNull();
  });

  it("the words follow the step: a Cancel pressed before the restart changes to them when the restart begins", () => {
    render(<Card />);
    act(() => noteOllamaSetupStatus(run("install"), true));
    act(() => void cancelJob(OLLAMA_SETUP_JOB, Date.now() + 1000));
    expect(screen.getByText("Stopping the update")).toBeTruthy();
    act(() => noteOllamaSetupStatus(run("restart")));
    expect(screen.getByText("Stopping after the restart")).toBeTruthy();
  });

  it("in a download step it still reads Stopping the update, and the install and setup keep their own words", () => {
    render(<Card />);
    act(() => noteOllamaSetupStatus(run("pull"), true));
    act(() => void cancelJob(OLLAMA_SETUP_JOB, Date.now() + 1000));
    expect(screen.getByText("Stopping the update")).toBeTruthy();
  });

  it("a first install's restart reads the same words", () => {
    render(<Card />);
    act(() => noteOllamaSetupStatus(run("restart", "install"), false));
    act(() => void cancelJob(OLLAMA_SETUP_JOB, Date.now() + 1000));
    expect(screen.getByText("Stopping after the restart")).toBeTruthy();
  });
});
