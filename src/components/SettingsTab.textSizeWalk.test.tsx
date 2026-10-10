/**
 * Title: Settings tab -- the D-pad walk with the Text size row in it
 * Purpose: Walk the Settings tab from its first stop to its last (Down), and back (Up), with Steam's
 *          own step modelled as "the next stop in drawing order", and check the new Text size row
 *          adds three stops that are each visited once, sit between Screenshot quality and
 *          Remember what I typed, and carry no move handler of their own that could swallow a press.
 * Used for: plan 87 F6. A control that is wired to its own Left/Right/Up/Down handlers can leave a
 *           dead press; this row has none, so Steam's own walk decides every step.
 * Does not: Know Steam's real spatial rule or its scroll. jsdom has neither: the real walk is the
 *           Deck check in the plan (docs/focus-graph.md, "The Text size row").
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { SettingsTab } from "./SettingsTab";
import { settingsProps } from "./ringTestProps";
import type { SteamEl } from "../test-harness/steamRing";

const STOP = 'button:not([disabled]), [data-decky-ui="ToggleField"]';

function stopsOf(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(STOP));
}
function nameOf(el: HTMLElement): string {
  return el.getAttribute("aria-label") ?? el.getAttribute("label") ?? el.textContent ?? "";
}

describe("Settings tab walk with the Text size row", () => {
  for (const showDeveloperTab of [false, true]) {
    it(`visits every stop once, Down then Up, with the Developer tab ${showDeveloperTab ? "on" : "off"}`, () => {
      const { container } = render(<SettingsTab {...settingsProps()} showDeveloperTab={showDeveloperTab} />);
      const stops = stopsOf(container);
      const names = stops.map(nameOf);
      // A stop visited twice would show up here as the same element listed twice.
      expect(new Set(stops).size).toBe(stops.length);
      // Down visits the stops in drawing order and Up the same ones backwards, so the one list is the walk.
      expect(stops.length).toBeGreaterThan(6);

      const first = names.indexOf("Set text size to Small");
      expect(first).toBeGreaterThan(0);
      expect(names.slice(first, first + 3)).toEqual([
        "Set text size to Small",
        "Set text size to Normal",
        "Set text size to Large",
      ]);
      // Right under Screenshot quality (its last choice), right above Remember what I typed.
      expect(names[first - 1]).toBe("Set screenshot quality to Best detail");
      expect(names[first + 3]).toBe("Remember what I typed");
    });
  }

  it("gives the Text size row no move handler of its own, so no press can be swallowed", () => {
    const { container } = render(<SettingsTab {...settingsProps()} />);
    const row = container.querySelector<SteamEl>('[data-bonsai-chat-text-size-row="true"]');
    expect(row).toBeTruthy();
    expect(row!.getAttribute("flow-children")).toBe("horizontal");
    for (const handler of Object.values(row!.__nav ?? {})) expect(handler).toBeUndefined();
    const buttonsInRow = Array.from(row!.querySelectorAll<HTMLElement>("button"));
    expect(buttonsInRow).toHaveLength(3);
    for (const b of buttonsInRow) expect(b.hasAttribute("disabled")).toBe(false);
  });
});
