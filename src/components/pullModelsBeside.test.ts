/**
 * Title: Picking what sits beside the ring, from numbers alone
 *
 * Purpose: Pins `pickBeside`, the pure choice behind Right and Left in the AI models box, on the Deck's
 * own readings (plan92-P92-M-MODELS-MAP.json): the nearest centre within half a row, nothing when the
 * nearest is further, the way back preferred while it is still level. The screen-level tests, with the
 * Deck's map laid out and Steam's transfer modelled, are in PullModelsFiltersColumn.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { pickBeside } from "./pullModelsBeside";

const HALF_ROW = 34.8 / 2;
/** The list's rows in sight on the Deck, the column at the top of its scroll. */
const STARS = [
  { key: "row:0", y: 280.7 },
  { key: "row:1", y: 315.5 },
  { key: "row:2", y: 350.3 },
];

describe("pickBeside", () => {
  it("picks the nearest centre within half a row", () => {
    expect(pickBeside(277.3, STARS, HALF_ROW)).toBe("row:0"); // Also try open-weight models
    expect(pickBeside(356.3, STARS, HALF_ROW)).toBe("row:2"); // Speed
  });

  it("holds (null) when the nearest is further than half a row, or there is nothing", () => {
    expect(pickBeside(248.8, STARS, HALF_ROW)).toBeNull(); // Open source only: 32 px above the first star
    expect(pickBeside(380.5, STARS, HALF_ROW)).toBeNull(); // Strategy, with the next row out of sight
    expect(pickBeside(300, [], HALF_ROW)).toBeNull(); // an empty list
  });

  it("prefers the way back while it is still within reach, and only then", () => {
    // Between two stops a row's centre may be nearer the other one: the stop the ring came from wins.
    const stops = [
      { key: "a", y: 300 },
      { key: "b", y: 327 },
    ];
    expect(pickBeside(314, stops, HALF_ROW)).toBe("b"); // 13 px against 14
    expect(pickBeside(314, stops, HALF_ROW, "a")).toBe("a");
    expect(pickBeside(290, stops, HALF_ROW, "b")).toBe("a"); // "b" is 37 px off: not level any more
  });
});
