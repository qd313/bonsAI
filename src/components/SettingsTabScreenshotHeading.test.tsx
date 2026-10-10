/**
 * Title: Settings tab -- the Screenshot quality heading appears once
 * Purpose: Pin the roadmap bug "The Screenshot quality section says "Screenshot quality" twice": the
 *          section's title and a second line right under it both read "Screenshot quality". Keep one.
 * Used for: SettingsTab, the Screenshot quality section (drawn with the Developer tab on and off).
 * Does not: Check the rest of the section or its D-pad walk; the walk test in SettingsTab.textSizeWalk
 *           covers the stops.
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

describe("Screenshot quality section heading", () => {
  for (const showDeveloperTab of [false, true]) {
    it(`says Screenshot quality exactly once with the Developer tab ${showDeveloperTab ? "on" : "off"}`, () => {
      const { container } = render(<SettingsTab {...settingsProps()} showDeveloperTab={showDeveloperTab} />);
      const exact = Array.from(container.querySelectorAll("*")).filter(
        (el) => el.children.length === 0 && el.textContent?.trim() === "Screenshot quality",
      );
      const titled = Array.from(container.querySelectorAll('[title="Screenshot quality"]'));
      expect(exact.length + titled.length).toBe(1);
    });
  }
});
