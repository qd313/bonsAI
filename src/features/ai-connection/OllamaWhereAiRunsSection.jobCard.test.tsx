/**
 * Title: Update on the Ollama tab: the buttons give way to the job card, and the ring is on its Cancel at once
 *
 * Purpose: Pin plan 105 lane D4's row P105-OLLAMA-BUTTONS-01 at the level the Deck check reads, Steam's own ring
 * (the `gpfocus` marker the stand-in moves only on Steam's transfer): A on "Update AI & models" swaps Update and
 * Browse for one job card and the ring is on the card's Cancel on the same press; a second A in the first half second
 * cancels nothing (a double press cannot start and cancel at once); a later A cancels once and the card reads
 * "Stopping the update"; when the run ends the card goes and the ring is on Update, never on nothing; Browse models
 * has no dots. The connection line keeps one height and the ring through a check, and A on it waits while a run goes.
 *
 * Does not: know Steam's real timing; the Deck row reads the ring after each change.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _c, onChange: _o, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { setDownloadPermissionBridge } from "../downloads/downloadNotice";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { putSteamRingOn, steamRingHolder } from "../../test-harness/steamRing";

const UPDATE = "Update AI engine and installed models";
const BROWSE = "Browse and pull Ollama models";
const CANCEL = "Cancel local Ollama setup";
const LINE = "[data-bonsai-connection-line]";
const RUNNING = { phase: "running", stage: "install", profile: "update_installed", done: false, accepted: true };

let status: Record<string, unknown> = { phase: "idle", stage: "", profile: "", done: true };

function draw() {
  render(
    <OllamaWhereAiRunsSection
      ollamaIp="127.0.0.1"
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={true}
      setOllamaLocalOnDeck={() => {}}
      ollamaLocalAutostart={false}
      setOllamaLocalAutostart={() => {}}
      namedOllamaHosts={[]}
      setNamedOllamaHosts={() => {}}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
      onOpenOllamaModelsHub={() => {}}
      connectionTestBtnRef={{ current: null }}
    />,
  );
}

const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const ringName = () => steamRingHolder()?.getAttribute("aria-label") ?? "(no ring)";
const cancelCalls = () => getRpcCallLog().filter((c) => c.method === "cancel_local_ollama_setup").length;

/** A on Update with the ring on it, as Steam delivers it (the button's own onClick). */
async function pressUpdate() {
  await screen.findByText("Installed: 1");
  act(() => putSteamRingOn(byLabel(UPDATE)));
  await act(async () => void fireEvent.click(byLabel(UPDATE)!));
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  resetModalReturnFocusRegistry();
  resetNavFocusRegistry();
  setDownloadPermissionBridge(null);
  status = { phase: "idle", stage: "", profile: "", done: true };
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.40.2", models: ["a:1"] }));
  setRpcHandler("get_local_ollama_setup_status", () => status);
  setRpcHandler("start_local_ollama_setup", () => {
    status = RUNNING;
    return { accepted: true };
  });
  setRpcHandler("cancel_local_ollama_setup", () => ({ cancel_requested: true }));
  markSettingsLoaded();
});

describe("Update AI & models becomes one job card", () => {
  it("on the same press the buttons give way to the card and Steam's ring is on its Cancel", async () => {
    draw();
    await pressUpdate();
    await waitFor(() => expect(ringName()).toBe(CANCEL));
    expect(byLabel(UPDATE)).toBeNull();
    expect(byLabel(BROWSE)).toBeNull();
    expect(screen.getByText("Updating AI & models")).toBeTruthy();
  });

  it("a second A in the first half second cancels nothing; a later A cancels once and the card says it is stopping", async () => {
    draw();
    await pressUpdate();
    await waitFor(() => expect(ringName()).toBe(CANCEL));
    await act(async () => void fireEvent.click(byLabel(CANCEL)!));
    expect(cancelCalls()).toBe(0);
    await act(async () => new Promise((r) => setTimeout(r, 520)));
    await act(async () => void fireEvent.click(byLabel(CANCEL)!));
    await act(async () => void fireEvent.click(byLabel(CANCEL)!));
    expect(cancelCalls()).toBe(1);
    expect(screen.getByText("Stopping the update")).toBeTruthy();
  });

  it("a Cancel the back end refuses puts Cancel back with the words, and the next press sends a new request (plan 106 R2)", async () => {
    let refuse = true;
    setRpcHandler("cancel_local_ollama_setup", () => {
      if (refuse) throw new Error("The back end did not take the cancel");
      return { cancel_requested: true };
    });
    draw();
    await pressUpdate();
    await waitFor(() => expect(ringName()).toBe(CANCEL));
    await act(async () => new Promise((r) => setTimeout(r, 520)));
    await act(async () => void fireEvent.click(byLabel(CANCEL)!));
    await waitFor(() => expect(screen.getByText("Could not stop. Try again.")).toBeTruthy());
    expect(byLabel(CANCEL)!.textContent).toBe("CancelX");
    expect(cancelCalls()).toBe(1);
    refuse = false;
    await act(async () => void fireEvent.click(byLabel(CANCEL)!));
    expect(cancelCalls()).toBe(2);
    expect(screen.getByText("Stopping the update")).toBeTruthy();
  });

  it("when the run ends the card goes and the ring is on Update, never on nothing", async () => {
    draw();
    await pressUpdate();
    await waitFor(() => expect(ringName()).toBe(CANCEL));
    status = { phase: "cancelled", stage: "", profile: "update_installed", error: "Cancelled.", done: true };
    await waitFor(() => expect(byLabel(CANCEL)).toBeNull(), { timeout: 4000 });
    await waitFor(() => expect(ringName()).toBe(UPDATE));
    expect(screen.getByText("Cancelled.")).toBeTruthy();
  });

  it("Browse models has no dots, and the sites the downloads come from are named under the buttons", async () => {
    draw();
    await screen.findByText("Installed: 1");
    expect(byLabel(BROWSE)!.textContent).toBe("Browse models›");
    expect(byLabel(BROWSE)!.textContent).not.toContain("…");
    expect(screen.getByText("From ollama.com, github.com and registry.ollama.ai")).toBeTruthy();
  });
});

describe("the connection line", () => {
  it("keeps one height and the ring through a check: Checking the connection, then Connected to this Deck's AI", async () => {
    let answer: (v: unknown) => void = () => {};
    draw();
    await screen.findByText("Connected to this Deck's AI");
    const line = document.querySelector<HTMLElement>(LINE)!;
    expect(line.style.height).toBe("44px");
    setRpcHandler("test_ollama_connection", () => new Promise((r) => (answer = r)));
    act(() => putSteamRingOn(line));
    await act(async () => void fireEvent.click(line));
    expect(screen.getByText("Checking the connection")).toBeTruthy();
    expect(steamRingHolder()).toBe(line);
    expect(line.style.height).toBe("44px");
    expect(line.textContent).not.toContain("…");
    await act(async () => void answer({ reachable: false, error: "Connection refused" }));
    expect(screen.getByText("Not reachable: Test again")).toBeTruthy();
    expect(screen.getByText("Connection refused")).toBeTruthy();
    expect(steamRingHolder()).toBe(document.querySelector(LINE));
    expect(document.querySelector<HTMLElement>(LINE)!.style.height).toBe("44px");
  });

  it("A on it while a run goes starts no check: one could start the service under the installer", async () => {
    status = RUNNING;
    draw();
    await screen.findByLabelText(CANCEL);
    await screen.findByText("Connected to this Deck's AI");
    const before = getRpcCallLog().filter((c) => c.method === "test_ollama_connection").length;
    await act(async () => void fireEvent.click(document.querySelector<HTMLElement>(LINE)!));
    expect(getRpcCallLog().filter((c) => c.method === "test_ollama_connection")).toHaveLength(before);
  });
});
