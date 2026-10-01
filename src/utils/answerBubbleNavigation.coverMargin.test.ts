/**
 * Title: A cover with nothing but its own margin past it does not cost a press that only scrolls
 *
 * Purpose: Pin plan 78 helper D, second fix. Once the walk harness had the Deck's bubble frame and its
 * "a press only scrolled on a section that fits the band" check, the Deck's own answers showed the same
 * repeated stop in a second place: with the ring on a section's hidden cover and nothing after the cover in
 * that section but its 8 px margin (the Deck's lone cover is 55 px in a 71 px section), a landing that put
 * the cover's bottom on the dock left that margin under it. The walk then counted the section as "not read
 * yet", would not move on to the next section, and the press only scrolled the panel 80 px with the ring
 * left on the cover. Up had the mirror case with a cover at the top of its section. Now a cover with nothing
 * but its margin past it stands for its section when the walk asks "has this been read?", both when it
 * moves on to the next section and when it leaves the answer.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts): the bubble's 9 px frame, the pane from y 88 to the
 * dock, 80 px scroll presses, and the plugin's own lift off the dock after every landing. Every whole-answer
 * walk in the other walk tests now fails on a press that only scrolls while the ring's section fits the band.
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  FINAL_SMOKE,
  SOUL_SANCTUM,
  THREE_COVERS,
  TWO_COVERS_IN_ONE_SECTION,
  resetDeckAnswerWalk,
  shapedAnswer,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

describe("Down from a cover whose bottom sits on the dock, its margin under it", () => {
  it("lands on the next section in one press (the final smoke answer, a game's dock at y 262)", () => {
    const a = shapedAnswer(FINAL_SMOKE, undefined, 262);
    a.pane.scrollTop = 288;
    a.land(a.covers[1]!);
    expect(a.bottom(a.covers[1]!)).toBe(262);
    expect(a.bottom(a.stops[1]!)).toBe(270); // the cover-only section's margin, 8 px under the dock

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[2]);
    expect([a.top(a.stops[2]!), a.bottom(a.stops[2]!)]).toEqual([96, 186]);
    expect(a.down()).toBe(false); // and that last box is left in one press too
  });

  it("lands on the next section in one press (the Soul Sanctum answer, dock at y 290)", () => {
    const a = shapedAnswer(SOUL_SANCTUM, undefined, 290);
    a.pane.scrollTop = 395;
    a.land(a.covers[1]!);
    expect([a.top(a.covers[1]!), a.bottom(a.covers[1]!)]).toEqual([235, 290]);

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[3]);
    expect(a.top(a.stops[3]!)).toBe(96);
  });

  it("leaves the answer in one press when the cover ends its last section", () => {
    const a = shapedAnswer(TWO_COVERS_IN_ONE_SECTION, undefined, 290);
    a.pane.scrollTop = 401;
    a.land(a.covers[2]!);
    expect(a.bottom(a.covers[2]!)).toBe(290);

    expect(a.down()).toBe(false);
    expect(a.pane.scrollTop).toBe(401);
  });
});

describe("Up from a cover whose top sits on the header, its margin above it", () => {
  it("lands on the section above in one press, showing its bottom edge (three covers, a game's dock)", () => {
    const a = shapedAnswer(THREE_COVERS, undefined, 262);
    a.pane.scrollTop = 488;
    a.land(a.covers[2]!);
    expect(a.top(a.covers[2]!)).toBe(88);
    expect(a.top(a.stops[2]!)).toBe(80); // the margin, 8 px under the header

    expect(a.up()).toBe(true);
    expect(document.activeElement).toBe(a.stops[1]);
    expect(a.bottom(a.stops[1]!)).toBe(262); // a section taller than the band, read from its end
  });

  it("leaves the answer in one press when the cover starts its first section", () => {
    const a = shapedAnswer(SOUL_SANCTUM, undefined, 290);
    a.pane.scrollTop = 185;
    a.land(a.covers[0]!);
    expect(a.top(a.covers[0]!)).toBe(88);

    expect(a.up()).toBe(false);
    expect(a.pane.scrollTop).toBe(185);
  });
});
