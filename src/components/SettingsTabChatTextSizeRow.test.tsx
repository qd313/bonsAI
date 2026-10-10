/**
 * Title: Settings tab -- Text size row
 * Purpose: Pin the Text size row: three choices (Small, Normal, Large) in that order, the saved one is
 *          marked, a press saves the choice that was pressed, and the row sits where a person looks
 *          (right under Screenshot quality) in the real Settings tab.
 * Used for: plan 87 F6, the Text size setting.
 * Does not: Draw the chat's words at a new size (see chatTextSize.chat.test.tsx) or walk the D-pad
 *           (see SettingsTab.textSizeWalk.test.tsx).
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettingsTabChatTextSizeRow } from "./SettingsTabChatTextSizeRow";

function buttons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
}

describe("Settings tab Text size row", () => {
  it("shows Small, Normal and Large in that order", () => {
    render(<SettingsTabChatTextSizeRow setting={{ value: "normal", set: () => {} }} />);
    expect(buttons().map((b) => b.textContent)).toEqual(["Small", "Normal", "Large"]);
  });

  it("marks only the saved choice as pressed", () => {
    for (const [saved, index] of [
      ["small", 0],
      ["normal", 1],
      ["large", 2],
    ] as const) {
      const { unmount } = render(<SettingsTabChatTextSizeRow setting={{ value: saved, set: () => {} }} />);
      expect(buttons().map((b) => b.getAttribute("aria-pressed"))).toEqual(
        [0, 1, 2].map((i) => String(i === index)),
      );
      unmount();
    }
  });

  it("saves the choice that was pressed", () => {
    const setChatTextSize = vi.fn();
    render(<SettingsTabChatTextSizeRow setting={{ value: "normal", set: setChatTextSize }} />);
    const [small, , large] = buttons();
    fireEvent.click(large);
    fireEvent.click(small);
    expect(setChatTextSize.mock.calls).toEqual([["large"], ["small"]]);
  });
});
