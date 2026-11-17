/**
 * Title: The model list under the filter strip keeps the drawn columns' room
 *
 * Purpose: Plan 105 (lane D5) takes the filters column away from beside the list, so the list is the box's whole width
 * and board 5's tab 3 draws it with a wider Model column, a Size column with room for "too big for this Deck", a Good
 * for column with room for plain words and a Deck fit column with room for six stars. This works the list's grid out
 * the way the browser does (fixed tracks first, then each `minmax(min, fr)` track takes its share, and a track whose
 * share is under its minimum is held at the minimum), from the numbers the stylesheet itself uses.
 *
 * jsdom has no layout, so the arithmetic is the closest a test gets (docs/lessons-learned.md § 5); the Deck measures
 * the rest (P105-MODELS-BOX-01).
 */
import { describe, expect, it } from "vitest";
import { buildPullModelsStylesheet, PULL_MODELS_ROW_GAP_PX, PULL_MODELS_ROW_PAD_X_PX, PULL_MODELS_TRACKS } from "./gamepadAndPullModels";

/** The list's box on the Deck (plan 92, M-A): the box's content 572.9, less the hub's 4 px right padding. */
const LIST_BOX_PX = 568.9;
/** The Model column the list had on the Deck before the column went in (M-A): the new one must be no narrower. */
const MODEL_BEFORE_PX = 124.3;
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
  const rowInner = LIST_BOX_PX - scrollbarPx - 2 * PULL_MODELS_ROW_PAD_X_PX - ROW_BORDER_PX;
  const [pull, model, size, modes, fit] = resolveGrid(tracks, rowInner, PULL_MODELS_ROW_GAP_PX);
  return { pull, model, size, modes, fit };
}

describe("the model list under the filter strip (Deck numbers from plan 92 M-A, columns from board 5 tab 3)", () => {
  it("gives the Model column more than it had beside the filters column, with and without the Try column", () => {
    expect(listColumns(true).model).toBeGreaterThan(MODEL_BEFORE_PX);
    expect(listColumns(false).model).toBeGreaterThan(MODEL_BEFORE_PX);
  });

  it("still holds the drawn minimums if the list shows a thin scrollbar on the Deck's own screen", () => {
    const c = listColumns(true, 6);
    expect(c.model).toBeGreaterThanOrEqual(PULL_MODELS_TRACKS.model[0]);
    expect(c.modes).toBeGreaterThanOrEqual(PULL_MODELS_TRACKS.modes[0]);
  });

  it("leaves Size room for 'too big for this Deck', Deck fit room for six stars, and Good for room for plain words", () => {
    const c = listColumns(true);
    expect(c.size).toBe(92);
    expect(c.fit).toBe(56);
    expect(c.modes).toBeGreaterThanOrEqual(120);
    // The Try track is exactly what it holds: the place number (14) and two 22 px buttons with 3 px gaps.
    expect(PULL_MODELS_TRACKS.try).toBe(14 + 3 + 22 + 3 + 22);
  });

  it("is the stylesheet's own numbers, with no filters column left in it", () => {
    const css = buildPullModelsStylesheet();
    expect(css).toContain(`minmax(${PULL_MODELS_TRACKS.model[0]}px, ${PULL_MODELS_TRACKS.model[1]}fr)`);
    expect(css).toContain(`minmax(${PULL_MODELS_TRACKS.modes[0]}px, ${PULL_MODELS_TRACKS.modes[1]}fr)`);
    expect(css).toContain(`${PULL_MODELS_TRACKS.size}px`);
    expect(css).toContain(`${PULL_MODELS_TRACKS.try}px`);
    expect(css).not.toContain("bonsai-pullmodels-filtercol");
    expect(css).not.toContain("bonsai-pullmodels-split");
    expect(css).not.toContain("bonsai-pullmodels-col--date");
    expect(css).toContain(".bonsai-pullmodels-strip");
    expect(css).toContain(".bonsai-pullmodels-word");
  });
});
