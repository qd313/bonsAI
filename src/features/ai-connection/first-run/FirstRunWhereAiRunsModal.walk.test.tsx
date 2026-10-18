/**
 * Title: Walking the first-run popup with the D-pad
 *
 * Purpose: Draws the real popup with Steam's ring modelled and presses the D-pad the way Steam calls the
 * move handlers: the ring starts on Not now; Up and Down walk the column (Run AI switch, then the
 * Start-with-the-Deck switch or the PC address row, then the foot); Left and Right move between the two foot
 * buttons and between the address field and Find LAN; every stop answers all four directions (a press that
 * goes nowhere returns true, so Steam never steps on by itself); Up from the first switch holds; no stop is
 * visited twice on a walk and every button in the popup is a stop. The Deck row measures the real thing.
 *
 * Used for: FirstRunWhereAiRunsModal.tsx, useFirstRunPopupNav.ts (plan 96, N1; AGENTS.md "Adding a new control").
 *
 * Solves: a popup whose buttons are not reachable by D-pad, or whose walk revisits a stop or leaves the
 * popup, passes every other test and is dead on the Deck.
 *
 * Does not: Know Steam's spatial walk (this popup does not use it) or the Deck's real positions.
 */
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => (await import("./firstRunPopupTestKit")).deckyUiForFirstRunPopup());

import { FirstRunWhereAiRunsModal } from "./FirstRunWhereAiRunsModal";
import { popupHost, press, resetBoxes, ringName } from "./firstRunPopupTestKit";
import { resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { publishDeveloperTabShown, resetDeveloperTabSignalForTests } from "../../settings/developerTabSignal";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../../settings/settingsLoadedSignal";

const NOT_NOW = "Not now: set up the AI later on the Ollama tab";
const INSTALL = "Install Ollama on this Deck";
const TEST = "Test the connection to the PC";
const RUN = "Run AI on this Deck";
const START = "Start the AI with the Deck";
const FIELD = "PC address field";
const FIND = "Find Ollama on LAN via mDNS";

async function mount(onDeck: boolean) {
  render(<FirstRunWhereAiRunsModal host={popupHost({ ollamaLocalOnDeck: onDeck })} onClose={vi.fn()} />);
  await waitFor(() => expect(ringName()).toBe(NOT_NOW));
}

/** One press from where the ring is; returns the handler's answer and where the ring is now. */
function step(key: Parameters<typeof press>[0]): { answer: boolean | undefined; at: string } {
  let answer: boolean | undefined;
  act(() => {
    answer = press(key);
  });
  return { answer, at: ringName() };
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetBoxes();
  resetDeveloperTabSignalForTests();
  resetSettingsLoadedSignalForTests();
  markSettingsLoaded();
  setRpcHandler("test_ollama_connection", () => ({ reachable: false, error: "Connection refused" }));
});

describe("the popup's walk, switch on", () => {
  it("starts on Not now and walks Up through the column to the top, where Up holds, then Down back with no stop twice", async () => {
    await mount(true);
    const up = [step("onMoveUp").at, step("onMoveUp").at];
    expect(up).toEqual([START, RUN]);
    expect(step("onMoveUp")).toEqual({ answer: true, at: RUN });
    const walk = [RUN, step("onMoveDown").at, step("onMoveDown").at];
    expect(walk).toEqual([RUN, START, NOT_NOW]);
    expect(new Set(walk).size).toBe(walk.length);
  });

  it("Left and Right move between the two foot buttons and hold at both ends", async () => {
    await mount(true);
    expect(step("onMoveLeft")).toEqual({ answer: true, at: NOT_NOW });
    expect(step("onMoveRight").at).toBe(INSTALL);
    expect(step("onMoveRight")).toEqual({ answer: true, at: INSTALL });
    expect(step("onMoveLeft").at).toBe(NOT_NOW);
  });

  it("Down from the foot holds still, and Up from the second button lands on the switch above, not off the popup", async () => {
    await mount(true);
    expect(step("onMoveDown")).toEqual({ answer: true, at: NOT_NOW });
    step("onMoveRight");
    expect(step("onMoveDown")).toEqual({ answer: true, at: INSTALL });
    expect(step("onMoveUp").at).toBe(START);
  });

  it("every stop answers all four directions, and the four stops are the two switches and the two buttons", async () => {
    const paths: Array<[string, Array<Parameters<typeof press>[0]>]> = [
      [RUN, ["onMoveUp", "onMoveUp"]],
      [START, ["onMoveUp"]],
      [NOT_NOW, []],
      [INSTALL, ["onMoveRight"]],
    ];
    for (const [name, path] of paths) {
      for (const key of ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight"] as const) {
        const view = render(<FirstRunWhereAiRunsModal host={popupHost({ ollamaLocalOnDeck: true })} onClose={vi.fn()} />);
        await waitFor(() => expect(ringName()).toBe(NOT_NOW));
        for (const p of path) step(p);
        expect(ringName()).toBe(name);
        // A press that goes nowhere answers true, so Steam never steps on by itself.
        expect(step(key).answer, `${name} ${key}`).toBe(true);
        view.unmount();
      }
    }
  });
});

describe("the popup's walk, switch off", () => {
  it("goes Run AI switch, PC address, then the foot, and Down from the field lands on Not now, never Test connection", async () => {
    await mount(false);
    expect([step("onMoveUp").at, step("onMoveUp").at]).toEqual([FIELD, RUN]);
    expect(step("onMoveDown").at).toBe(FIELD);
    expect(step("onMoveDown").at).toBe(NOT_NOW);
    expect(step("onMoveRight").at).toBe(TEST);
    // Up from Test connection goes to the field, the first stop of the row it enters.
    expect(step("onMoveUp").at).toBe(FIELD);
  });

  it("holds Left and Right on the field when there is no Find LAN", async () => {
    await mount(false);
    step("onMoveUp");
    expect(step("onMoveLeft")).toEqual({ answer: true, at: FIELD });
    expect(step("onMoveRight")).toEqual({ answer: true, at: FIELD });
  });

  it("with Find LAN shown, Right from the field reaches it and Left comes back; it holds at its end", async () => {
    act(() => publishDeveloperTabShown(true));
    await mount(false);
    step("onMoveUp");
    expect(step("onMoveRight").at).toBe(FIND);
    expect(step("onMoveRight")).toEqual({ answer: true, at: FIND });
    expect(step("onMoveDown").at).toBe(NOT_NOW);
    expect(step("onMoveUp").at).toBe(FIELD);
    step("onMoveRight");
    expect(step("onMoveLeft").at).toBe(FIELD);
  });
});
