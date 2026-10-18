import { afterEach, describe, expect, it } from "vitest";
import { setFrozenTestChips, type PresetPrompt } from "./presets";
import {
  advanceCarouselFocus,
  buildInitialCarouselState,
  CAROUSEL_HISTORY_MAX,
  carouselWindowStart,
  clampHistory,
  mergeContextualSeeds,
  nextFrozenHistoryEntry,
  visibleWindowTexts,
} from "./carouselState";
import { PRESET_VISIBLE_SLOTS } from "./presetRowLayout";

function p(text: string): PresetPrompt {
  return { text, category: "test" };
}

describe("carouselState", () => {
  /* Sideways since 2026-09-01: the row is a PRESET_VISIBLE_SLOTS-wide window on the history and
     the focused chip sits at its right edge, so an appended chip slides in from the right. */
  it("carouselWindowStart keeps the focused chip at the right edge of a two-wide window", () => {
    expect(PRESET_VISIBLE_SLOTS).toBe(2);
    expect(carouselWindowStart(0)).toBe(0);
    expect(carouselWindowStart(1)).toBe(0);
    expect(carouselWindowStart(2)).toBe(1);
    expect(carouselWindowStart(4)).toBe(3);
  });

  it("carouselWindowStart takes the window size into account", () => {
    expect(carouselWindowStart(4, 3)).toBe(2);
    expect(carouselWindowStart(1, 3)).toBe(0);
    expect(carouselWindowStart(3, 1)).toBe(3);
  });

  it("visibleWindowTexts is the window around the focused chip, in order", () => {
    const h = [p("a"), p("b"), p("c"), p("d")];
    expect([...visibleWindowTexts(h, 0)]).toEqual(["a", "b"]);
    expect([...visibleWindowTexts(h, 1)]).toEqual(["a", "b"]);
    expect([...visibleWindowTexts(h, 2)]).toEqual(["b", "c"]);
    expect([...visibleWindowTexts(h, 3)]).toEqual(["c", "d"]);
    expect([...visibleWindowTexts(h, 9)]).toEqual([]);
  });

  it("the carousel opens on the first contextual seed, at the left edge", () => {
    expect(buildInitialCarouselState([p("a"), p("b"), p("c")]).focusIndex).toBe(0);
    expect(carouselWindowStart(0)).toBe(0);
  });

  it("clampHistory trims to CAROUSEL_HISTORY_MAX", () => {
    const long = Array.from({ length: 20 }, (_, i) => p(`item-${i}`));
    const clamped = clampHistory(long);
    expect(clamped.length).toBe(CAROUSEL_HISTORY_MAX);
    expect(clamped[0]?.text).toBe("item-15");
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

  it("an appended chip lands in the window and the chip before it stays on screen", () => {
    const h = [p("a"), p("b"), p("c")];
    const end = advanceCarouselFocus(h, 2, p("d"));
    expect([...visibleWindowTexts(end.history, end.focusIndex)]).toEqual(["c", "d"]);
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

  /* Seeds arrive in threes and the row shows two: the first two are on screen after an Ask and
     the third is one step to the right, reached by the next advance or a D-pad Right — not lost. */
  it("after an Ask, two seeds are on screen and the third is one step to the right", () => {
    const history = [p("old1"), p("old2"), p("old3"), p("tail")];
    const triple: [PresetPrompt, PresetPrompt, PresetPrompt] = [p("new1"), p("new2"), p("new3")];
    const merged = mergeContextualSeeds(history, triple, 2);
    expect([...visibleWindowTexts(merged.history, merged.focusIndex)]).toEqual(["new1", "new2"]);
    expect(merged.history[merged.focusIndex + 1]?.text).toBe("new3");
  });

  /*
   * D58 #3: a pinned batch longer than the row could not be reached after the first minute --
   * auto-advance stands down while a chip has focus, so once history filled to CAROUSEL_HISTORY_MAX
   * chips 6+ of a longer batch never came in. Right at the last chip now calls this to pull the
   * next batch entry in directly, the same way Left at the window's edge already pulls an earlier
   * one back via `requestFocus`.
   */
  describe("nextFrozenHistoryEntry (D58 #3: a pinned batch longer than the row)", () => {
    afterEach(() => setFrozenTestChips([]));

    it("returns null when no batch is pinned", () => {
      expect(nextFrozenHistoryEntry([p("a"), p("b")])).toBeNull();
    });

    it("returns null for empty history even with a batch pinned", () => {
      setFrozenTestChips(["q1", "q2", "q3"]);
      expect(nextFrozenHistoryEntry([])).toBeNull();
    });

    it("walks the batch forward from the newest history entry", () => {
      setFrozenTestChips(["q1", "q2", "q3", "q4", "q5"]);
      // As if q1/q2 already scrolled out of a history capped at CAROUSEL_HISTORY_MAX.
      const history = [p("q3"), p("q4")];
      expect(nextFrozenHistoryEntry(history)?.text).toBe("q5");
    });

    it("finds the one entry a capped history has evicted, wrapping past the newest", () => {
      setFrozenTestChips(["q1", "q2", "q3", "q4", "q5", "q6"]);
      // A 6-item batch with a 5-deep history: q1 fell out the front, so it is the only entry not
      // already represented, reached only by wrapping past q6.
      const history = [p("q2"), p("q3"), p("q4"), p("q5"), p("q6")];
      expect(nextFrozenHistoryEntry(history)?.text).toBe("q1");
    });

    it("returns null once the whole (short) batch is already in history", () => {
      setFrozenTestChips(["q1", "q2", "q3"]);
      const history = [p("q1"), p("q2"), p("q3")];
      expect(nextFrozenHistoryEntry(history)).toBeNull();
    });
  });
});
