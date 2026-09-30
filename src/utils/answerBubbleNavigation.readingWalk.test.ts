/**
 * Title: Down and Up read one box at a time, with no press that only scrolls when the stop is already read
 *
 * Purpose: Pin plan 77 helper E, round two, from the Deck run of build bce7d0fd (docs/test-evidence/
 * plan77-P77-WALK-COVERS-MIRROR-FREEPLAY.json and plan77-BLOCK2-GAME.json):
 *
 * Going Down, box 1 (146 px tall, so it fits the 206 px band) landed with its bottom at the dock.
 *    The next press only scrolled the panel 80 px, leaving the ring on box 1 with its top 20 px under
 *    the header, and the press after that landed on box 2. Same for boxes 2 and 3: three more presses
 *    than going Up, and a box half under the header for one press. Now, when the stop the ring is on
 *    is already fully read (its bottom edge is inside the band) and the next section starts below the
 *    dock, one Down brings that section under the header and lands on it. A stop whose bottom is still
 *    under the dock (a tall section being read) keeps its scroll-only presses: that is the reading design.
 * Going Up has the mirror step: the ring's box read from its top, the one above wholly above the header, one
 * Up lands on it (its bottom brought to the dock).
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts): the pane runs y 88 to the dock, a press that only
 * scrolls moves the panel 80 px, Steam's own glide is applied after every press under three rules and
 * under none, and the dock is at 290, 294 (the Deck's 206 px band) and 262 (a game running).
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  THREE_BOXES,
  WALK_RULES,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

const DOCKS = [290, 294, 262];

describe.each(DOCKS)("three boxes, each below the dock once the one above is read, dock at y %i", (dockTop) => {
  describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
    it("Down lands on each next box in one press; Up mirrors it; every landing is fully visible", () => {
      const a = shapedAnswer(THREE_BOXES, rule, dockTop);
      expect(a.enterFromAbove()).toBe(true);

      const down = walkAnswer(a, "down");
      const up = walkAnswer(a, "up");
      if (process.env.WALK_DEBUG) {
        console.log("DOWN", dockTop, rule, down.presses.join(" > "), JSON.stringify(down.problems));
        console.log("UP  ", dockTop, rule, up.presses.join(" > "), JSON.stringify(up.problems));
      }

      expect(down.yielded).toBe(true);
      expect(up.yielded).toBe(true);
      expect(down.problems).toEqual([]);
      expect(up.problems).toEqual([]);
      expect(down.stops).toEqual(["section1", "section2", "section3"]);
      expect(up.stops).toEqual(["section3", "section2", "section1"]);
      // No press that only scrolls: every Down after the entry landed on the next box.
      expect(down.presses).toEqual(down.stops);
      expect(up.presses).toEqual(up.stops);
    });
  });
});

describe("Down reads a box that runs past the dock by scrolling, then moves on", () => {
  it("keeps the scroll-only presses while the ring's box still ends under the dock", () => {
    // Box 1 is 300 px tall in a 202 px band: its bottom is under the dock until the panel has scrolled.
    const a = shapedAnswer({ sections: [[236, 536], [544, 604]], covers: [], start: 92 }, undefined, 290);
    expect(a.enterFromAbove()).toBe(true);

    const down = walkAnswer(a, "down");

    expect(down.problems).toEqual([]);
    expect(down.stops).toEqual(["section1", "section2"]);
    // Scroll-only presses while it is read (the box's bottom was under the dock), then one landing.
    expect(down.presses.filter((name) => name === "section1").length).toBeGreaterThanOrEqual(2);
  });
});
