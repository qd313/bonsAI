/**
 * Title: Show details chips at the drawing's size: smaller pills, no caption line
 * Purpose: Pin plan 105's drawing (the density board, tab 1, round 2 option A; docs/demos/mockup-board-2, built from
 *          src/41-chips.js), measured off the built page on 2026-11-17: pills 9.5 px words, 12 px line, 2 by 7 px
 *          padding, 4 px apart, 6 px above and below the grid, no "Behind this answer · N of M" line. The usual eight
 *          short-named chips, at the widths the drawing measures in Steam's font, wrap into three rows in the 287 px
 *          column (four, three, one), and the room the chips take above the open box is the drawing's 73 px (74 with
 *          the Deck's whole-pixel borders), against 213 px before.
 * Used for: ContextChipLadder.tsx's chip and grid styles and chipLadderGrid.ts's gap, laid out by the Deck-shaped pane
 *           (deckChipLadderPane.ts), which reads the grid's sizes off the ladder's own styles.
 * Does not: Measure real text: the chip widths are the drawing's, fed in by label. A layout engine is not available
 *           here, so the nearest this gets to the Deck's screen is the drawn styles and the pane's arithmetic on them.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContextChipLadder } from "./ContextChipLadder";
import type { ContextChip, TransparencySnapshot } from "../../../types/inputTransparency";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";
import { deckChipLadderPane } from "../../../test-harness/deckChipLadderPane";

/* The drawing's usual eight chips and their widths, read off the built board (each pill's own box, scale 1). */
const DRAWN: Array<[short: string, width: number]> = [
  ["KB search", 59.5],
  ["14 sections", 65.4],
  ["TDP 12 W", 58.2],
  ["Balanced", 56.5],
  ["Thought 16 s", 73.8],
  ["Spoilers: high", 76.2],
  ["gemma4:e2b", 74.5],
  ["Developer", 61.2],
];

function chips(): ContextChip[] {
  return DRAWN.map(([short], i) => ({
    id: `chip-${i}`,
    rank: i + 1,
    label: `${short} (full wording)`,
    short_label: short,
    attached: true,
    tier_class: "",
    body: { title: short, paths: [], bullets: [] },
  }));
}

function mount() {
  const scene = deckChipLadderPane({
    ladderDocTop: 300,
    rowWidth: 287.2,
    scrollTop: 0,
    chipWidths: Object.fromEntries(DRAWN),
    boxHeights: Object.fromEntries(DRAWN.map(([short]) => [short, 60])),
  });
  const snapshot = { context_chips: chips() } as unknown as TransparencySnapshot;
  const ui = <ContextChipLadder snapshot={snapshot} />;
  const { container, rerender } = render(ui, { container: scene.host });
  const ladder = container.querySelector<HTMLElement>(".bonsai-chip-ladder")!;
  scene.install(ladder);
  act(() => rerender(ui));
  scene.install(ladder);
  return { scene, ladder };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the chips at the drawing's size", () => {
  it("draws the pills and the grid with the drawing's numbers", () => {
    const { ladder } = mount();
    const chip = ladder.querySelector<HTMLElement>(".bonsai-chip-ladder-chip")!;
    expect(chip.style.fontSize).toContain("9.5px");
    expect(chip.style.lineHeight).toBe("12px");
    expect(chip.style.padding).toBe("2px 7px");
    const grid = ladder.querySelector<HTMLElement>(".bonsai-chip-ladder-grid")!;
    expect(grid.style.gap).toBe("4px");
    expect(grid.style.marginBottom).toBe("6px");
    expect(ladder.style.marginTop).toBe("6px");
  });

  it("draws no counting line above the chips", () => {
    const { ladder } = mount();
    expect(ladder.textContent).not.toMatch(/Behind this answer|\d+ of \d+/);
    expect(ladder.querySelector(".bonsai-chip-ladder-grid")?.previousElementSibling ?? null).toBeNull();
  });

  it("wraps the usual eight into three short rows, four, three and one, as the drawing does", () => {
    const { scene } = mount();
    expect(scene.rowCount()).toBe(3);
    const rowOf = new Map(DRAWN.map(([short]) => [short, scene.chipBox(short).top]));
    const tops = [...new Set(rowOf.values())];
    expect(DRAWN.map(([short]) => tops.indexOf(rowOf.get(short)!))).toEqual([0, 0, 0, 0, 1, 1, 1, 2]);
  });

  it("takes the drawing's room above the open box: 74 px with whole-pixel borders (73 drawn), not 213", () => {
    const { scene } = mount();
    expect(scene.roomAboveBox()).toBeCloseTo(74, 1);
  });
});
