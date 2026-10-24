/**
 * Title: The suggestion chip's size: 26 px tall, words at 11 px
 * Purpose: Pin plan 96 F22 (size half). The Deck measured the two-chip row on 2026-10-17: each chip
 *          147 px wide with 129 px for words that need 140 to 232 px at 12 px, so every long chip
 *          scrolled. The words went to 11 px and the chip from 30 to 26 px tall. Evidence:
 *          workshop:test-evidence/plan96-P96-F22-CHIP-MEASURE.json.
 * Used for: PRESET_CHIP_HEIGHT_PX in presetRowLayout.ts and the chip button in presetChipButton.tsx.
 *           The Show details slot shares the chip's height (DetailsSlot.deck.test.tsx reads the
 *           constant, so it follows this number).
 * Does not: Prove the look on the Deck; the row P96-F22-CHIP-PACE-SIZE and the maintainer's eye decide.
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PresetChipButton } from "./presetChipButton";
import { PRESET_CHIP_HEIGHT_PX } from "./presetRowLayout";
import { textPx } from "../../styles/textPx";

describe("the suggestion chip's size (plan 96 F22)", () => {
  it("is 26 px tall", () => {
    expect(PRESET_CHIP_HEIGHT_PX).toBe(26);
  });

  it("draws its words at 11 px (through the Text size setting) and takes the height as its minimum", () => {
    const view = render(
      <PresetChipButton
        preset={{ text: "How do I beat the boss?", category: "general" }}
        setUnifiedInput={vi.fn()}
        scroll={false}
      />,
    );
    const button = view.container.querySelector<HTMLElement>("button.bonsai-preset-glass");
    expect(button).not.toBeNull();
    expect(button!.style.fontSize).toBe(textPx(11));
    expect(button!.style.minHeight).toBe(`${PRESET_CHIP_HEIGHT_PX}px`);
  });
});
