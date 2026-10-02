/**
 * Title: A box Up lands on, coming into an answer from below, stays clear of the dock after Steam's glide
 *
 * Purpose: Pin plan 79 helper AC round 2, from the Deck (build 49fc8894,
 * docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-NEWEST-CLOSED.json and
 * screenshots/DeckCapture_20261002_174703_auto.png): walking Up into an older open answer from its Read
 * aloud row, the last section ("You gotta punish...", 30 px) took the ring 0% visible, at y 336 to 366
 * behind the question box, and the next Up left the section above it 67% behind the dock. Walking Down
 * the same section showed.
 *
 * The walk places a box as it lands, but Steam glides the panel a moment after the press, and the dock
 * lift (useDockClearanceOnFocus.ts) leaves answer sections to the walk, so nothing put the box back. The
 * glide is modelled here as the Deck measured it on 2026-09-06 (revealBelowDock's note in
 * answerBubbleBandGeometry.ts): the whole answer bubble scrolled "nearest", which for a bubble taller than
 * the pane puts its bottom on the pane's bottom, under the dock. Then the timers run, as a second on the
 * Deck would, and the box must be wholly in the band, with each of the harness's own glide rules too and
 * both dock heights.
 *
 * Does not: prove which of Steam's moves the Deck made; it proves the landing is put back after any glide
 * that leaves it under the dock, which is what the Deck check looks at.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PANE_TOP,
  WALK_DOCKS,
  WALK_RULES,
  resetDeckAnswerWalk,
  shapedAnswer,
  type AnswerShape,
} from "../test-harness/deckAnswerWalk";

const PANE_BOTTOM = 366;

beforeEach(() => {
  resetDeckAnswerWalk();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** The Deck's older answer: two short sections, then the 30 px last one. */
const OLDER_ANSWER: AnswerShape = {
  sections: [[300, 420], [428, 560], [568, 598]],
  covers: [],
  start: 0,
};

describe.each(WALK_DOCKS)("Up into an answer from below, dock at y %i", (dockTop) => {
  describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
    it("the last section, then the one above it, end wholly clear of the dock once Steam's glide is over", () => {
      const a = shapedAnswer(OLDER_ANSWER, rule, dockTop);
      const inBand = (el: HTMLElement) => a.top(el) >= PANE_TOP - 1 && a.bottom(el) <= dockTop + 4;
      /* Steam's late glide: the bubble "nearest", its bottom on the pane's bottom. */
      const bubbleGlide = () => {
        const over = a.bottom(a.bubble) - PANE_BOTTOM;
        if (a.bottom(a.bubble) - a.top(a.bubble) > PANE_BOTTOM - PANE_TOP || over > 0) a.pane.scrollTop += over;
      };
      // The ring is on the Read aloud row under the answer; the answer's end sits just above it.
      a.pane.scrollTop = OLDER_ANSWER.sections[2]![1] - dockTop + 40;

      expect(a.enterFromBelow()).toBe(true);
      expect(a.label(document.activeElement)).toBe("section3");
      bubbleGlide();
      vi.advanceTimersByTime(1000);
      expect(inBand(a.stops[2]!)).toBe(true);

      expect(a.up()).toBe(true);
      expect(a.label(document.activeElement)).toBe("section2");
      bubbleGlide();
      vi.advanceTimersByTime(1000);
      expect(inBand(a.stops[1]!)).toBe(true);
    });
  });
});
