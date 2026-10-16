/**
 * Title: The filters column leaves the model list room for every column but Date
 *
 * Purpose: Plan 91 (M1) puts the filters column beside the model list in the AI models box. The box is
 * a fixed size, so the column's width comes out of the list's. This works the list's grid out the way
 * the browser does (fixed tracks first, then each `minmax(min, fr)` track takes its share, and a track
 * whose share is under its minimum is held at the minimum), from the numbers the stylesheet itself uses,
 * and checks the Deck check's line: the Model column no more than 10 per cent narrower than the 124.3 it
 * was on the Deck before the column (plan 92, M-A: workshop:test-evidence/plan92-P92-M-MODELS-BOX.json).
 *
 * jsdom has no layout, so the arithmetic is the closest a test gets (docs/lessons-learned.md § 5); the
 * Deck measures the rest (P91-MODELS-WIDTH).
 */
import { describe, expect, it } from "vitest";
import {
  buildPullModelsStylesheet,
  PULL_MODELS_FILTER_COLUMN_PX,
  PULL_MODELS_ROW_GAP_PX,
  PULL_MODELS_ROW_PAD_X_PX,
  PULL_MODELS_SPLIT_GAP_PX,
  PULL_MODELS_TRACKS,
} from "../styles/sections/gamepadAndPullModels";

/** The list's box on the Deck before the column (M-A): the box's content 572.9, less the hub's 4 px right padding. */
const LIST_BOX_BEFORE_PX = 568.9;
/** Today's Model column (M-A), and the Deck check's floor: no more than 10 per cent narrower. */
const MODEL_BEFORE_PX = 124.3;
const MODEL_FLOOR_PX = MODEL_BEFORE_PX * 0.9;
/** An installed row's left border (2 px), inside the row's box. */
const ROW_BORDER_PX = 2;

type Track = number | readonly [number, number];

/** The browser's grid sizing for fixed and minmax(min, fr) tracks in a row of `width`. */
function resolveGrid(tracks: Track[], width: number, gap: number): number[] {
  const sizes = tracks.map((t) => (typeof t === "number" ? t : NaN));
  let free = width - gap * (tracks.length - 1) - sizes.filter((n) => !Number.isNaN(n)).reduce((a, b) => a + b, 0);
  const flexible = new Set(tracks.map((t, i) => (typeof t === "number" ? -1 : i)).filter((i) => i >= 0));
  for (;;) {
    const frTotal = [...flexible].reduce((sum, i) => sum + (tracks[i] as readonly [number, number])[1], 0);
    const perFr = free / frTotal;
    const held = [...flexible].filter((i) => (tracks[i] as readonly [number, number])[0] > perFr * (tracks[i] as readonly [number, number])[1]);
    if (held.length === 0) {
      for (const i of flexible) sizes[i] = perFr * (tracks[i] as readonly [number, number])[1];
      return sizes;
    }
    for (const i of held) {
      sizes[i] = (tracks[i] as readonly [number, number])[0];
      free -= sizes[i];
      flexible.delete(i);
    }
  }
}

function listColumns(withTry: boolean, scrollbarPx = 0) {
  const t = PULL_MODELS_TRACKS;
  const tracks: Track[] = [t.pull, t.model, t.size, t.modes, t.fit, ...(withTry ? [t.try] : []), t.del];
  const listWidth = LIST_BOX_BEFORE_PX - PULL_MODELS_FILTER_COLUMN_PX - PULL_MODELS_SPLIT_GAP_PX - scrollbarPx;
  const rowInner = listWidth - 2 * PULL_MODELS_ROW_PAD_X_PX - ROW_BORDER_PX;
  const [pull, model, size, modes, fit] = resolveGrid(tracks, rowInner, PULL_MODELS_ROW_GAP_PX);
  return { pull, model, size, modes, fit };
}

describe("the model list beside the filters column (Deck numbers from plan 92 M-A)", () => {
  it("keeps the Model column within 10 per cent of today's 124.3, with and without the Try column", () => {
    expect(listColumns(true).model).toBeGreaterThanOrEqual(MODEL_FLOOR_PX);
    expect(listColumns(false).model).toBeGreaterThanOrEqual(MODEL_FLOOR_PX);
    // Not sitting on the line: a pixel of rounding on the Deck must not fail the check.
    expect(listColumns(true).model).toBeGreaterThanOrEqual(MODEL_BEFORE_PX * 0.93);
  });

  it("still holds the floor if the list shows a thin scrollbar on the Deck's own screen", () => {
    expect(listColumns(true, 6).model).toBeGreaterThanOrEqual(MODEL_FLOOR_PX);
  });

  it("leaves Size room for '10.4 GB', Deck fit room for six stars, and Modes room for a short word per line", () => {
    const c = listColumns(true);
    expect(c.size).toBeGreaterThanOrEqual(34);
    expect(c.fit).toBeGreaterThanOrEqual(40);
    expect(c.modes).toBeGreaterThanOrEqual(44);
    // The Try track is exactly what it holds: the place number (14) and two 22 px buttons with 3 px gaps.
    expect(PULL_MODELS_TRACKS.try).toBe(14 + 3 + 22 + 3 + 22);
  });

  it("keeps the column inside the brief's 170 to 196 px, and the stylesheet uses these very numbers", () => {
    expect(PULL_MODELS_FILTER_COLUMN_PX).toBeGreaterThanOrEqual(170);
    expect(PULL_MODELS_FILTER_COLUMN_PX).toBeLessThanOrEqual(196);
    const css = buildPullModelsStylesheet();
    expect(css).toContain(`flex: 0 0 ${PULL_MODELS_FILTER_COLUMN_PX}px`);
    expect(css).toContain(`gap: ${PULL_MODELS_SPLIT_GAP_PX}px`);
    expect(css).toContain(`minmax(${PULL_MODELS_TRACKS.model[0]}px, ${PULL_MODELS_TRACKS.model[1]}fr)`);
    expect(css).toContain(`${PULL_MODELS_TRACKS.try}px`);
    expect(css).not.toContain("bonsai-pullmodels-col--date");
    expect(css).not.toContain("bonsai-pullmodels-filterpanel");
  });
});
