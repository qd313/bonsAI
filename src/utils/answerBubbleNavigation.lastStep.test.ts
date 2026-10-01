/**
 * Title: The last scroll through a section stops at its end, not a whole press past it
 *
 * Purpose: Pin plan 78 helper D, round five, item (a), from the Deck (docs/test-evidence/
 * plan78-QA-FREE-PLAY-01-NOGAME-try2.json, answer A): a 210 px section, 8 px taller than the 202 px band,
 * landed at y 88 to 298, and the next Down scrolled a whole 80 px press to 8 to 218, its bottom 72 px above
 * the dock and its top 80 px under the header, to show the last 8 px. Now a scroll press inside a section
 * stops where the section ends (Down: its bottom on the dock) or starts (Up: its top on the header) when
 * that is nearer than a whole press; longer sections still read 80 px a press until then.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts).
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  PANE_TOP,
  TALL_446,
  WALK_DOCKS,
  WALK_RULES,
  resetDeckAnswerWalk,
  shapedAnswer,
  type AnswerShape,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

/** The Deck's answer A: two sections, 180 and 210 px, no cover. */
const ANSWER_A: AnswerShape = { sections: [[280, 460], [460, 670]], covers: [], start: 0 };

const at = (a: ReturnType<typeof shapedAnswer>) => {
  const ring = document.activeElement as HTMLElement;
  return `${a.label(ring)} ${a.top(ring)}-${a.bottom(ring)}`;
};

describe("the Deck's 210 px section, 8 px taller than the band (dock at y 290)", () => {
  it("Down shows its last 8 px with an 8 px scroll, then moves on; Up mirrors it", () => {
    const a = shapedAnswer(ANSWER_A, undefined, 290);
    expect(a.enterFromAbove()).toBe(true);
    expect(a.down()).toBe(true);
    expect(at(a)).toBe("section2 88-298"); // the Deck: 88.5-298.5

    expect(a.down()).toBe(true);
    expect(at(a)).toBe("section2 80-290"); // the Deck: 8.5-218.5, a whole 80 px press
    expect(a.down()).toBe(false); // on to the choices

    expect(a.up()).toBe(true);
    expect(at(a)).toBe("section2 88-298"); // its top back on the header, 8 px
    expect(a.up()).toBe(true);
    expect(at(a)).toBe("section1 110-290");
  });
});

/*
 * Every scroll press inside a section, in whole walks: after it, the section going Down still reaches the
 * dock, and going Up still reaches the header. A press that scrolls a section's far edge past that line is
 * the overshoot.
 */
describe.each([
  ["answer A (180 and 210 px)", ANSWER_A],
  ["the 446 px section with a deep cover", TALL_446],
])("%s", (_name, shape) => {
  describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
    describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
      it("no scroll press carries a section's far edge past the dock (Down) or the header (Up)", () => {
        const a = shapedAnswer(shape, rule, dockTop);
        expect(a.enterFromAbove()).toBe(true);
        const overshoots: string[] = [];
        const press = (dir: "down" | "up") => {
          const before = document.activeElement;
          const scrollBefore = a.pane.scrollTop;
          const handled = dir === "down" ? a.down() : a.up();
          const ring = document.activeElement as HTMLElement;
          const section = a.stops.find((stop) => stop.contains(ring));
          if (handled && ring === before && section && a.pane.scrollTop !== scrollBefore) {
            const past = dir === "down" ? dockTop - a.bottom(section) : a.top(section) - PANE_TOP;
            if (past > 4) overshoots.push(`${dir} on ${a.label(ring)}: ${past} px past`);
          }
          return handled;
        };
        for (let i = 0; i < 20 && press("down"); i += 1);
        for (let i = 0; i < 20 && press("up"); i += 1);
        expect(overshoots).toEqual([]);
      });
    });
  });
});
