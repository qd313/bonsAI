/**
 * Title: Walking the first-time setup popup with the D-pad
 *
 * Purpose: Draws the real popup with Steam's ring modelled and presses the D-pad the way Steam calls the move
 * handlers. First screen (plan 105, lane D3): the ring starts on Not now; the stops are the three tick rows that can
 * be unticked, the Internet downloads switch and the three foot buttons (Ollama and the answer model are not stops);
 * Up and Down walk the column and Up from the top row holds; Down from the switch lands on OK once the switch is on
 * and on Not now before; Left and Right walk the foot and hold at its ends; every stop answers all four directions (a
 * press that goes nowhere returns true, so Steam never steps on by itself); a walk from either end visits no stop
 * twice and stops by itself. PC screen: the ring starts on Back; the address field and Find LAN, then the foot.
 *
 * Used for: FirstRunWhereAiRunsModal.tsx, useFirstRunPopupNav.ts (AGENTS.md "Adding a new control").
 *
 * Solves: a popup whose stops are not reachable by D-pad, or whose walk revisits a stop or leaves the popup, passes
 * every other test and is dead on the Deck.
 *
 * Does not: Know Steam's spatial walk (this popup does not use it) or scroll anything: the box fits the Deck's screen
 * (FirstRunWhereAiRunsModal.fit.test.tsx), so Steam has nothing to scroll into view. The Deck row measures the rest.
 */
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => (await import("./firstRunPopupTestKit")).deckyUiForFirstRunPopup());

import { FirstRunWhereAiRunsModal } from "./FirstRunWhereAiRunsModal";
import { popupHost, press, resetBoxes, ringName } from "./firstRunPopupTestKit";
import { permissionBridge } from "./firstRunTestBridge";
import { resetFakeDeckyRpc } from "../../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../../settings/settingsLoadedSignal";

const NOTE = "Note-search model nomic-embed-text";
const SPEECH = "Speech models tiny.en and base.en";
const VOICE = "Voice engine (whisper.cpp)";
const SWITCH = "Internet downloads";
const OK = "OK, install on this Deck";
const PC = "Use the AI on my PC";
const NOT_NOW = "Not now";
const FIELD = "PC address field";
const FIND = "Find Ollama on LAN via mDNS";
const TEST = "Test the connection to the PC";
const BACK = "Back to the first screen";
const MOVES = ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight"] as const;

async function mount(downloadsOn = false) {
  permissionBridge(downloadsOn);
  const view = render(<FirstRunWhereAiRunsModal host={popupHost()} onClose={vi.fn()} />);
  await waitFor(() => expect(ringName()).toBe(NOT_NOW));
  return view;
}

/** One press from where the ring is; returns the handler's answer and where the ring is now. */
function step(key: Parameters<typeof press>[0]): { answer: boolean | undefined; at: string } {
  let answer: boolean | undefined;
  act(() => {
    answer = press(key);
  });
  return { answer, at: ringName() };
}

/** Presses `key` until the ring stops moving (at most 12 presses); returns every stop it stood on, in order. */
function walk(key: (typeof MOVES)[number]): string[] {
  const seen = [ringName()];
  for (let i = 0; i < 12; i++) {
    const { at } = step(key);
    if (at === seen[seen.length - 1]) return seen;
    seen.push(at);
  }
  throw new Error(`the walk ${key} never stopped: ${seen.join(" > ")}`);
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetBoxes();
  resetSettingsLoadedSignalForTests();
  markSettingsLoaded();
  window.localStorage.clear();
});

describe("the first screen's walk", () => {
  it("starts on Not now, walks Up to the top row and holds there, and back Down to Not now, no stop twice", async () => {
    await mount();
    const up = walk("onMoveUp");
    expect(up).toEqual([NOT_NOW, SWITCH, VOICE, SPEECH, NOTE]);
    expect(step("onMoveUp")).toEqual({ answer: true, at: NOTE });
    const down = walk("onMoveDown");
    expect(down).toEqual([NOTE, SPEECH, VOICE, SWITCH, NOT_NOW]);
    expect(new Set(up).size).toBe(up.length);
    expect(new Set(down).size).toBe(down.length);
  });

  it("Down from the switch lands on OK once Internet downloads are on", async () => {
    await mount(true);
    expect(step("onMoveUp").at).toBe(SWITCH);
    expect(step("onMoveDown").at).toBe(OK);
  });

  it("Left and Right walk the foot and hold at both ends; Up from any foot button lands on the switch; Down holds", async () => {
    await mount();
    expect(walk("onMoveLeft")).toEqual([NOT_NOW, PC, OK]);
    expect(step("onMoveLeft")).toEqual({ answer: true, at: OK });
    expect(walk("onMoveRight")).toEqual([OK, PC, NOT_NOW]);
    expect(step("onMoveRight")).toEqual({ answer: true, at: NOT_NOW });
    expect(step("onMoveDown")).toEqual({ answer: true, at: NOT_NOW });
    for (const left of [0, 1, 2]) {
      for (let i = 0; i < left; i++) step("onMoveLeft");
      expect(step("onMoveUp").at).toBe(SWITCH);
      step("onMoveDown");
      expect(ringName()).toBe(NOT_NOW);
    }
  });

  it("every stop answers all four directions, and the seven stops are the three rows, the switch and the three buttons", async () => {
    const paths: Array<[string, Array<(typeof MOVES)[number]>]> = [
      [NOTE, ["onMoveUp", "onMoveUp", "onMoveUp", "onMoveUp"]],
      [SPEECH, ["onMoveUp", "onMoveUp", "onMoveUp"]],
      [VOICE, ["onMoveUp", "onMoveUp"]],
      [SWITCH, ["onMoveUp"]],
      [NOT_NOW, []],
      [PC, ["onMoveLeft"]],
      [OK, ["onMoveLeft", "onMoveLeft"]],
    ];
    for (const [name, path] of paths) {
      for (const key of MOVES) {
        const view = await mount();
        for (const p of path) step(p);
        expect(ringName()).toBe(name);
        expect(step(key).answer, `${name} ${key}`).toBe(true);
        view.unmount();
      }
    }
  });
});

describe("the PC screen's walk", () => {
  async function onPcScreen() {
    const view = await mount();
    step("onMoveLeft");
    act(() => void press("onOKButton"));
    await waitFor(() => expect(ringName()).toBe(BACK));
    return view;
  }

  it("starts on Back; Up reaches the field and holds there; Down from the field lands on Back, never Test connection", async () => {
    await onPcScreen();
    expect(step("onMoveUp").at).toBe(FIELD);
    expect(step("onMoveUp")).toEqual({ answer: true, at: FIELD });
    expect(step("onMoveDown").at).toBe(BACK);
    expect(step("onMoveLeft").at).toBe(TEST);
    expect(step("onMoveLeft")).toEqual({ answer: true, at: TEST });
    expect(step("onMoveUp").at).toBe(FIELD);
  });

  it("Right from the field reaches Find LAN and holds there; Down from Find LAN lands on Back", async () => {
    await onPcScreen();
    step("onMoveUp");
    expect(step("onMoveRight").at).toBe(FIND);
    expect(step("onMoveRight")).toEqual({ answer: true, at: FIND });
    expect(step("onMoveDown").at).toBe(BACK);
    expect(step("onMoveRight")).toEqual({ answer: true, at: BACK });
  });
});
