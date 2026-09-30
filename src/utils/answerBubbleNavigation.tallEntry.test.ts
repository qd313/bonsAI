/**
 * Title: Going Up into a section taller than the band shows its bottom edge
 *
 * Purpose: Pin plan 77 helper E, round two, bug 2, from the Deck run of build bce7d0fd with a game
 * running (docs/test-evidence/plan77-BLOCK2-GAME.json): the band was y 124 to 330 (206 px) and the
 * answer had one 348 px section. Going Up into it from below it landed at y 66 to 414: the top 58 px
 * under the header AND the bottom 84 px under the dock, so neither edge showed and the rig read it 33%
 * visible behind the question box. Now the walk shows its bottom edge just above the dock, to read the
 * section from its end; Down entering it already showed its top edge.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts): the pane runs y 88 to the dock at y 294 (a 206 px
 * band), a press that only scrolls moves the panel 80 px, and Steam's own glide is applied after every
 * press under three rules and under none, except to a stop taller than the band, which got none on the
 * Deck (that 348 px box stayed exactly where the walk left it).
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  PANE_TOP,
  TALL_348,
  TALL_348_BETWEEN,
  WALK_RULES,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

describe.each([
  ["one 348 px box", TALL_348],
  ["a 348 px box between two short ones", TALL_348_BETWEEN],
])("%s in a 206 px band (dock at y 294)", (_name, shape) => {
  describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
    it("Down shows the top edge on entering it, Up from below shows the bottom edge", () => {
      const a = shapedAnswer(shape, rule, 294);
      expect(a.enterFromAbove()).toBe(true);
      const tallIndex = shape.sections.findIndex(([top, bottom]) => bottom - top > 206);

      const down = walkAnswer(a, "down");
      expect(down.yielded).toBe(true);
      expect(down.problems).toEqual([]);
      expect(down.stops).toContain(`section${tallIndex + 1}`);

      // Ring comes from the row below the answer: the panel is at the answer's end.
      a.pane.scrollTop = shape.sections[shape.sections.length - 1]![1] - 294 + 8;
      expect(a.enterFromBelow()).toBe(true);
      const up = walkAnswer(a, "up");
      if (process.env.WALK_DEBUG) console.log("UP  ", rule, up.presses.join(" > "), JSON.stringify(up.problems));
      expect(up.yielded).toBe(true);
      expect(up.problems).toEqual([]);
      expect(up.stops).toContain(`section${tallIndex + 1}`);
    });

    it("the Up landing on the tall box shows its bottom edge, whatever the panel was doing", () => {
      const a = shapedAnswer(shape, rule, 294);
      const tallIndex = shape.sections.findIndex(([top, bottom]) => bottom - top > 206);
      const last = shape.sections.length - 1;
      a.pane.scrollTop = shape.sections[last]![1] - 294 + 8;
      expect(a.enterFromBelow()).toBe(true);
      // Walk Up until the ring first lands on the tall box.
      for (let i = 0; i < 12 && a.stops.indexOf(document.activeElement as HTMLDivElement) !== tallIndex; i += 1) {
        expect(a.up()).toBe(true);
      }
      const tall = a.stops[tallIndex]!;
      expect(document.activeElement).toBe(tall);

      expect(a.bottom(tall)).toBeLessThanOrEqual(294 + 4);
      expect(a.bottom(tall)).toBeGreaterThan(PANE_TOP);
    });
  });
});

/*
 * The Deck's own case (plan77-BLOCK2-GAME.json): the ring comes up into the tall box from the row below
 * while the panel is NOT at the answer's end, so the box's top is 58 px under the header and its bottom
 * 84 px under the dock. Neither edge showed.
 */
describe.each(WALK_RULES)("Up into a 348 px box with the panel part way down, Steam scroll rule: %s", (rule) => {
  it("brings its bottom edge just above the dock", () => {
    const a = shapedAnswer(TALL_348, rule, 294);
    a.pane.scrollTop = 250; // the box spans y 50 to 398: top under the header, bottom under the dock
    expect(a.top(a.stops[0]!)).toBe(50);

    expect(a.enterFromBelow()).toBe(true);

    expect(document.activeElement).toBe(a.stops[0]);
    expect(a.bottom(a.stops[0]!)).toBeLessThanOrEqual(294 + 4);
    expect(a.bottom(a.stops[0]!)).toBeGreaterThanOrEqual(294 - 4);
  });
});
