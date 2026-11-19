/**
 * Title: Stop on the first-time setup's card: the card shows "Stopped" within a second
 *
 * Purpose: Pin, at the level the Deck check reads, that a Stop on the first-time setup's card is followed by fast reads
 * of the run's status. The back end is faked as "running" until the Stop and "cancelled" straight after; the card says
 * "Stopped" within 400 ms of the press (not the 1.5 seconds of the routine read). A run that is not being stopped is read
 * at the routine pace, and the fast reads end with the run.
 *
 * Does not: pin what the stopped card says (FirstRunSetupCard.test.tsx does).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...fake, Focusable: SteamRingFocusable };
});

import { FirstRunSetupCardOrEmpty } from "./FirstRunSetupCard";
import { beginFirstRunSetup, resetFirstRunSetupForTests } from "./firstRunSetupStore";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";

const RUNNING = {
  phase: "running",
  stage: "pull",
  profile: "tier1_essentials",
  accepted: true,
  pull_step: 1,
  total_pull_steps: 2,
  current_tag: "gemma4:e2b-it-qat",
  progress_text: "Downloading 6e4c38e1172f: 50% 2.2 GB/4.3 GB",
  starter_pieces: { ollama: "done", answer: "waiting", note_search: "waiting", speech: "left_out", voice: "left_out" },
};
let status: Record<string, unknown> = RUNNING;

const reads = () => getRpcCallLog().filter((c) => c.method === "get_local_ollama_setup_status").length;
const card = () => document.querySelector("[data-bonsai-first-run-card]")?.textContent ?? "";
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
/** Moves the clock until the status has just been read, so the next routine read is a full 1.5 seconds away. */
async function justAfterARead() {
  const before = reads();
  while (reads() === before) await advance(50);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetFakeDeckyRpc();
  resetNavFocusRegistry();
  resetFirstRunSetupForTests();
  status = RUNNING;
  setRpcHandler("get_local_ollama_setup_status", () => status);
  // The back end stops the run at once: the next status read says so.
  setRpcHandler("cancel_local_ollama_setup", () => {
    status = { ...RUNNING, phase: "cancelled", stage: "cancelled" };
    return { cancel_requested: true };
  });
});
afterEach(() => {
  act(() => resetFirstRunSetupForTests());
  cleanup();
  vi.useRealTimers();
});

async function start() {
  render(<FirstRunSetupCardOrEmpty>{null}</FirstRunSetupCardOrEmpty>);
  act(() => beginFirstRunSetup(["voice"]));
  await waitFor(() => expect(card()).toContain("Setting up the AI on this Deck"));
  await advance(600);
}

describe("Stop on the first-time setup's card shows its result within a second", () => {
  it("the card says Stopped within 400 ms of the press", async () => {
    await start();
    await justAfterARead();
    fireEvent.click(screen.getByLabelText("Stop the setup"));
    expect(card()).toContain("Setting up the AI on this Deck");
    await advance(400);
    expect(card()).toContain("Stopped");
    expect(screen.getByLabelText("Start the setup again")).toBeTruthy();
  });

  it("no fast reading goes on after the run ended", async () => {
    await start();
    fireEvent.click(screen.getByLabelText("Stop the setup"));
    await advance(400);
    expect(card()).toContain("Stopped");
    const after = reads();
    await advance(3100);
    expect(reads() - after).toBeLessThanOrEqual(3);
  });

  it("a run nobody is stopping is read at the routine pace", async () => {
    await start();
    await justAfterARead();
    const before = reads();
    await advance(3100);
    expect(reads() - before).toBeLessThanOrEqual(3);
  });
});
