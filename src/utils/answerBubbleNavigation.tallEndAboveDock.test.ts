/**
 * Title: Up onto a section taller than the screen never leaves just a sliver of it showing at the top
 *
 * Purpose: Pin plan 81 helper K, step K2b (roadmap Bugs: "Walking Up can land on a section taller than the
 * screen with only a sliver of it showing at the top", found in the test setup in plan 78, 1 to 8 px showing).
 * A section taller than the room above the dock is entered going Up from its end: the walk brings its bottom
 * edge to the dock so it is read upward (`revealTallFromItsEnd`). That only ever scrolled when the end was
 * hidden behind the dock. A tall section whose end sat ABOVE the dock, the usual shape when the section below
 * has been read from its top and the panel stands just past the tall one, was left where it was: 5 px of it
 * showing under the header, the ring on it. Now an end that sits more than 4 px above the dock is brought
 * down to the dock too (never past scrollTop 0), so the last lines show above the dock.
 *
 * Built the way the Deck is (deckAnswerWalk.ts): the no-game pane (88 to 454, dock 290) and the game's page
 * (128 to 534, dock 330), a 400 px section above a short one, Steam's scroll under each modelled rule with its
 * top margin on, and a bounded whole walk over two tall sections.
 *
 * Does not: change Up from the first word inside a tall section (answerBubbleNavigation.tallUpFromWord.test.ts:
 * its top goes to the pane top) or a section that fits the band.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  WALK_RULES,
  deckAnswer,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
  type AnswerShape,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

const SCREENS = [
  { name: "no game (pane 88 to 454, dock 290)", paneTop: 88, paneBottom: 454, dockTop: 290 },
  { name: "a game running (pane 128 to 534, dock 330)", paneTop: 128, paneBottom: 534, dockTop: 330 },
];

describe.each(SCREENS)("Up onto a 400 px section, $name", (screen) => {
  const { paneTop, dockTop } = screen;
  /** A 400 px section above a short one, the panel set so the tall one's bottom is `endAt` y. */
  const build = (rule: (typeof WALK_RULES)[number], endAt: number, tallTop = 300) => {
    const a = deckAnswer([[tallTop, tallTop + 400], [tallTop + 400, tallTop + 460]], tallTop + 400 - endAt, rule, {
      dockTop,
      paneTop,
      paneBottom: screen.paneBottom,
      steamTopMargin: true,
    });
    a.land(a.stops[1]!); // Steam's glide and the lift may move the panel; the test then sets it back
    a.pane.scrollTop = tallTop + 400 - endAt;
    return a;
  };
  const end = (a: ReturnType<typeof build>) => a.bottom(a.stops[0]!);

  describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
    it.each([5, 12, 60, 150])("its end %i px under the header comes down to the dock", (under) => {
      const a = build(rule, paneTop + under);
      const before = a.bottom(a.stops[0]!);
      expect(before).toBe(paneTop + under); // the sliver or short stretch showing, as in the roadmap entry

      expect(a.up()).toBe(true);
      expect(document.activeElement).toBe(a.stops[0]);
      expect(end(a)).toBeGreaterThanOrEqual(dockTop - 8);
      expect(end(a)).toBeLessThanOrEqual(dockTop + 4);
    });
  });

  it("leaves an end already at the dock where it is", () => {
    const a = build(undefined, dockTop);
    const st = a.pane.scrollTop;
    expect(a.up()).toBe(true);
    expect(a.pane.scrollTop).toBe(st);
  });

  it("an end hidden behind the dock is still brought up to it (the older rule, unchanged)", () => {
    const a = build(undefined, dockTop + 70);
    expect(a.up()).toBe(true);
    expect(end(a)).toBe(dockTop);
  });

  it("never scrolls past the top of the page: with 5 px to give it moves 5 px, however far the end is from the dock", () => {
    const bottom = dockTop - 10; // page coordinates, so the page's first 5 px are all there is to scroll back
    const a = deckAnswer([[bottom - 280, bottom], [bottom, bottom + 60]], 5, undefined, {
      dockTop,
      paneTop,
      paneBottom: screen.paneBottom,
    });
    a.land(a.stops[1]!);
    a.pane.scrollTop = 5;
    expect(a.bottom(a.stops[0]!)).toBe(bottom - 5);
    expect(a.up()).toBe(true);
    expect(a.pane.scrollTop).toBe(0);
  });
});

/** Two sections each taller than the room, then a short one: walked Up from the row under the answer. */
const TWO_TALL: AnswerShape = {
  sections: [[300, 580], [580, 860], [860, 930]],
  covers: [],
  start: 640,
};

describe.each(SCREENS)("a whole walk Up through two tall sections, $name", (screen) => {
  describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
    it("lands each tall section end first, visits every stop once, and ends", () => {
      const a = shapedAnswer(TWO_TALL, rule, screen.dockTop, {
        paneTop: screen.paneTop,
        paneBottom: screen.paneBottom,
        steamTopMargin: true,
      });
      expect(a.enterFromBelow()).toBe(true);
      const first = a.label(document.activeElement);
      expect(first).toBe("section3");

      const up = walkAnswer(a, "up", 40);
      expect(up.yielded).toBe(true);
      expect(up.problems).toEqual([]);
      expect(up.landings).toEqual(["section3", "section2", "section1"]);
      // Bounded: no section is read for ever, the walk is a handful of presses.
      expect(up.presses.length).toBeLessThan(30);
    });
  });
});
