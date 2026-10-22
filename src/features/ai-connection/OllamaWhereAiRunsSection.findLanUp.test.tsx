/**
 * Title: Up from Find LAN lands on the PC address box, and Up again on the Save row
 *
 * Purpose: Plan 97 (Deck 2026-10-22, plan97-A-FINDLAN-UP.json): with the AI on a PC, Up from Find LAN landed on
 * the second switch ("Start the AI with the Deck") five times out of five, past the address box and the "Save
 * current PC address" row; coming back, Down from the Save row went straight to Find LAN. The section is drawn
 * with Steam's controls kept faithful (aboutDeckyUi: every move handler on its element, a nav node's TakeFocus
 * landing on the stop inside) and pressed the way Steam routes a press (`steamStep`: the stop's own handler, then
 * each container around it, then the tab body's column of rows). The tab sits in a scroll pane laid out with the
 * Deck's measured boxes, and after every landing the pane glides the stop into view as Steam's own scroll does.
 * A bounded walk up from Find LAN must visit the address box, then the Save row, then the two switches, each
 * stop once; Down from the Save row comes back to the address box, and Down again to Test connection. Checked
 * with the pane at the top (the monitor run) and scrolled (a shorter screen), and with no address typed.
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); the Deck row P97-L16-FINDLAN-UP does.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const kit = await import("../../test-harness/aboutDeckyUi");
  /* Steam's text field: one stop (the input), its move handlers on it, and a nav node that lands on it. */
  const StopTextField = (props: Record<string, unknown>) => {
    const nav: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) if (/^onMove/.test(k)) nav[k] = v;
    const holder = props.navRef as { current: unknown } | undefined;
    return (
      <input
        aria-label="PC address"
        data-decky-ui="Focusable"
        data-steam-stop="true"
        tabIndex={0}
        value={String(props.value ?? "")}
        onChange={() => {}}
        ref={(el) => {
          if (!el) return;
          (el as unknown as { __nav: unknown }).__nav = nav;
          if (holder) holder.current = { TakeFocus: () => (el.focus(), true) };
        }}
      />
    );
  };
  /* A switch row: one stop carrying the moves the plugin hands it, named by its label. */
  const StopToggle = (props: Record<string, unknown>) => {
    const { label, checked: _c, onChange: _o, description: _d, disabled: _x, ...rest } = props;
    return (
      <kit.KeepNavButton {...rest} aria-label={String((label as { props?: { children?: unknown } })?.props?.children ?? label)}>
        {label as React.ReactNode}
      </kit.KeepNavButton>
    );
  };
  return {
    ...stubs,
    Focusable: kit.KeepNavFocusable,
    Button: kit.KeepNavButton,
    TextField: StopTextField,
    ToggleField: StopToggle,
  };
});

import { KeepNavFocusable, steamStep, type SteamDirection } from "../../test-harness/aboutDeckyUi";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../settings/settingsLoadedSignal";
import { tabMdnsDiscovery } from "./mdnsDiscoveryStore";

const RUN = "Run AI on this Deck";
const START = "Start the AI with the Deck";
const SAVE = "Save current PC address as quick host";
const ADDRESS = "PC address";
const TEST = "Test connection to Ollama";
const FIND = "Find Ollama on LAN via mDNS";

/** The boxes measured on the Deck (plan97-A-FINDLAN-UP.json), top and height in the tab's own coordinates. */
const BOXES: Record<string, [number, number]> = {
  [RUN]: [82, 42],
  [START]: [124, 42],
  [SAVE]: [185, 34],
  [ADDRESS]: [235, 40],
  [TEST]: [315, 38],
  [FIND]: [315, 38],
};

function draw(ip: string, viewport: number, scrollTop: number) {
  const view = render(
    <div className="Tabs_TabContentsScroll" data-pane="">
      <KeepNavFocusable data-tab-body="">
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
          onMoveDownFromConnectionRow={() => {}}
          connectionTestBtnRef={{ current: null }}
        />
      </KeepNavFocusable>
    </div>,
  );
  const pane = view.container.querySelector<HTMLElement>("[data-pane]")!;
  let top = scrollTop;
  const contentHeight = 600;
  Object.defineProperty(pane, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (v: number) => {
      top = Math.max(0, Math.min(contentHeight - viewport, v));
    },
  });
  Object.defineProperty(pane, "scrollHeight", { configurable: true, value: contentHeight });
  Object.defineProperty(pane, "clientHeight", { configurable: true, value: viewport });
  return { pane, viewport };
}

const nameOf = (el: Element | null) => (el ? (el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "") : "(nothing)");
const stop = (label: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${label}"]`) ??
  Array.from(document.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent?.trim() === label)!;

/** Steam's glide after a landing: a stop not wholly in view is brought just into view. */
function glide(pane: HTMLElement, viewport: number, el: Element | null) {
  const box = BOXES[nameOf(el)];
  if (!box) return;
  const [y, h] = box;
  if (y < pane.scrollTop) pane.scrollTop = y;
  else if (y + h > pane.scrollTop + viewport) pane.scrollTop = y + h - viewport;
}

function press(pane: HTMLElement, viewport: number, from: HTMLElement, dir: SteamDirection): HTMLElement {
  const to = steamStep(from, dir, { columnWhereUnset: (c) => c.hasAttribute("data-tab-body") });
  glide(pane, viewport, to);
  return to;
}

/** Up from Find LAN until the ring stops moving, at most ten presses; every landing is named. */
function walkUp(pane: HTMLElement, viewport: number): string[] {
  let at = stop(FIND);
  at.focus();
  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    const next = press(pane, viewport, at, "Up");
    if (next === at) break;
    seen.push(nameOf(next));
    at = next;
  }
  return seen;
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  tabMdnsDiscovery.reset();
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
  markSettingsLoaded();
});

describe("Where AI runs on a PC: Up from Find LAN", () => {
  for (const [name, viewport, scrollTop] of [
    ["the pane at the top (monitor)", 766, 0],
    ["the pane scrolled to the address row", 160, 200],
  ] as const) {
    it(`walks address box, Save row, then the switches, each stop once (${name})`, async () => {
      const { pane } = draw("192.168.1.100", viewport, scrollTop);
      await screen.findByText("Test connection");
      const seen = walkUp(pane, viewport);
      expect(seen.slice(0, 2)).toEqual([ADDRESS, SAVE]);
      expect(seen).toEqual([ADDRESS, SAVE, START, RUN]);
      expect(new Set(seen).size).toBe(seen.length);
    });
  }

  it("Up from Test connection lands on the address box too", async () => {
    const { pane, viewport } = draw("192.168.1.100", 766, 0);
    await screen.findByText("Test connection");
    stop(TEST).focus();
    expect(nameOf(press(pane, viewport, stop(TEST), "Up"))).toBe(ADDRESS);
  });

  it("with no address typed (Test connection greyed) Up from Find LAN still lands on the address box", async () => {
    const { pane } = draw("", 766, 0);
    await screen.findByText("Test connection");
    expect(walkUp(pane, 766).slice(0, 2)).toEqual([ADDRESS, SAVE]);
  });

  it("coming back, Down from the Save row lands on the address box, and Down again on Test connection", async () => {
    const { pane, viewport } = draw("192.168.1.100", 766, 0);
    await screen.findByText("Test connection");
    stop(SAVE).focus();
    const first = press(pane, viewport, stop(SAVE), "Down");
    expect(nameOf(first)).toBe(ADDRESS);
    expect(nameOf(press(pane, viewport, first, "Down"))).toBe(TEST);
  });
});
