/**
 * Title: Down into a section whose spoiler cover sits deep inside it reads the section first
 *
 * Purpose: Pin plan 78 helper D, round five, from the Deck (docs/test-evidence/
 * plan78-P78-TALL-SECTION-LOOP-BEFORE.json and plan78-QA-FREE-PLAY-01-NOGAME-try2.json): on two answers
 * whose first section is taller than the band (446 and 416 px) with a cover 383 and 353 px down, Down from
 * the reasoning line landed on the cover (229 to 284, scrollTop 448 and 418). The section's opening text was
 * never on screen going Down; the next Down left the answer. Going Up the walk was right: cover, then the
 * section read upward.
 *
 * Cause: coming into an answer, a hidden cover anywhere in its first section took the ring before the
 * section, however deep it sat; and after a hop to the next section, a cover of that section peeking into
 * the band did the same. Both now apply only to a cover at the head of its section: one whose bottom is
 * within the first screenful of the section (cover bottom minus section top, plus the 8 px the walk leaves
 * above a section, no more than the band), so landing on it leaves no unread text above the header. Every
 * cover the Deck walked this week is one (24 px down, at most 79 px to its bottom). A deeper cover is
 * reached by reading: the walk lands on the section, top on the header, scrolls it 80 px a press, and lands
 * on the cover when it comes on screen.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts), under both of the lift's measured behaviours.
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  TALL_416,
  TALL_446,
  WALK_DOCKS,
  WALK_RULES,
  fullyVisible,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
  type AnswerShape,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

const at = (a: ReturnType<typeof shapedAnswer>) => {
  const ring = document.activeElement as HTMLElement;
  return `${a.label(ring)} ${a.top(ring)}-${a.bottom(ring)} st${a.pane.scrollTop}`;
};

/** A 131 px section, then a 320 px one with its cover 200 px down, then a 75 px one: the hop's case. */
const COVER_200_DOWN: AnswerShape = {
  sections: [[228, 359], [359, 679], [679, 754]],
  covers: [[1, [559, 614]]],
  start: 69,
};

describe("the Deck's 446 px answer, replayed in its own numbers (dock at y 290)", () => {
  it("Down from the reasoning line lands on the section, top on the header, and reads down to the cover", () => {
    // The Deck's numbers here match the lift's own step (its scroll request left the panel still).
    const a = shapedAnswer(TALL_446, undefined, 290, { liftScrollsToEnd: false });

    expect(a.enterFromAbove()).toBe(true);
    expect(at(a)).toBe("section1 88-534 st206"); // the Deck: cover 229-284, scrollTop 448

    const down: string[] = [];
    while (a.down()) down.push(at(a));
    expect(down).toEqual([
      "section1 8-454 st286",
      "section1 -72-374 st366",
      "section1 -152-294 st446",
      "cover1 231-286 st446",
    ]);
  });
});

/*
 * Each answer walked Down from the line above and back Up. `landings` leaves out the hand-off from a cover
 * back to the section holding it once a scroll has carried the cover away: that is the section's reading
 * going on, which the Deck's own Up walk shows (cover, then the section at -72 to 374). No stop is landed on
 * twice in one direction. On the Deck's two answers the cover ends its section, and the stops Up are the
 * stops Down reversed; with text after a deep cover, each direction enters the section on its box and meets
 * the cover after it, so the box comes before the cover both ways.
 */
describe.each([
  ["446 px section, cover 383 px down", TALL_446, ["section1", "cover1"], ["cover1"], true],
  [
    "416 px section, cover 353 px down, then a cover-only section",
    TALL_416,
    ["section1", "cover1", "cover2"],
    ["cover2", "cover1"],
    true,
  ],
  [
    "320 px section after a short one, cover 200 px down, text after it",
    COVER_200_DOWN,
    ["section1", "section2", "cover1", "section3"],
    ["section3", "section2", "cover1", "section1"],
    false,
  ],
] as Array<[string, AnswerShape, string[], string[], boolean]>)(
  "%s",
  (_name, shape, downLandings, upLandings, mirrored) => {
    describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
      describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
        describe.each([true, false])("the lift's scroll request moves the panel: %s", (liftScrollsToEnd) => {
          it("Down reads the section before its cover, nothing landed twice, the cover once each way", () => {
            const a = shapedAnswer(shape, rule, dockTop, { liftScrollsToEnd });
            expect(a.enterFromAbove()).toBe(true);
            const entry = document.activeElement as HTMLElement;
            expect(a.label(entry)).toBe("section1");
            expect(fullyVisible(a, entry, "down"), `entry ${at(a)}`).toBe(true);

            const down = walkAnswer(a, "down", 30);
            const up = walkAnswer(a, "up", 30);
            if (process.env.WALK_DEBUG) {
              console.log("DOWN", dockTop, rule, liftScrollsToEnd, down.presses.join(" > "), JSON.stringify(down.problems));
              console.log("UP  ", dockTop, rule, liftScrollsToEnd, up.presses.join(" > "), JSON.stringify(up.problems));
            }

            expect(down.yielded).toBe(true);
            expect(up.yielded).toBe(true);
            expect(down.problems).toEqual([]);
            expect(up.problems).toEqual([]);
            expect(down.landings).toEqual(downLandings);
            expect(up.landings).toEqual(upLandings);
            if (mirrored) expect(up.stops).toEqual([...down.stops].reverse());
          });
        });
      });
    });
  }
);
