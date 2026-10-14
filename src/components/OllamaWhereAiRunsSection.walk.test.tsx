/**
 * Title: The Ollama tab's Deck-local buttons: no "Install options..." and a walk with no dead stop
 *
 * Purpose: Pin plan 79 (D122 call 5, roadmap "Remove the Install options button"). The real "Where AI
 * runs" section is drawn on a Deck (Run AI on this Deck on) and read as a person would see it: the
 * "Install options..." button, its Tier 1 / Tier 2 choices and the "Install model bundles" label are
 * gone. The hand-wired vertical chain is then walked through the move handlers Steam really calls on
 * the device (a Focusable's, never a Decky Button's: `press` below finds the nearest Focusable that has
 * one), Down from the first switch to the end and Up back again:
 * Run AI on this Deck, Start the AI with the Deck, Install/Update, Browse models, Test connection,
 * each visited exactly once, in a bounded number of presses, with no press that lands nowhere.
 *
 * Does not: model Steam's scroll-into-view (deckAnswerWalk.ts models an answer inside a scrolling
 * pane): every move here is a hand-wired focus() between siblings of one panel that does not depend
 * on where the panel is scrolled. The ring itself is the Deck row's job.
 */
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  props: new Map<string, Record<string, unknown>>(),
  /* Every Focusable's props by its element, so a press can find the one Steam would call. */
  focusables: new Map<HTMLElement, Record<string, unknown>>(),
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealButton = stubs.Button;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
    function CapturingButton(props, ref) {
      React.useLayoutEffect(() => {
        const key = props["aria-label"] as string | undefined;
        if (key) hoisted.props.set(key, props);
      });
      return <RealButton {...props} ref={ref} />;
    }
  );
  // A switch the walk can stand on: a real focusable button carrying the label, props captured.
  const CapturingToggle = (props: Record<string, unknown>) => {
    React.useLayoutEffect(() => {
      hoisted.props.set(stubs.wordsOf(props.label), props);
    });
    return <button aria-label={stubs.wordsOf(props.label)}>{stubs.wordsOf(props.label)}</button>;
  };
  /* Steam calls a Focusable's move handlers; the stub throws them away, so keep them by element. */
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      const Base = stubs.Focusable;
      return (
        <Base
          {...props}
          ref={(el: HTMLDivElement | null) => {
            if (el) hoisted.focusables.set(el, props);
            else if (typeof ref === "function") ref(null);
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
        />
      );
    }
  );
  return { ...stubs, Button: CapturingButton, ToggleField: CapturingToggle, Focusable: CapturingFocusable };
});

import { isGreyedDeckyButton } from "../test-harness/fakeDeckyUi";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../features/plugin-shell/settingsLoadedSignal";

const RUN = "Run AI on this Deck";
const BOOT = "Start the AI with the Deck";
const UPDATE = "Update AI engine and installed models";
const BROWSE = "Browse and pull Ollama models";
const TEST = "Test connection to Ollama";

function draw() {
  const exitDown = vi.fn();
  const connectionTestBtnRef = { current: null as HTMLButtonElement | null };
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
      onMoveDownFromConnectionRow={exitDown}
      connectionTestBtnRef={connectionTestBtnRef}
    />
  );
  return { exitDown };
}

const here = () => document.activeElement?.getAttribute("aria-label") ?? "(nothing)";
/*
 * A press the way Steam delivers it. A Decky Button never passes `onMoveDown`/`onMoveUp` on, so for a
 * button the handler Steam calls is the nearest Focusable around it that has one; a switch (our own
 * `DenseSwitchRow` passes its handlers on) keeps its own.
 */
const press = (label: string, dir: "onMoveDown" | "onMoveUp") => {
  const el = document.querySelector(`[aria-label="${label}"]`) as HTMLElement;
  if (el.getAttribute("data-decky-ui") !== "Button") return (hoisted.props.get(label)![dir] as () => unknown)();
  for (let up: HTMLElement | null = el.parentElement; up; up = up.parentElement) {
    const handler = hoisted.focusables.get(up)?.[dir] as (() => unknown) | undefined;
    if (handler) return handler();
  }
  return undefined; // nothing Steam would call: its own geometry decides, which the plugin cannot rely on
};

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  hoisted.props.clear();
  hoisted.focusables.clear();
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: ["qwen2.5vl:3b"] }));
  markSettingsLoaded();
});

describe("Where AI runs on a Deck", () => {
  it("has no Install options button, no Tier 1 / Tier 2 choices and no bundle label", async () => {
    draw();
    await screen.findByText("Update AI & models");
    expect(screen.queryByText(/Install options/)).toBeNull();
    expect(screen.queryByLabelText("Install model bundles")).toBeNull();
    expect(screen.queryByText(/Tier 1 essentials/)).toBeNull();
    expect(screen.queryByText(/Gemma 4/)).toBeNull();
  });

  it("Down from the first switch visits each stop once and leaves the section, then Up walks back", async () => {
    const { exitDown } = draw();
    await screen.findByText("Update AI & models");
    await act(async () => void (document.querySelector(`[aria-label="${RUN}"]`) as HTMLElement).focus());

    const down: string[] = [];
    for (let i = 0; i < 10 && here() !== TEST; i++) {
      down.push(here());
      expect(press(here(), "onMoveDown")).toBe(true);
    }
    down.push(here());
    expect(down).toEqual([RUN, BOOT, UPDATE, BROWSE, TEST]);
    expect(new Set(down).size).toBe(down.length);

    press(TEST, "onMoveDown");
    expect(exitDown).toHaveBeenCalledTimes(1);

    const up: string[] = [];
    for (let i = 0; i < 10 && here() !== RUN; i++) {
      up.push(here());
      expect(press(here(), "onMoveUp")).toBe(true);
    }
    up.push(here());
    expect(up).toEqual([TEST, BROWSE, UPDATE, BOOT, RUN]);
  });

  it("while a setup runs, Update stays a stop, Browse and Test are disabled and Cancel is reached: no press lands nowhere", async () => {
    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "running", stage: "install", log_tail: [] }));
    const { exitDown } = draw();
    const CANCEL = "Cancel local Ollama setup";
    await screen.findByLabelText(CANCEL);
    await act(async () => void (document.querySelector(`[aria-label="${BOOT}"]`) as HTMLElement).focus());

    // The Update button is never disabled, so the ring is never left on a dead button after the press.
    press(BOOT, "onMoveDown");
    expect(here()).toBe(UPDATE);
    // Browse is disabled while a setup runs, so Down from Update lands on Cancel.
    press(UPDATE, "onMoveDown");
    expect(here()).toBe(CANCEL);
    // Test connection is disabled too, so Down from Cancel hands on to the next section.
    press(CANCEL, "onMoveDown");
    expect(exitDown).toHaveBeenCalledTimes(1);
    // Up from Cancel goes back to Update, and from there to the switch.
    press(CANCEL, "onMoveUp");
    expect(here()).toBe(UPDATE);
    press(UPDATE, "onMoveUp");
    expect(here()).toBe(BOOT);
  });

  it("while a setup runs the whole chain walks Down and Up through Cancel, each stop once, with Browse and Test greyed but skipped by the plugin's own state", async () => {
    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "running", stage: "install", log_tail: [] }));
    const { exitDown } = draw();
    const CANCEL = "Cancel local Ollama setup";
    await screen.findByLabelText(CANCEL);
    // The stand-in tells the Deck's truth: a greyed button is not native-disabled and would take the ring.
    expect(isGreyedDeckyButton(document.querySelector(`[aria-label="${BROWSE}"]`))).toBe(true);
    expect(isGreyedDeckyButton(document.querySelector(`[aria-label="${TEST}"]`))).toBe(true);
    expect((document.querySelector(`[aria-label="${BROWSE}"]`) as HTMLButtonElement).disabled).toBe(false);
    await act(async () => void (document.querySelector(`[aria-label="${RUN}"]`) as HTMLElement).focus());

    const down: string[] = [here()];
    for (let i = 0; i < 8 && here() !== CANCEL; i++) {
      expect(press(here(), "onMoveDown")).toBe(true);
      down.push(here());
    }
    expect(down).toEqual([RUN, BOOT, UPDATE, CANCEL]);
    press(CANCEL, "onMoveDown");
    expect(exitDown).toHaveBeenCalledTimes(1);

    const up: string[] = [here()];
    for (let i = 0; i < 8 && here() !== RUN; i++) {
      expect(press(here(), "onMoveUp")).toBe(true);
      up.push(here());
    }
    expect(up).toEqual([CANCEL, UPDATE, BOOT, RUN]);
    expect(new Set([...down, ...up]).size).toBe(4);
  });

  it("Up from Test connection reaches Browse when no setup runs, by a Focusable Steam calls", async () => {
    draw();
    await screen.findByText("Update AI & models");
    await act(async () => void (document.querySelector(`[aria-label="${TEST}"]`) as HTMLElement).focus());
    expect(press(TEST, "onMoveUp")).toBe(true);
    expect(here()).toBe(BROWSE);
  });
});
