/**
 * Title: The floating Open all button never covers a row's words or arrow (plan 93, the Deck's own boxes)
 * Purpose: Replay the Deck measurement of 2026-10-13 (docs/test-evidence/plan93-P93-M2-OPEN-ALL.json, the Deck's
 *          own screen: the pane 24..454, 430 tall; the column 48..348): with every section open and the pane
 *          scrolled to 419, the button (74 x 28, 8 px above the pane's bottom, 10 in from the right) sat over
 *          56 x 14 px of the Connection tuning line's summary and 10 x 14 px of its arrow. With the stylesheet as it
 *          is, the part of that line still on view under the button is 0 x 0: a band of the panel's own colour,
 *          as tall as the button and its gaps, is painted across the whole width behind it, so a row reaching
 *          the bottom goes under the band, never under the button alone. And the tab's room at its end is taller
 *          than that band, so the last line can always be scrolled clear of it and read.
 * Used for: foldedTabs.ts (the dock's band and the tail), FoldAllButton.tsx (its height).
 * Does not: Walk the D-pad: the three tabs' foldedWalk tests check the same at every place their walk puts the pane.
 */
import { describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { FOLD_ALL_HEIGHT_PX, stripHeightFor } from "../../styles/sections/foldedTabs";
import { coveredOnView, foldAllButtonBox, foldDockPaint, lineWordBoxes, paintedFrom } from "../../test-harness/foldAllCover";

/** The Deck's own screen (plan93-P93-M2-OPEN-ALL.json). */
const PANE_TOP = 24;
const PANE_BOTTOM = 454;
const COLUMN = { left: 48, right: 348 };
/** The Connection tuning line at pane scrollTop 419: its words at 192..320 and arrow at 326..336, both from y 427. */
const TUNING_LINE = { left: COLUMN.left, top: 417, right: COLUMN.right, bottom: 451 };

describe("the Open all button over the Deck's own pane, every section open, scrolled to 419", () => {
  it("sits where the Deck measured it: 74 x 28, its bottom 8 px above the pane's, 10 px in from the right", () => {
    const b = foldAllButtonBox(PANE_BOTTOM, 0, COLUMN.right);
    expect(b).toEqual({ left: 264, top: 418, right: 338, bottom: 446 });
    expect(FOLD_ALL_HEIGHT_PX).toBe(28);
  });

  it("covers none of the Connection tuning line's words or arrow that is still on view (the Deck: 56 x 14 and 10 x 14)", () => {
    const [words, arrow] = lineWordBoxes(TUNING_LINE);
    /* The model puts the line's words where the Deck saw them. */
    expect(words).toEqual({ left: 192, top: 427, right: 320, bottom: 441 });
    expect(arrow).toEqual({ left: 326, top: 427, right: 336, bottom: 441 });
    const button = foldAllButtonBox(PANE_BOTTOM, 0, COLUMN.right);
    const shownTo = paintedFrom(PANE_BOTTOM, 0, COLUMN.right);
    expect(coveredOnView(words!, button, PANE_TOP, shownTo)).toEqual({ w: 0, h: 0 });
    expect(coveredOnView(arrow!, button, PANE_TOP, shownTo)).toEqual({ w: 0, h: 0 });
  });

  it("with the help strip showing (one to six lines), the band rides up with the button and still covers nothing on view", () => {
    for (const strip of [1, 2, 3, 4, 5, 6].map(stripHeightFor)) {
      const button = foldAllButtonBox(PANE_BOTTOM, strip, COLUMN.right);
      const shownTo = paintedFrom(PANE_BOTTOM, strip, COLUMN.right);
      for (let top = PANE_TOP - 34; top <= PANE_BOTTOM; top += 1) {
        const line = { left: COLUMN.left, top, right: COLUMN.right, bottom: top + 34 };
        for (const box of [line, ...lineWordBoxes(line)]) {
          expect(coveredOnView(box, button, PANE_TOP, shownTo), `strip ${strip}, a line at ${top}`).toEqual({ w: 0, h: 0 });
        }
      }
    }
  });

  it("the band behind the button is opaque, spans the whole width, and starts a gap above the button", () => {
    const d = foldDockPaint();
    expect(d.bandOpaque).toBe(true);
    expect(d.bandPadTop).toBeGreaterThanOrEqual(d.marginBottom);
  });

  it("the tab's room at its end is taller than the band, so the last line scrolls clear of it", () => {
    const css = buildBonsaiScopeStylesheet();
    const tail = parseFloat(/\.bonsai-fold-tail \{[^}]*height:\s*([\d.]+)px/.exec(css)?.[1] ?? "0");
    const band = PANE_BOTTOM - paintedFrom(PANE_BOTTOM, 0, COLUMN.right);
    expect(band).toBe(44);
    expect(tail).toBeGreaterThan(band);
  });

  it("the band stays inside Steam's own 80 px at the pane's bottom, so a ringed row is never under it", () => {
    expect(PANE_BOTTOM - paintedFrom(PANE_BOTTOM, 0, COLUMN.right)).toBeLessThan(80);
  });
});
