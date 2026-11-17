import { describe, expect, it } from "vitest";
import { stripRows, stripTarget, type StripStop } from "./pullModelsStripMove";

/** The drawn strip: two switches on the first line, word pills wrapping on the next two. Rects are left, top, width, height. */
const stop = (key: string, left: number, top: number, width = 60, height = 22): StripStop => ({ key, left, top, width, height });
const STOPS: StripStop[] = [
  stop("fits", 0, 0, 254, 30),
  stop("oss", 260, 0, 254, 30),
  stop("chat", 0, 46),
  stop("pictures", 66, 46),
  stop("strategy", 132, 46),
  stop("qwen", 198, 46),
  stop("more", 264, 46, 90),
  stop("custom", 0, 74, 90),
  stop("suggested-a", 96, 74, 120),
];

describe("which stop the D-pad reaches inside the strip", () => {
  it("groups the stops into the lines they are drawn on", () => {
    expect(stripRows(STOPS).map((r) => r.map((s) => s.key))).toEqual([
      ["fits", "oss"],
      ["chat", "pictures", "strategy", "qwen", "more"],
      ["custom", "suggested-a"],
    ]);
  });

  it("moves Right and Left along a line and holds at its ends", () => {
    expect(stripTarget(STOPS, "chat", "right")).toBe("pictures");
    expect(stripTarget(STOPS, "pictures", "left")).toBe("chat");
    expect(stripTarget(STOPS, "more", "right")).toBe("hold");
    expect(stripTarget(STOPS, "chat", "left")).toBe("hold");
    expect(stripTarget(STOPS, "oss", "right")).toBe("hold");
  });

  it("moves Down and Up to the stop on the next line nearest across, not by list order", () => {
    expect(stripTarget(STOPS, "fits", "down")).toBe("pictures"); // centre 127: Pictures (96) is nearer than Strategy (162)
    expect(stripTarget(STOPS, "oss", "down")).toBe("more"); // centre 387: More (309) is the nearest
    expect(stripTarget(STOPS, "strategy", "down")).toBe("suggested-a"); // 162 is nearer 156 than 45
    expect(stripTarget(STOPS, "chat", "down")).toBe("custom");
    expect(stripTarget(STOPS, "pictures", "up")).toBe("fits");
    expect(stripTarget(STOPS, "suggested-a", "up")).toBe("strategy");
  });

  it("hands the press up out of the strip from the first line and down out of it from the last", () => {
    expect(stripTarget(STOPS, "fits", "up")).toBe("out-up");
    expect(stripTarget(STOPS, "oss", "up")).toBe("out-up");
    expect(stripTarget(STOPS, "custom", "down")).toBe("out-down");
    expect(stripTarget(STOPS, "suggested-a", "down")).toBe("out-down");
  });

  it("treats a full-width row, such as the open Type a name field, as a line of its own", () => {
    const open = [...STOPS.slice(0, 7), stop("custom", 0, 74, 568, 28), stop("starter", 0, 108, 150)];
    expect(stripTarget(open, "more", "down")).toBe("custom");
    expect(stripTarget(open, "custom", "down")).toBe("starter");
    expect(stripTarget(open, "custom", "up")).toBe("more"); // nearest centre to the field's middle (284)
  });

  it("holds on a stop it was not given", () => {
    expect(stripTarget(STOPS, "nope", "down")).toBe("hold");
  });
});
