/**
 * Title: Settings tab -- the spoiler tier row
 * Purpose: Pin the "How much to hide" row in the Story spoilers section: three choices (Hide more, Default,
 *          Hide less) in that order, the saved one marked, a press saves the choice that was pressed, the row's
 *          words say what each choice does, and the row sits right under the "Hide spoilers until I tap" switch
 *          in the real Settings tab, with its summary on the section's line.
 * Used for: plan 98 lane B, the spoiler tiers setting (D50).
 * Does not: Decide what the AI hides (tests/test_spoiler_tier.py) or walk the D-pad
 *           (SettingsTab.spoilerTierWalk.test.tsx).
 */
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsTab } from "./SettingsTab";
import { SettingsTabSpoilerTierRow } from "./SettingsTabSpoilerTierRow";
import { SETTINGS_ROW_HELP } from "./settingsTabFolds";
import { settingsProps } from "../../test-harness/ringTestProps";
import { closeAllSettingsSections, openAllSettingsSections } from "../../test-harness/settingsFoldOpen";

afterEach(() => cleanup());

function buttons(root: ParentNode = document): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
}

describe("Settings tab spoiler tier row", () => {
  it("shows Hide more, Default and Hide less in that order", () => {
    render(<SettingsTabSpoilerTierRow setting={{ value: "default", set: () => {} }} />);
    expect(buttons().map((b) => b.textContent)).toEqual(["Hide more", "Default", "Hide less"]);
  });

  it("marks only the saved choice as pressed", () => {
    for (const [saved, index] of [
      ["strict", 0],
      ["default", 1],
      ["open", 2],
    ] as const) {
      const { unmount } = render(<SettingsTabSpoilerTierRow setting={{ value: saved, set: () => {} }} />);
      expect(buttons().map((b) => b.getAttribute("aria-pressed"))).toEqual([0, 1, 2].map((i) => String(i === index)));
      unmount();
    }
  });

  it("saves the tier that was pressed: Hide more is strict, Hide less is open", () => {
    const set = vi.fn();
    render(<SettingsTabSpoilerTierRow setting={{ value: "default", set }} />);
    const [more, , less] = buttons();
    fireEvent.click(less);
    fireEvent.click(more);
    expect(set.mock.calls).toEqual([["open"], ["strict"]]);
  });

  it("names each button for a screen reader and says what the choices do in the strip, plainly", () => {
    const { container } = render(<SettingsTabSpoilerTierRow setting={{ value: "default", set: () => {} }} />);
    expect(buttons().map((b) => b.getAttribute("aria-label"))).toEqual([
      "Set spoiler tier to Hide more",
      "Set spoiler tier to Default",
      "Set spoiler tier to Hide less",
    ]);
    const words = container.querySelector("[data-bonsai-help]")?.getAttribute("data-bonsai-help") ?? "";
    expect(words).toBe(SETTINGS_ROW_HELP.spoilerTier);
    for (const part of ["Hide more", "Default", "Hide less", "boss"]) expect(words).toContain(part);
    /* One line: the words are not drawn under the title. */
    expect(container.textContent).not.toContain(SETTINGS_ROW_HELP.spoilerTier);
  });
});

describe("the spoiler tier row in the Settings tab", () => {
  beforeEach(() => openAllSettingsSections());

  it("sits in the Story spoilers section, right under the Hide spoilers until I tap switch", () => {
    const { container } = render(<SettingsTab {...settingsProps()} />);
    const labels = Array.from(container.querySelectorAll("[data-bonsai-help-label]")).map((e) =>
      e.getAttribute("data-bonsai-help-label"),
    );
    const at = labels.indexOf("Hide spoilers until I tap");
    expect(at).toBeGreaterThan(-1);
    expect(labels.slice(at, at + 3)).toEqual([
      "Hide spoilers until I tap",
      "How much to hide",
      "Show one chip instead of two",
    ]);
  });

  it("draws the saved tier as pressed and saves a press through the tab's own setter", () => {
    const set = vi.fn();
    const { container } = render(<SettingsTab {...settingsProps()} spoilerTierSetting={{ value: "strict", set }} />);
    const row = container.querySelector<HTMLElement>('[data-bonsai-spoiler-tier-row="true"]')!;
    expect(buttons(row).map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    fireEvent.click(buttons(row)[2]);
    expect(set).toHaveBeenCalledWith("open");
  });

  it("shows the pick on the section's closed line: the choice, then the switch", () => {
    closeAllSettingsSections();
    const summary = (tier: "strict" | "default" | "open") => {
      const { container, unmount } = render(
        <SettingsTab {...settingsProps()} spoilerTierSetting={{ value: tier, set: () => {} }} />,
      );
      const text = container.querySelector('[data-bonsai-fold-line="spoilers"] .bonsai-fold-line__summary')?.textContent;
      unmount();
      return text;
    };
    expect(summary("strict")).toBe("How much to hide: Hide more · Hide spoilers until I tap on");
    expect(summary("default")).toBe("How much to hide: Default · Hide spoilers until I tap on");
    expect(summary("open")).toBe("How much to hide: Hide less · Hide spoilers until I tap on");
  });
});
