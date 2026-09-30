/**
 * Title: A whole answer walked Down and then Up: same stops, every one fully on screen
 *
 * Purpose: Pin plan 77 helper E, bug 2, from a Deck run of build 4af8e7a1 on 2026-09-29 (plan 76,
 * block 3, docs/test-evidence/plan76-REPLY-STOPS-MIRROR-01-try2.json): a section's box was a stop Down
 * visited after a scroll and Up skipped. The maintainer's call (2026-09-29) is that Up stops on it
 * too, so a walk Down and a walk Up visit exactly the same stops.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts): the pane runs y 88 (under the tab header) to the
 * dock's top, a press that only scrolls moves the panel 80 px, and after every press Steam's own glide
 * to the stop that took focus is applied, under three different rules and under none. Each answer is
 * walked with the dock at the Deck's 290 and at 262 (a game running lifts its action row).
 *
 * Rules checked on every landing in both directions: the stop is fully inside the readable band, or,
 * when it is taller than the band, its top edge is inside it (going Up a section taller than the band
 * is read from its end, see `fullyVisible`); no press is dead; no press leaves the ring in place while the
 * panel goes the wrong way; and no stop is visited twice in one direction.
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEEP_COVER,
  SOUL_SANCTUM,
  THREE_COVERS,
  TWO_COVERS_IN_ONE_SECTION,
  WALK_DOCKS,
  WALK_RULES,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

describe.each([
  ["Soul Sanctum", SOUL_SANCTUM],
  ["three covers", THREE_COVERS],
  ["two covers in one section", TWO_COVERS_IN_ONE_SECTION],
])("Down to the end of the %s answer, then Up back to the top", (_name, shape) => {
  describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
    describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
      it("visits the same stops both ways and every landing is fully visible", () => {
        const a = shapedAnswer(shape, rule, dockTop);
        expect(a.enterFromAbove()).toBe(true);
        const entry = a.label(document.activeElement);

        const down = walkAnswer(a, "down");
        const up = walkAnswer(a, "up");
        if (process.env.WALK_DEBUG) {
          console.log("DOWN", dockTop, rule, down.presses.join(" > "));
          console.log("UP  ", dockTop, rule, up.presses.join(" > "));
          console.log("PROB", dockTop, rule, JSON.stringify([...down.problems, ...up.problems]));
        }

        expect(down.yielded).toBe(true);
        expect(up.yielded).toBe(true);
        expect(down.problems).toEqual([]);
        expect(up.problems).toEqual([]);
        // No stop is visited twice in one direction.
        expect(new Set(down.stops).size).toBe(down.stops.length);
        expect(new Set(up.stops).size).toBe(up.stops.length);
        // The walk Up is the walk Down backwards, from the last stop to the first.
        expect(up.stops).toEqual([...down.stops].reverse());
        expect(down.stops[0]).toBe(entry);
      });

      it("visits the same stops when the walk Up comes first, from the end of the answer", () => {
        const a = shapedAnswer(shape, rule, dockTop);
        // The ring comes from the row below the answer, so the panel is scrolled to the answer's end.
        a.pane.scrollTop = shape.sections[shape.sections.length - 1]![1] - dockTop + 8;
        expect(a.enterFromBelow()).toBe(true);

        const up = walkAnswer(a, "up");
        const down = walkAnswer(a, "down");
        if (process.env.WALK_DEBUG) {
          console.log("UP1 ", dockTop, rule, up.presses.join(" > "));
          console.log("DOWN", dockTop, rule, down.presses.join(" > "));
          console.log("PROB", dockTop, rule, JSON.stringify([...up.problems, ...down.problems]));
        }

        expect(up.yielded).toBe(true);
        expect(down.yielded).toBe(true);
        expect(up.problems).toEqual([]);
        expect(down.problems).toEqual([]);
        expect(down.stops).toEqual([...up.stops].reverse());
      });
    });
  });
});

/*
 * A cover deep inside a section taller than the band. The ring enters that section on its box, reads
 * down to the cover, and a scroll past it hands the ring back to the box; the box's top is then far
 * above the screen, by design, and going Up the walk may not stop on the cover at all. No mirror is
 * promised for this shape (the report says so), but it must never loop, never waste a press, and
 * never land on the cover twice in one direction.
 */
describe.each(WALK_DOCKS)("a cover deep in a tall section, dock at y %i", (dockTop) => {
  describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
    it("terminates both ways with no dead press, landing on the cover at most once each way", () => {
      const a = shapedAnswer(DEEP_COVER, rule, dockTop);
      a.land(a.stops[0]!);

      const down = walkAnswer(a, "down", 40, false);
      const up = walkAnswer(a, "up", 40, false);

      expect(down.yielded).toBe(true);
      expect(up.yielded).toBe(true);
      expect(down.problems).toEqual([]);
      expect(up.problems).toEqual([]);
      expect(down.stops.filter((name) => name === "cover1").length).toBeLessThanOrEqual(1);
      expect(up.stops.filter((name) => name === "cover1").length).toBeLessThanOrEqual(1);
      // The box may take the ring once each side of the cover, never a third time.
      expect(down.stops.filter((name) => name === "section2").length).toBeLessThanOrEqual(2);
      expect(up.stops.filter((name) => name === "section2").length).toBeLessThanOrEqual(2);
    });
  });
});
