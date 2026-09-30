/**
 * Title: A walk Down an answer with covers lands only on stops that are fully on screen
 *
 * Purpose: Pin plan 77 helper E, bug 1, from two Deck runs of build 4af8e7a1 on 2026-09-29 (plan 76,
 * block 3; docs/test-evidence/plan76-P76-WALK-COVERS-try2.json and plan76-QA-FREE-PLAY-01-try2.json):
 * after a Down press that scrolled past cover 1, the ring sat on section 1's box with the top third of
 * it, where the cover is, under the tab header (67% visible; with a game running, also partly under
 * the dock's action row).
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts): the pane runs y 88 (under the tab header) to the
 * dock's top, a press that only scrolls moves the panel 80 px, and after every press Steam's own glide
 * to the stop that took focus is applied, under three different rules and under none. Each answer is
 * walked with the dock at the Deck's 290 and at 262.
 *
 * Rule checked on every landing: the stop is fully inside the readable band, or, when it is taller than
 * the band, its top edge is inside it. Also: no dead press, no stop holding the ring three presses
 * running, no stop visited twice, and the walk reaches the end of the answer.
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  SOUL_SANCTUM,
  THREE_COVERS,
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
])("Down to the end of the %s answer", (_name, shape) => {
  describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
    describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
      it("lands only on stops that are fully visible, none twice, and reaches the end", () => {
        const a = shapedAnswer(shape, rule, dockTop);
        expect(a.enterFromAbove()).toBe(true);

        const down = walkAnswer(a, "down");
        if (process.env.WALK_DEBUG) console.log("DOWN", dockTop, rule, down.presses.join(" > "), JSON.stringify(down.problems));

        expect(down.yielded).toBe(true);
        expect(down.problems).toEqual([]);
        expect(new Set(down.stops).size).toBe(down.stops.length);
      });
    });
  });
});
