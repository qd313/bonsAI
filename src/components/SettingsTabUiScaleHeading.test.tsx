/**
 * Title: Settings tab -- the UI scale heading appears once
 * Purpose: Pin the roadmap bug "The UI scale section says UI scale twice": the section's title and a
 *          second line right under it both read "UI scale". Keep one.
 * Used for: SettingsTabUiScaleSection (drawn when the Developer tab is on).
 * Does not: Check the rest of the section, which is left alone.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsTabUiScaleSection } from "./SettingsTabUiScaleSection";

describe("UI scale section heading", () => {
  it("says UI scale exactly once", () => {
    const { container } = render(
      <SettingsTabUiScaleSection
        uiScaleAutoEnabled={true}
        uiScaleManualProfile="handheld"
        appliedProfileId="handheld"
        onApply={() => {}}
        applyButtonRef={{ current: null }}
        onMoveDownFromApply={() => true}
      />,
    );
    const exact = Array.from(container.querySelectorAll("*")).filter(
      (el) => el.children.length === 0 && el.textContent?.trim() === "UI scale",
    );
    const titled = Array.from(container.querySelectorAll('[title="UI scale"]'));
    expect(exact.length + titled.length).toBe(1);
  });
});
