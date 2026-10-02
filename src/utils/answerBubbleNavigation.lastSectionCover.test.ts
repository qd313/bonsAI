/**
 * Title: Up into an answer from below, when its last section opens with a hidden cover
 *
 * Purpose: Pin a Deck sighting of plan 79 (docs/test-evidence/plan79-QA-FREE-PLAY-01-NOGAME-b3a.json and
 * plan79-QA-FREE-PLAY-01-GAME-b3a.json, build 6e297645): in an answer with two "Spoiler" covers, the
 * last section, a cover with text under it, was a stop walking Down (cover 2, then that section's box)
 * but skipped walking Up: Up from choice A went straight to cover 2. The maintainer's rule (D120 item 6)
 * is that both directions visit the same stops, in opposite order.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts): Steam's glide after every landing under each of the
 * harness's rules and none, the dock at 290 and at 262. The walk Up comes first, from the row under the
 * answer (`enterFromBelow`, which is what Up from choice A calls), then the walk Down from the top must
 * be the same stops reversed; and the other way round.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  WALK_DOCKS,
  WALK_RULES,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
  type AnswerShape,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

/** The Deck's shape, as near as the sweep shows it: cover 1 then text, a tall section, and a last section that is cover 2 then text. */
const COVER_THEN_TEXT_LAST: AnswerShape = {
  sections: [[265, 400], [408, 700], [708, 830]],
  covers: [[0, [273, 328]], [2, [716, 771]]],
  start: 69,
};

describe.each(WALK_DOCKS)("an answer whose last section is a cover then text, dock at y %i", (dockTop) => {
  describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
    it("Up from the row below lands on the last section's box first, then its cover, the reverse of Down", () => {
      const a = shapedAnswer(COVER_THEN_TEXT_LAST, rule, dockTop);
      a.pane.scrollTop = COVER_THEN_TEXT_LAST.sections[2]![1] - dockTop + 8;
      expect(a.enterFromBelow()).toBe(true);
      expect(a.label(document.activeElement)).toBe("section3");

      const up = walkAnswer(a, "up");
      const down = walkAnswer(a, "down");
      if (process.env.WALK_DEBUG) console.log("UP1", dockTop, rule, up.stops.join(" > "), "|", down.stops.join(" > "));

      expect(up.yielded).toBe(true);
      expect(down.yielded).toBe(true);
      expect(up.problems).toEqual([]);
      expect(down.problems).toEqual([]);
      expect(new Set(up.stops).size).toBe(up.stops.length);
      expect(down.stops).toEqual([...up.stops].reverse());
    });

    it("Down to the end and then Up again visits the same stops", () => {
      const a = shapedAnswer(COVER_THEN_TEXT_LAST, rule, dockTop);
      expect(a.enterFromAbove()).toBe(true);
      const down = walkAnswer(a, "down");
      // Out of the answer at the bottom, and back in from the row below, as the Deck's sweep did.
      expect(a.enterFromBelow()).toBe(true);
      const up = walkAnswer(a, "up");
      if (process.env.WALK_DEBUG) console.log("DOWN", dockTop, rule, down.stops.join(" > "), "|", up.stops.join(" > "));

      expect(down.problems).toEqual([]);
      expect(up.problems).toEqual([]);
      expect(down.stops).toContain("section3");
      expect(up.stops).toEqual([...down.stops].reverse());
    });
  });
});
