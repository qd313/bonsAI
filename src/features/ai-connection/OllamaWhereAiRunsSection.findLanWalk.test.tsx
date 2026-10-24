/**
 * Title: The PC address row's walk: address, Test connection, Find LAN
 *
 * Purpose: Plan 96 (Deck 2026-10-18, plan96-P96-FINDLAN.json): Down from the PC address box skipped Test
 * connection and Find LAN every time (Up from the Knowledge base line reached Test connection, then Right
 * reached Find LAN). The section is drawn for an AI on a PC and walked through the move handlers Steam
 * really calls (a Focusable's, and the address box's own, never a Decky Button's): Down from the address
 * lands on Test connection, Right on Find LAN, Left back, and Down from either leaves the row once. With
 * Test connection greyed (no address) Down from the address lands on Find LAN. No stop is visited twice.
 *
 * Does not: model Steam's scroll-into-view (the row is short and does not depend on the scroll position) or
 * prove the ring on the device; the Deck rows P96-FINDLAN-try2 and P96-CANCEL-RIGHT do.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  focusables: new Map<HTMLElement, Record<string, unknown>>(),
  field: { current: null as Record<string, unknown> | null },
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  /* Steam calls a Focusable's move handlers; the stub throws them away, so keep them by element. */
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
    },
  );
  /* The address box is a real text input here, and keeps the move handlers Steam would call on it. */
  const CapturingField = (props: Record<string, unknown>) => {
    hoisted.field.current = props;
    return <input aria-label="PC address" value={String(props.value ?? "")} onChange={() => {}} />;
  };
  return { ...stubs, Focusable: CapturingFocusable, TextField: CapturingField };
});

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { tabMdnsDiscovery } from "./mdnsDiscoveryStore";

const TEST = "Test connection to Ollama";
const FIND = "Find Ollama on LAN via mDNS";

function draw(ip: string) {
  const exitDown = vi.fn();
  const connectionTestBtnRef = { current: null as HTMLButtonElement | null };
  render(
    <OllamaWhereAiRunsSection
      ollamaIp={ip}
      onOllamaIpChange={() => {}}
      onPersistOllamaIp={() => {}}
      ollamaLocalOnDeck={false}
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
    />,
  );
  return { exitDown };
}

const here = () => document.activeElement?.getAttribute("aria-label") ?? "(nothing)";
/** The handler Steam calls for a button: the nearest Focusable around it that has one. */
const press = (label: string, dir: "onMoveDown" | "onMoveUp" | "onMoveLeft" | "onMoveRight") => {
  const el = document.querySelector(`[aria-label="${label}"]`) as HTMLElement;
  for (let up: HTMLElement | null = el.parentElement; up; up = up.parentElement) {
    const handler = hoisted.focusables.get(up)?.[dir] as (() => unknown) | undefined;
    if (handler) return handler();
  }
  return undefined; // nothing Steam would call: its own geometry decides, which the plugin cannot rely on
};
const pressDownOnAddress = () => (hoisted.field.current?.onMoveDown as (() => unknown) | undefined)?.();

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  tabMdnsDiscovery.reset();
  hoisted.focusables.clear();
  hoisted.field.current = null;
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
  markSettingsLoaded();
});

describe("Where AI runs on a PC: the address row", () => {
  it("Down from the address lands on Test connection, Right on Find LAN, Left back, each stop once", async () => {
    const { exitDown } = draw("192.168.1.100");
    await screen.findByText("Test connection");

    expect(pressDownOnAddress()).toBe(true);
    const stops = [here()];
    expect(press(TEST, "onMoveRight")).toBe(true);
    stops.push(here());
    expect(stops).toEqual([TEST, FIND]);
    expect(new Set(stops).size).toBe(stops.length);

    expect(press(FIND, "onMoveLeft")).toBe(true);
    expect(here()).toBe(TEST);

    press(TEST, "onMoveDown");
    press(FIND, "onMoveDown");
    expect(exitDown).toHaveBeenCalledTimes(2);
  });

  it("with no address typed (Test connection greyed) Down from the address lands on Find LAN", async () => {
    draw("");
    await screen.findByText("Test connection");
    expect(pressDownOnAddress()).toBe(true);
    expect(here()).toBe(FIND);
  });
});
