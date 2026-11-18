/**
 * Title: The first-time setup's card on the empty chat, as a person sees it and presses it
 *
 * Purpose: Plan 105, lane D3 (board 5, tab 4: round 1 A's changing line and Stop on the chat). After OK on the
 * first-time setup popup, the empty chat shows the card instead of its picture. Read on the page, with the back end's
 * status faked: the changing line, the bar and the sites (only the ones the run reaches) while it runs; Stop sending
 * the cancel; after a Stop, what was kept and what was not installed, and Start again repeating the same left-out
 * list; at the end, "The AI is ready on this Deck" and the run's closing line with no button, and the ring handed to
 * the question box when the button goes from under it; a refused start saying why. The card's stop is reached by Up
 * from the suggestion chips and leaves by Steam's transfer.
 *
 * Does not: open a real Steam panel (Steam's ring is modelled, steamRing.tsx) or download anything.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...fake, Focusable: SteamRingFocusable };
});

import { FirstRunSetupCardOrEmpty } from "./FirstRunSetupCard";
import { beginFirstRunSetup, resetFirstRunSetupForTests } from "./firstRunSetupStore";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { registerNavFocus, resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { chipRowExitUp } from "../preset-carousel/presetRowFocusNav";
import { JobBar } from "../downloads/JobBar";
import { noteOllamaSetupStatus } from "../ai-connection/ollamaSetupJob";

const running = (extra: Record<string, unknown> = {}) => ({
  phase: "running",
  stage: "pull",
  profile: "tier1_essentials",
  accepted: true,
  pull_step: 1,
  total_pull_steps: 2,
  current_tag: "gemma4:e2b-it-qat",
  progress_text: "Downloading 6e4c38e1172f: 50% 2.2 GB/4.3 GB",
  starter_pieces: { ollama: "done", answer: "waiting", note_search: "waiting", speech: "left_out", voice: "left_out" },
  ...extra,
});

let status: Record<string, unknown> = running();
const calls = (method: string) => getRpcCallLog().filter((c) => c.method === method);
const card = () => document.querySelector("[data-bonsai-first-run-card]")?.textContent ?? "";
const bar = () => (document.querySelector("[data-bonsai-first-run-card] i") as HTMLElement | null)?.style.width;
const nextPoll = () => act(async () => void (await vi.advanceTimersByTimeAsync(1600)));

function holder(name: string) {
  const h = { current: { TakeFocus: vi.fn(() => true) } };
  registerNavFocus(name as never, h as never);
  return h.current.TakeFocus;
}

async function start(leaveOut: Parameters<typeof beginFirstRunSetup>[0] = ["voice"]) {
  render(
    <FirstRunSetupCardOrEmpty>
      <div>Ask anything — this slot keeps its own history.</div>
    </FirstRunSetupCardOrEmpty>,
  );
  act(() => beginFirstRunSetup(leaveOut));
  await waitFor(() => expect(card()).toContain("Pull 1/2 — gemma4:e2b-it-qat"));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetFakeDeckyRpc();
  resetNavFocusRegistry();
  resetFirstRunSetupForTests();
  status = running();
  setRpcHandler("get_local_ollama_setup_status", () => status);
});

afterEach(() => {
  act(() => resetFirstRunSetupForTests());
  vi.useRealTimers();
});

describe("the first-time setup's card", () => {
  it("is not there until the first-time setup starts: the empty chat shows as before", () => {
    render(
      <FirstRunSetupCardOrEmpty>
        <div>Ask anything — this slot keeps its own history.</div>
      </FirstRunSetupCardOrEmpty>,
    );
    expect(document.body.textContent).toContain("Ask anything");
    expect(document.querySelector("[data-bonsai-first-run-card]")).toBeNull();
  });

  it("while it runs: the changing line, the bar for the whole download, only the sites it reaches, and Stop", async () => {
    await start(["voice"]);
    expect(calls("start_local_ollama_setup").map((c) => c.args[0])).toEqual([{ profile: "tier1_essentials", leave_out: ["voice"] }]);
    expect(document.body.textContent).not.toContain("Ask anything");
    expect(card()).toContain("Setting up the AI on this Deck");
    expect(card()).toContain("Downloads come from ollama.com, github.com and registry.ollama.ai.");
    expect(card()).not.toContain("huggingface.co");
    // Ollama (1,510 MB) done and half of the answer model (4,336 MB) of 6,120 MB: about 60%.
    expect(bar()).toBe("60%");
    expect(screen.getByLabelText("Stop the setup")).toBeTruthy();
  });

  it("Stop sends the cancel; then the card says what was kept and what was not installed, and Start again repeats the same run", async () => {
    await start(["voice"]);
    fireEvent.click(screen.getByLabelText("Stop the setup"));
    expect(calls("cancel_local_ollama_setup")).toHaveLength(1);
    status = running({ phase: "cancelled", stage: "cancelled", starter_pieces: { ollama: "done", answer: "done", note_search: "waiting", speech: "left_out", voice: "left_out" } });
    await nextPoll();
    expect(card()).toContain("Stopped");
    expect(card()).toContain("Stopped. Kept: Ollama and the answer model. Not installed: the note-search model.");
    expect(card()).toContain("Start again carries on: what finished is not downloaded twice.");
    status = running();
    fireEvent.click(screen.getByLabelText("Start the setup again"));
    await waitFor(() => expect(calls("start_local_ollama_setup")).toHaveLength(2));
    expect(calls("start_local_ollama_setup")[1]!.args[0]).toEqual({ profile: "tier1_essentials", leave_out: ["voice"] });
    await waitFor(() => expect(screen.getByLabelText("Stop the setup")).toBeTruthy());
  });

  it("a Stop the back end refuses says it could not stop, and the next Stop sends a new request (plan 106 R2)", async () => {
    await start(["voice"]);
    let refuse = true;
    setRpcHandler("cancel_local_ollama_setup", () => {
      if (refuse) throw new Error("The back end did not take the cancel");
      return { cancel_requested: true };
    });
    fireEvent.click(screen.getByLabelText("Stop the setup"));
    await waitFor(() => expect(card()).toContain("Could not stop. Try again."));
    expect(calls("cancel_local_ollama_setup")).toHaveLength(1);
    expect(screen.getByLabelText("Stop the setup")).toBeTruthy();
    refuse = false;
    fireEvent.click(screen.getByLabelText("Stop the setup"));
    expect(calls("cancel_local_ollama_setup")).toHaveLength(2);
    await waitFor(() => expect(card()).not.toContain("Could not stop. Try again."));
  });

  it("a Stop that never answers says the same after its 8 seconds, and Stop sends again", async () => {
    await start(["voice"]);
    setRpcHandler("cancel_local_ollama_setup", () => new Promise(() => {}));
    fireEvent.click(screen.getByLabelText("Stop the setup"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(7000)));
    expect(card()).not.toContain("Could not stop");
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    expect(card()).toContain("Could not stop. Try again.");
    fireEvent.click(screen.getByLabelText("Stop the setup"));
    expect(calls("cancel_local_ollama_setup")).toHaveLength(2);
  });

  it("at the end: The AI is ready on this Deck and the run's closing line, no button, and the ring goes to the question box", async () => {
    const questionBox = holder("unified-input");
    await start(["voice"]);
    putSteamRingOn(screen.getByLabelText("Stop the setup"));
    status = { ...running(), phase: "done", stage: "complete", result_line: "Ollama 0.40.16 is ready. Downloaded gemma4:e2b-it-qat and nomic-embed-text. Left out, as you chose: the speech models and the voice engine." };
    await nextPoll();
    expect(card()).toContain("The AI is ready on this Deck");
    expect(card()).toContain("Left out, as you chose: the speech models and the voice engine.");
    expect(screen.queryByLabelText("Stop the setup")).toBeNull();
    await act(async () => void (await vi.advanceTimersByTimeAsync(200)));
    expect(questionBox).toHaveBeenCalled();
  });

  it("a start the back end refuses says why, with Start again", async () => {
    setRpcHandler("start_local_ollama_setup", () => ({ accepted: false, reason: "Setup already running." }));
    render(<FirstRunSetupCardOrEmpty>{null}</FirstRunSetupCardOrEmpty>);
    act(() => beginFirstRunSetup([]));
    await waitFor(() => expect(card()).toContain("Setup did not start"));
    expect(card()).toContain("Setup already running.");
    expect(screen.getByLabelText("Start the setup again")).toBeTruthy();
  });
});

describe("the card's stop on the D-pad", () => {
  it("Up from the suggestion chips lands on it; Up from it goes above the chat, Down back to the chips, Left and Right hold", async () => {
    const tabBar = holder("tab-bar");
    const chips = holder("preset-carousel");
    await start([]);
    act(() => void chipRowExitUp());
    expect(steamRingHolder()?.getAttribute("aria-label")).toBe("Stop the setup");
    const nav = (steamRingHolder()!.parentElement as SteamEl).__nav!;
    expect(nav.onMoveLeft!()).toBe(true);
    expect(nav.onMoveRight!()).toBe(true);
    expect(steamRingHolder()?.getAttribute("aria-label")).toBe("Stop the setup");
    expect(nav.onMoveUp!()).toBe(true);
    expect(tabBar).toHaveBeenCalledTimes(1);
    expect(nav.onMoveDown!()).toBe(true);
    expect(chips).toHaveBeenCalledTimes(1);
    expect(nav.onOKButton).toBeTypeOf("function");
  });
});

describe("the first-time setup's card and the download bar (plan 105, lane D4)", () => {
  it("while the card is up on Main the bar does not show the same run; once it goes, the bar does", async () => {
    // The run was seen on the Ollama tab (its card there is out of sight now), so it wants the bar.
    noteOllamaSetupStatus(running() as never, true);
    render(
      <div className="bonsai-decky-tabs-root" data-bonsai-active-tab="main">
        <FirstRunSetupCardOrEmpty>
          <div>Ask anything — this slot keeps its own history.</div>
        </FirstRunSetupCardOrEmpty>
        <JobBar />
      </div>,
    );
    const jobBar = () => document.querySelector("[data-bonsai-job-bar]");
    expect(jobBar()).not.toBeNull();
    act(() => beginFirstRunSetup(["voice"]));
    await waitFor(() => expect(card()).toContain("Pull 1/2 — gemma4:e2b-it-qat"));
    expect(jobBar()).toBeNull();
    act(() => resetFirstRunSetupForTests());
    expect(card()).toBe("");
    expect(jobBar()).not.toBeNull();
  });
});
