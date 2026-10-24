/**
 * Title: Picking what sits beside the ring, from numbers alone
 *
 * Purpose: Pins `pickBeside`, the pure choice behind Right and Left in the AI models box, on the Deck's
 * own readings (plan92-P92-M-MODELS-MAP.json): the nearest centre within one and a half model rows
 * (`BESIDE_REACH_ROWS`, about 52 px), nothing when there is none that close, the way back preferred
 * while it is still within reach. The screen-level tests, with the Deck's map laid out and Steam's
 * transfer modelled, are in PullModelsFiltersColumn.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { BESIDE_REACH_ROWS, pickBeside } from "./pullModelsBeside";

const ROW = 34.8;
const REACH = ROW * BESIDE_REACH_ROWS;
/** The list's rows in sight on the Deck, the column at the top of its scroll. */
const STARS = [
  { key: "row:0", y: 280.7 },
  { key: "row:1", y: 315.5 },
  { key: "row:2", y: 350.3 },
];

describe("pickBeside", () => {
  it("reaches one and a half model rows: about 52 px on the Deck", () => {
    expect(REACH).toBeCloseTo(52.2, 1);
  });

  it("picks the nearest centre within reach", () => {
    expect(pickBeside(277.3, STARS, REACH)).toBe("row:0"); // Also try open-weight models, 3 px
    expect(pickBeside(356.3, STARS, REACH)).toBe("row:2"); // Speed, 6 px
    expect(pickBeside(248.8, STARS, REACH)).toBe("row:0"); // Open source only, 32 px above the first star
    expect(pickBeside(380.5, STARS, REACH)).toBe("row:2"); // Strategy, 30 px, the next row out of sight
  });

  it("holds (null) when nothing is within reach, or there is nothing", () => {
    expect(pickBeside(410, STARS, REACH)).toBeNull(); // 60 px below the last star in sight
    expect(pickBeside(300, [], REACH)).toBeNull(); // an empty list
  });

  it("prefers the way back while it is still within reach, and only then", () => {
    // Two stops both near one row: the stop the ring came from wins.
    const stops = [
      { key: "a", y: 300 },
      { key: "b", y: 327 },
    ];
    expect(pickBeside(320, stops, REACH)).toBe("b"); // 7 px against 20
    expect(pickBeside(320, stops, REACH, "a")).toBe("a");
    expect(pickBeside(260, stops, REACH, "b")).toBe("a"); // "b" is 67 px off: out of reach
  });
});
