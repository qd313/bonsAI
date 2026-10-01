/**
 * Title: Down leaves the answer in one press from a short last section
 *
 * Purpose: Pin plan 78 helper D, from two Deck runs (docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-R2.json
 * and plan77-P77-FINAL-SMOKE.json). Walking Down, the answer's last section (60 px in one run, 90 px in the
 * other, both shorter than the 202 px band) landed with its bottom on the dock, and the next press only
 * scrolled the panel 80 px with the ring left on it; the press after that left the answer.
 *
 * Cause: the walk asked "is there more answer below the dock?" of the bubble, and the bubble's own frame
 * (8 px of padding and a 1 px border) runs 9 px past its last section. With the section's bottom on the
 * dock that frame was still under it, so the press scrolled to show 9 px of empty frame. The harness had
 * no frame (the bubble ended where its last section did), which is why last night's tests passed while the
 * Deck repeated the stop. The walk now asks the answer's text (the section stack inside the frame). Up had
 * the same rule at the top and gets the same change.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts): the bubble has the Deck's 9 px frame, the pane runs
 * y 88 to the dock, a press that only scrolls moves the panel 80 px, Steam's own glide is applied after
 * each press under three rules and under none, and the plugin's own lift off the dock runs after it. Docks
 * at 290 (no game) and 262 (a game running lifts it). The answers are the two the Deck measured, in their
 * own numbers.
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  FINAL_SMOKE,
  ROUND_TWO,
  WALK_DOCKS,
  WALK_RULES,
  deckAnswer,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

describe("the Deck's own repeated press, replayed in its own numbers", () => {
  it("round 2: the 60 px last box lands at y 230 to 290, and the next Down leaves the answer", () => {
    const a = shapedAnswer(ROUND_TWO, undefined, 290);
    a.pane.scrollTop = 268;
    a.land(a.covers[1]!);
    expect([a.top(a.covers[1]!), a.bottom(a.covers[1]!)]).toEqual([204, 259]); // the Deck: cover2 204-259, scrollTop 268

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[3]);
    expect([a.top(a.stops[3]!), a.bottom(a.stops[3]!), a.pane.scrollTop]).toEqual([230, 290, 305]); // the Deck: 230-290, 305

    // The Deck: this press only scrolled to 150-210 (scrollTop 385), with the ring left on the box.
    expect(a.down()).toBe(false);
    expect(a.pane.scrollTop).toBe(305);
  });

  it("final smoke: the 90 px last box lands with its bottom on the dock, and the next Down leaves the answer", () => {
    const a = shapedAnswer(FINAL_SMOKE, undefined, 290);
    a.pane.scrollTop = 274;
    a.land(a.covers[1]!);
    expect([a.top(a.covers[1]!), a.bottom(a.covers[1]!)]).toEqual([221, 276]); // the Deck: cover2 221-276, scrollTop 274

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[2]);
    expect(a.bottom(a.stops[2]!)).toBe(290); // the Deck: 201-291, scrollTop 357

    // The Deck: this press only scrolled to 121-211 (scrollTop 437), with the ring left on the box.
    const before = a.pane.scrollTop;
    expect(a.down()).toBe(false);
    expect(a.pane.scrollTop).toBe(before);
  });

  it("final smoke, from the top: the walk lands where the Deck did, then leaves without the extra press", () => {
    // Steam's glide put a small stop 116 px under the pane's top on the Deck here ("padded").
    const a = shapedAnswer(FINAL_SMOKE, "padded", 290);
    expect(a.enterFromAbove()).toBe(true);
    const at = () => {
      const ring = document.activeElement as HTMLElement;
      return `${a.label(ring)} ${a.top(ring)}-${a.bottom(ring)} st${a.pane.scrollTop}`;
    };
    expect(at()).toBe("cover1 204-259 st85"); // the Deck: cover1 204-259 st85
    a.down();
    expect(at()).toBe("section1 88-310 st177"); // the Deck: box1 88-310 st177
    a.down();
    // The Deck: box1 again 9-230 st257, a whole 80 px press to show the last 20 px of a 222 px box. Since
    // plan 78 round five the press stops with the box's bottom on the dock (answerBubbleNavigation.lastStep.test.ts).
    expect(at()).toBe("section1 68-290 st197");
    a.down();
    expect(a.label(document.activeElement)).toBe("cover2"); // the Deck: cover2
    a.down();
    expect(a.label(document.activeElement)).toBe("section3"); // the Deck: box2 201-291
    expect(a.down()).toBe(false); // the Deck: box2 again, 121-211, one press later than this
  });
});

/*
 * Bounded walks over both answers, with the plugin's own lift off the dock after every landing (it runs on
 * every landing on the Deck; without it and without any Steam glide, nothing at all lifts the first cover
 * off the dock on entry, which the Deck never does).
 */
describe.each([
  ["final smoke", FINAL_SMOKE],
  ["round 2", ROUND_TWO],
])("the %s answer walked Down to its end, then Up", (_name, shape) => {
  describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
    describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
      it("never only scrolls on the short last box, visits no stop twice, and Up is Down reversed", () => {
        const a = shapedAnswer(shape, rule, dockTop);
        expect(a.enterFromAbove()).toBe(true);
        const last = `section${shape.sections.length}`;

        const down = walkAnswer(a, "down", 30);
        const up = walkAnswer(a, "up", 30);
        if (process.env.WALK_DEBUG) {
          console.log("DOWN", dockTop, rule, down.presses.join(" > "), JSON.stringify(down.scrollOnly));
          console.log("UP  ", dockTop, rule, up.presses.join(" > "), JSON.stringify(up.scrollOnly));
        }

        expect(down.yielded).toBe(true);
        expect(up.yielded).toBe(true);
        expect(down.problems).toEqual([]);
        expect(up.problems).toEqual([]);
        expect(down.scrollOnly.filter((press) => press.includes(` on ${last},`))).toEqual([]);
        expect(down.stops[down.stops.length - 1]).toBe(last);
        expect(new Set(down.stops).size).toBe(down.stops.length);
        expect(new Set(up.stops).size).toBe(up.stops.length);
        expect(up.stops).toEqual([...down.stops].reverse());
      });
    });
  });
});

describe("Up leaves the answer in one press from a first section that fits the band", () => {
  it("does not spend a press scrolling the bubble's frame into view above it", () => {
    // Section 1 is 200 px tall in the 202 px band: going Up its bottom is brought to the dock, which puts
    // its top at y 90, with the bubble's frame (9 px) above it reaching 81, past the header.
    const a = deckAnswer([[100, 300], [308, 400]], 212);
    a.land(a.stops[1]!);

    expect(a.up()).toBe(true);
    expect(document.activeElement).toBe(a.stops[0]);
    expect([a.top(a.stops[0]!), a.bottom(a.stops[0]!)]).toEqual([90, 290]);

    // Before: this press scrolled 10 px to show the frame, pushing the section 10 px behind the dock.
    expect(a.up()).toBe(false);
    expect(a.top(a.stops[0]!)).toBe(90);
  });
});
