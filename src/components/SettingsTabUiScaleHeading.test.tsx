/**
 * Title: Settings tab -- the UI scale heading appears once
 * Purpose: Pin the roadmap bug "The UI scale section says UI scale twice": the section's title and a
 *          second line right under it both read "UI scale". Keep one. Folded (plan 92 T1) the title is the
 *          section's line and nothing inside the section repeats it.
 * Used for: SettingsTab's UI scale section (drawn when the Developer tab is on).
 * Does not: Check the rest of the section, which is left alone.
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { SettingsTab } from "./SettingsTab";
import { settingsProps } from "./ringTestProps";
import { openAllSettingsSections } from "../test-harness/settingsFoldOpen";

beforeEach(() => openAllSettingsSections());

describe("UI scale section heading", () => {
  it("says UI scale exactly once, with the section open", () => {
    const { container } = render(<SettingsTab {...settingsProps()} showDeveloperTab />);
    const exact = Array.from(container.querySelectorAll("*")).filter(
      (el) => el.children.length === 0 && el.textContent?.trim() === "UI scale",
    );
    const titled = Array.from(container.querySelectorAll('[title="UI scale"]'));
    expect(exact.length + titled.length).toBe(1);
  });
});
