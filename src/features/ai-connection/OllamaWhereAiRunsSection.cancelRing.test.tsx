/**
 * Title: When Cancel ends the first Ollama download, the ring lands on Update, not on nothing
 *
 * Purpose: Pin the Deck finding of 2026-10-14 (workshop:test-evidence/plan93-P93-B10-CANCEL.json): A on
 * Cancel stopped the run, the Cancel button was taken away with the ring on it, and no control held the
 * ring until the next Down. The real "Where AI runs" section is drawn on a Deck with a setup running,
 * the ring is put on Cancel, the back end then reports the run ended (cancelled, finished or failed),
 * and the ring has to be on "Update AI & models" once Cancel is gone.
 *
 * Does not: model Steam's own transfer. The test hands the Update row's `navRef` a TakeFocus that
 * focuses the button, the way Steam's node does; a second case has no TakeFocus at all, to pin the
 * fallback. The Deck row proves the real thing.
 */
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ focusables: new Map<HTMLElement, Record<string, unknown>>() }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  /* Keep each Focusable's props by element, so the test can reach the Update row's navRef. */
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      const Base = stubs.Focusable;
      return (
        <Base
          {...props}
          ref={(el: HTMLDivElement | null) => {
            if (el) hoisted.focusables.set(el, props);
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
        />
      );
    }
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";

const UPDATE = "Update AI engine and installed models";
const CANCEL = "Cancel local Ollama setup";

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
      onMoveDownFromConnectionRow={() => {}}
      connectionTestBtnRef={{ current: null }}
    />,
  );
}

const byLabel = (label: string) => document.querySelector(`[aria-label="${label}"]`) as HTMLElement | null;
const here = () => document.activeElement?.getAttribute("aria-label") ?? "(nothing)";

/** Fill the Update row's `navRef` the way Steam does once the node is mounted. */
function giveUpdateRowASteamNode(withTakeFocus: boolean): void {
  for (const [el, props] of hoisted.focusables) {
    if (!el.contains(byLabel(UPDATE)) || el.contains(byLabel(CANCEL))) continue;
    const holder = props.navRef as { current: unknown } | undefined;
    if (!holder) continue;
    holder.current = withTakeFocus ? { TakeFocus: () => byLabel(UPDATE)?.focus() } : {};
  }
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  hoisted.focusables.clear();
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: ["qwen2.5vl:3b"] }));
  markSettingsLoaded();
});

describe("Cancel ends the run with the ring on it", () => {
  for (const phase of ["cancelled", "done", "error"]) {
    it(`the ring is on Update once the run has ${phase} and Cancel is gone`, async () => {
      setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "running", stage: "install", log_tail: [] }));
      draw();
      await screen.findByLabelText(CANCEL);
      giveUpdateRowASteamNode(true);
      await act(async () => void byLabel(CANCEL)!.focus());
      expect(here()).toBe(CANCEL);

      setRpcHandler("get_local_ollama_setup_status", () => ({ phase, stage: "", log_tail: [], error: phase === "error" ? "x" : "" }));
      await waitFor(() => expect(byLabel(CANCEL)).toBeNull(), { timeout: 5000 });
      await waitFor(() => expect(here()).toBe(UPDATE), { timeout: 2000 });
    });
  }

  it("with no Steam node to transfer through, the button's own focus still puts the ring on Update", async () => {
    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "running", stage: "install", log_tail: [] }));
    draw();
    await screen.findByLabelText(CANCEL);
    giveUpdateRowASteamNode(false);
    await act(async () => void byLabel(CANCEL)!.focus());

    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "cancelled", stage: "", log_tail: [] }));
    await waitFor(() => expect(byLabel(CANCEL)).toBeNull(), { timeout: 5000 });
    await waitFor(() => expect(here()).toBe(UPDATE), { timeout: 2000 });
  });

  it("when the ring was somewhere else (Update), the run ending does not move it", async () => {
    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "running", stage: "install", log_tail: [] }));
    draw();
    await screen.findByLabelText(CANCEL);
    giveUpdateRowASteamNode(true);
    const takeFocus = vi.fn();
    for (const [el, props] of hoisted.focusables) {
      const holder = props.navRef as { current: unknown } | undefined;
      if (holder && el.contains(byLabel(UPDATE))) holder.current = { TakeFocus: takeFocus };
    }
    await act(async () => void byLabel(UPDATE)!.focus());

    setRpcHandler("get_local_ollama_setup_status", () => ({ phase: "cancelled", stage: "", log_tail: [] }));
    await waitFor(() => expect(byLabel(CANCEL)).toBeNull(), { timeout: 5000 });
    await act(async () => new Promise((r) => setTimeout(r, 400)));
    expect(takeFocus).not.toHaveBeenCalled();
    expect(here()).toBe(UPDATE);
  });
});
