import { describe, expect, it } from "vitest";
import type { PresetPrompt } from "../../data/presets";
import {
  advanceCarouselFocus,
  CAROUSEL_HISTORY_MAX,
  CAROUSEL_ROW_HEIGHT_PX,
  carouselTrackOffsetPx,
  clampHistory,
  mergeContextualSeeds,
} from "./carouselState";

function p(text: string): PresetPrompt {
  return { text, category: "test" };
}

describe("carouselState", () => {
  it("carouselTrackOffsetPx centers focus row", () => {
    expect(carouselTrackOffsetPx(0)).toBe(0);
    expect(carouselTrackOffsetPx(1)).toBe(0);
    expect(carouselTrackOffsetPx(2)).toBe(CAROUSEL_ROW_HEIGHT_PX);
    expect(carouselTrackOffsetPx(4)).toBe(3 * CAROUSEL_ROW_HEIGHT_PX);
  });

  it("clampHistory trims to CAROUSEL_HISTORY_MAX", () => {
    const long = Array.from({ length: 20 }, (_, i) => p(`item-${i}`));
    const clamped = clampHistory(long);
    expect(clamped.length).toBe(CAROUSEL_HISTORY_MAX);
    expect(clamped[0]?.text).toBe("item-8");
  });

  it("advanceCarouselFocus increments until end then appends", () => {
    const h = [p("a"), p("b"), p("c")];
    const mid = advanceCarouselFocus(h, 0, p("d"));
    expect(mid.focusIndex).toBe(1);
    expect(mid.history).toHaveLength(3);

    const end = advanceCarouselFocus(h, 2, p("d"));
    expect(end.focusIndex).toBe(3);
    expect(end.history.map((x) => x.text)).toEqual(["a", "b", "c", "d"]);
  });

  it("mergeContextualSeeds skips when focus window already matches", () => {
    const triple: [PresetPrompt, PresetPrompt, PresetPrompt] = [p("a"), p("b"), p("c")];
    const history = [...triple, p("older")];
    const merged = mergeContextualSeeds(history, triple, 1);
    expect(merged.history).toBe(history);
    expect(merged.focusIndex).toBe(1);
  });

  it("mergeContextualSeeds updates window without resetting focus to 0", () => {
    const history = [p("old1"), p("old2"), p("old3"), p("tail")];
    const triple: [PresetPrompt, PresetPrompt, PresetPrompt] = [
      p("new1"),
      p("new2"),
      p("new3"),
    ];
    const merged = mergeContextualSeeds(history, triple, 2);
    expect(merged.focusIndex).toBe(2);
    expect(merged.history[1]?.text).toBe("new1");
    expect(merged.history[2]?.text).toBe("new2");
    expect(merged.history[3]?.text).toBe("new3");
    expect(merged.history[0]?.text).toBe("old1");
  });
});
