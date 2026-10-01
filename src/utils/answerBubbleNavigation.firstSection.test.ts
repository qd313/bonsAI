/**
 * Title: Down into an answer from the line above lands its first section wholly on screen
 *
 * Purpose: Pin plan 78 helper D, round two, from the Deck (docs/test-evidence/plan78-P78-DOWN-SHORT-SECTION.json,
 * walk 2): on a Mantis Lords answer whose first section is 180 px with no spoiler cover, Down from the
 * reasoning line (y 249 to 263, panel at 0) put the ring on that section at y 24 to 204 with the panel at
 * 256: its top 64 px above the panel's top at y 88, read as 67% visible. The same section entered from below
 * sat at 97 to 277, wholly on screen.
 *
 * Cause: coming into the answer from above, the walk focused the first section and placed nothing; every
 * other landing (the next section, the box after a cover, coming in from below) puts the section into the
 * band itself. The section, mostly below the dock, was left to the plugin's own lift off the dock, whose
 * scroll request ends 86 px above the dock (Steam keeps 80 px of scroll padding at the pane's bottom, and
 * the lift asks for 6 px more than the dock's strip): bottom at 204, so a section taller than 116 px loses
 * its top. Now the entry places the section the way Down's own landing does, its bottom just above the
 * dock (a section taller than the band shows its top edge), so the lift has nothing left to do.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts), with the lift's scroll request modelled as it was
 * measured that day (`liftScrollsToEnd`), and as the older measurement had it (no movement).
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  FINAL_SMOKE,
  MANTIS_LORDS,
  PANE_TOP,
  ROUND_TWO,
  SOUL_SANCTUM,
  WALK_DOCKS,
  WALK_RULES,
  fullyVisible,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
  type AnswerShape,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

/** The same answer with a 160 px first section, which fits the band a running game leaves (dock at y 262). */
const MANTIS_LORDS_GAME: AnswerShape = { ...MANTIS_LORDS, sections: [[280, 440], [440, 635]] };

const at = (a: ReturnType<typeof shapedAnswer>) => {
  const ring = document.activeElement as HTMLElement;
  return `${a.label(ring)} ${a.top(ring)}-${a.bottom(ring)} st${a.pane.scrollTop}`;
};

describe("the Deck's walk 2, replayed in its own numbers (dock at y 290)", () => {
  it("Down from the reasoning line lands section 1 wholly in the band, then section 2 where the Deck had it", () => {
    const a = shapedAnswer(MANTIS_LORDS, undefined, 290, { liftScrollsToEnd: true });

    expect(a.enterFromAbove()).toBe(true);
    // The Deck: section 1 at 24-204, scrollTop 256 (its top 64 px above the panel's).
    expect(at(a)).toBe("section1 110-290 st170");

    expect(a.down()).toBe(true);
    expect(at(a)).toBe("section2 95-290 st365"); // the Deck: 95-290, scrollTop 365
    expect(a.down()).toBe(false); // on to the choices

    expect(a.up()).toBe(true);
    expect(at(a)).toBe("section1 96-276 st184"); // the Deck: 97-277, scrollTop 183
    expect(a.up()).toBe(false); // on to the reasoning line
  });
});

describe.each([
  [290, MANTIS_LORDS],
  [262, MANTIS_LORDS_GAME],
])("coming into the answer from above, dock at y %i", (dockTop, shape) => {
  describe.each([true, false])("the lift's scroll request moves the panel: %s", (liftScrollsToEnd) => {
    it("lands the first section wholly between the header and the dock", () => {
      const a = shapedAnswer(shape, undefined, dockTop, { liftScrollsToEnd });
      const first = a.stops[0]!;
      expect(a.bottom(first) - a.top(first)).toBeLessThanOrEqual(dockTop - PANE_TOP); // it fits the band

      expect(a.enterFromAbove()).toBe(true);

      expect(document.activeElement).toBe(first);
      expect(a.top(first)).toBeGreaterThanOrEqual(PANE_TOP);
      expect(a.bottom(first)).toBeLessThanOrEqual(dockTop);
    });
  });
});

describe.each([
  ["Mantis Lords", MANTIS_LORDS],
  ["Mantis Lords, shorter first section", MANTIS_LORDS_GAME],
  // The Deck's other measured answers, which start with a cover: this morning's walk 1 has round 2's shape.
  ["round 2 (walk 1's shape)", ROUND_TWO],
  ["final smoke", FINAL_SMOKE],
  ["Soul Sanctum", SOUL_SANCTUM],
])("the %s answer walked Down from the line above, then Up", (_name, shape) => {
  describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
    describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
      describe.each([true, false])("the lift's scroll request moves the panel: %s", (liftScrollsToEnd) => {
        it("every landing on screen, the entry included; no stop twice; Up is Down reversed", () => {
          const a = shapedAnswer(shape, rule, dockTop, { liftScrollsToEnd });
          expect(a.enterFromAbove()).toBe(true);
          const entry = document.activeElement as HTMLElement;
          expect(fullyVisible(a, entry, "down"), `entry ${at(a)}`).toBe(true);

          const down = walkAnswer(a, "down", 20);
          const up = walkAnswer(a, "up", 20);
          if (process.env.WALK_DEBUG) {
            console.log("DOWN", dockTop, rule, liftScrollsToEnd, down.presses.join(" > "), JSON.stringify(down.problems));
            console.log("UP  ", dockTop, rule, liftScrollsToEnd, up.presses.join(" > "), JSON.stringify(up.problems));
          }

          expect(down.yielded).toBe(true);
          expect(up.yielded).toBe(true);
          expect(down.problems).toEqual([]);
          expect(up.problems).toEqual([]);
          expect(new Set(down.stops).size).toBe(down.stops.length);
          expect(up.stops).toEqual([...down.stops].reverse());
          expect(down.stops[0]).toBe(shape.covers.length ? "cover1" : "section1");
        });
      });
    });
  });
});
