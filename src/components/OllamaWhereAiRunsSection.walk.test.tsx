/**
 * Title: The Ollama tab's Deck-local buttons: no "Install options..." and a walk with no dead stop
 *
 * Purpose: Pin plan 79 (D122 call 5, roadmap "Remove the Install options button"). The real "Where AI
 * runs" section is drawn on a Deck (Run AI on this Deck on) and read as a person would see it: the
 * "Install options..." button, its Tier 1 / Tier 2 choices and the "Install model bundles" label are
 * gone. The hand-wired vertical chain is then walked through the buttons' own move handlers (the
 * only thing Steam calls on the device), Down from the first switch to the end and Up back again:
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

const hoisted = vi.hoisted(() => ({ props: new Map<string, Record<string, unknown>>() }));

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
      hoisted.props.set(props.label as string, props);
    });
    return <button aria-label={props.label as string}>{props.label as string}</button>;
  };
  return { ...stubs, Button: CapturingButton, ToggleField: CapturingToggle };
});

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
const press = (label: string, dir: "onMoveDown" | "onMoveUp") =>
  (hoisted.props.get(label)![dir] as () => unknown)();

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  hoisted.props.clear();
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

  it("while a setup runs, Install, Browse and Test are disabled and Cancel stands in: no press lands nowhere", async () => {
    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "running", stage: "install", log_tail: [] }));
    const { exitDown } = draw();
    const CANCEL = "Cancel local Ollama setup";
    await screen.findByLabelText(CANCEL);
    await act(async () => void (document.querySelector(`[aria-label="${BOOT}"]`) as HTMLElement).focus());

    // Down from the Start-at-boot switch skips the disabled Install button and lands on Cancel.
    press(BOOT, "onMoveDown");
    expect(here()).toBe(CANCEL);
    // Test connection is disabled too, so Down from Cancel hands on to the next section.
    press(CANCEL, "onMoveDown");
    expect(exitDown).toHaveBeenCalledTimes(1);
    // Up from Cancel goes back to the switch.
    press(CANCEL, "onMoveUp");
    expect(here()).toBe(BOOT);
  });
});
