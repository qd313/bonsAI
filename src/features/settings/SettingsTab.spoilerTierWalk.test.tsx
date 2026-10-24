/**
 * Title: Settings tab -- the D-pad walk with the spoiler tier row in it
 * Purpose: Walk the real Settings tab from its first stop to its last with Steam's own step modelled as "the next
 *          stop in drawing order", and check the Story spoilers section: the switch, then the tier row's three
 *          buttons (each visited once), then Suggestion chips. The row takes Left and Right from Steam's own
 *          step, so it carries no handler for them; the switch hands Up to the section's line and the row hands
 *          Down to the next line, the two ends of the section, with the one step between them left to Steam.
 *          Down from the row leaves the section for the next line; Up from the switch goes to its line; neither
 *          lands on a stop twice.
 * Used for: plan 98 lane B, the spoiler tiers setting. Pairs with SettingsTab.foldedWalk.test.tsx, which walks the
 *           whole tab under Steam's three scroll rules.
 * Does not: Know Steam's real spatial rule or its scroll; the Deck walk is the real check (docs/focus-graph.md,
 *           "The Story spoilers tier row").
 */
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { SettingsTab } from "./SettingsTab";
import { settingsProps } from "../../test-harness/ringTestProps";
import { openAllSettingsSections } from "../../test-harness/settingsFoldOpen";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";

beforeEach(() => {
  resetNavFocusRegistry();
  openAllSettingsSections();
});

const STOP = 'button:not([disabled]), [data-decky-ui="ToggleField"]';
const SWITCH = '[data-decky-ui="ToggleField"][aria-label="Hide spoilers until I tap"]';
const nameOf = (el: HTMLElement) => el.getAttribute("aria-label") ?? el.getAttribute("label") ?? el.textContent ?? "";
const handlersOf = (el: Element | null) => {
  const nav = (el as SteamEl | null)?.__nav ?? {};
  return Object.keys(nav).filter((k) => nav[k]);
};

describe("Settings tab walk with the spoiler tier row", () => {
  it("visits the switch, the three tier buttons and then Suggestion chips, each stop once", () => {
    const { container } = render(<SettingsTab {...settingsProps()} />);
    const stops = Array.from(container.querySelectorAll<HTMLElement>(STOP));
    expect(new Set(stops).size).toBe(stops.length);
    const names = stops.map(nameOf);
    const first = names.indexOf("Hide spoilers until I tap");
    expect(names.slice(first, first + 5)).toEqual([
      "Hide spoilers until I tap",
      "Set spoiler tier to Hide more",
      "Set spoiler tier to Default",
      "Set spoiler tier to Hide less",
      "Show one chip instead of two",
    ]);
  });

  it("gives the row only Down and the switch only Up: nothing that could swallow a Left or Right press", () => {
    const { container } = render(<SettingsTab {...settingsProps()} />);
    const row = container.querySelector<SteamEl>('[data-bonsai-spoiler-tier-row="true"]')!;
    expect(row.getAttribute("flow-children")).toBe("horizontal");
    expect(handlersOf(row)).toEqual(["onMoveDown"]);
    for (const button of Array.from(row.querySelectorAll<HTMLElement>("button"))) {
      expect(handlersOf(button)).toEqual([]);
      expect(button.hasAttribute("disabled")).toBe(false);
    }
    expect(handlersOf(container.querySelector(SWITCH))).toEqual(["onMoveUp"]);
  });

  it("Down from the row goes to the next section's line; Up from the switch goes to its own section's line", () => {
    const { container } = render(<SettingsTab {...settingsProps()} />);
    const row = container.querySelector<SteamEl>('[data-bonsai-spoiler-tier-row="true"]')!;
    act(() => putSteamRingOn(row.querySelector("button")));
    act(() => void row.__nav?.onMoveDown?.());
    expect(steamRingHolder()?.getAttribute("data-bonsai-fold-line")).toBe("chips");

    const toggle = container.querySelector<SteamEl>(SWITCH)!;
    act(() => putSteamRingOn(toggle));
    act(() => void toggle.__nav?.onMoveUp?.());
    expect(steamRingHolder()?.getAttribute("data-bonsai-fold-line")).toBe("spoilers");
  });

  it("Up from the next line into the open section lands on Hide more, the row's first button, as Down from its line lands on the switch", () => {
    const { container } = render(<SettingsTab {...settingsProps()} />);
    const line = (id: string) => container.querySelector<SteamEl>(`[data-bonsai-fold-line="${id}"]`)!;
    act(() => putSteamRingOn(line("chips")));
    act(() => void line("chips").__nav?.onMoveUp?.());
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Set spoiler tier to Hide more");
    expect(document.activeElement?.closest('[data-bonsai-spoiler-tier-row="true"]')).not.toBeNull();

    act(() => putSteamRingOn(line("spoilers")));
    act(() => void line("spoilers").__nav?.onMoveDown?.());
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Hide spoilers until I tap");
  });

  it("a round trip, Up into the section, Left and Right along the row's own stops, Down out, lands on no stop twice", () => {
    const { container } = render(<SettingsTab {...settingsProps()} />);
    const line = (id: string) => container.querySelector<SteamEl>(`[data-bonsai-fold-line="${id}"]`)!;
    const landed: Element[] = [];
    act(() => putSteamRingOn(line("chips")));
    act(() => void line("chips").__nav?.onMoveUp?.());
    landed.push(document.activeElement!);
    const row = container.querySelector<SteamEl>('[data-bonsai-spoiler-tier-row="true"]')!;
    const buttons = Array.from(row.querySelectorAll<HTMLElement>("button"));
    expect(landed[0]).toBe(buttons[0]);
    /* Right is Steam's own step along the row: the next stop in drawing order. */
    landed.push(buttons[1]!, buttons[2]!);
    act(() => putSteamRingOn(buttons[2]!));
    act(() => void row.__nav?.onMoveDown?.());
    expect(steamRingHolder()?.getAttribute("data-bonsai-fold-line")).toBe("chips");
    expect(new Set(landed).size).toBe(landed.length);
  });
});
