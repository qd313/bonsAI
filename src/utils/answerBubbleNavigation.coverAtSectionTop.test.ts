/**
 * Title: Down and Up through an answer whose spoiler covers sit at the top of their sections
 *
 * Purpose: Pin plan 93's bug "Going Down and going Up through an answer stop on different parts"
 * (docs/test-evidence/plan93-M6-UP-SKIPS-PARAGRAPH.json). On the Deck, Down went from the cover at the
 * top of section 5 straight to the cover in section 6, and section 5 itself (141 px, well inside the
 * screen) was never a stop going Down; Up stopped on it. The next section's cover was already on
 * screen, and "a hidden cover on screen and ahead of the ring" came before "the section's own box after
 * its last cover". The same rule could also jump a whole short section to reach a cover two sections on.
 *
 * Used for: the answer walk's stop order (answerBubbleNavigation.ts, `moveDownInAnswer`).
 *
 * Solves: a walk test at the level the Deck check looks at: the measured answer (seven sections with the
 * Deck's heights and positions, three 52 px covers, two of them 8 px below their section's top), on the
 * Deck's own screen (pane 52 to 454, dock at 348), walked Down from the top and Up back with Steam's
 * glide modelled three ways and not at all. The two lists must be mirror images, every section in both,
 * no stop twice.
 *
 * Does not: model the reasoning fold above the answer or the rows below it; the walk starts on entry
 * from above and ends when the answer hands the press back to Steam.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  WALK_RULES,
  deckAnswer,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
  type AnswerShape,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

/*
 * The Deck's answer in page coordinates (each stop's box top plus the pane's scroll position when it was
 * read): sections 0 to 6 are 277, 273, 273, 95, 114, 141 and 109 px tall; the covers are in sections 4, 5
 * and 6 (counting from 0), 22, 8 and 8 px below their section's top. Section 5's cover read 176 against its
 * section's 168 at the same scroll.
 */
const GEO_ANSWER: AnswerShape = {
  sections: [[204, 481], [481, 754], [754, 1027], [1027, 1122], [1122, 1236], [1236, 1377], [1377, 1486]],
  covers: [[4, [1144, 1196]], [5, [1244, 1296]], [6, [1385, 1437]]],
  start: 7,
};

/** The Deck's own screen in that run: transcript box 402 tall from y 52, the slot line (dock) at 348. */
const DECK_SCREEN = { paneTop: 52, paneBottom: 454 };
const DECK_DOCK = 348;

describe.each(WALK_RULES)("the measured answer on the Deck's own screen, Steam scroll rule: %s", (rule) => {
  it("Down and Up stop on the same parts, every section in both, mirror images, nothing twice", () => {
    const a = shapedAnswer(GEO_ANSWER, rule, DECK_DOCK, DECK_SCREEN);
    expect(a.enterFromAbove()).toBe(true);

    const down = walkAnswer(a, "down");
    const up = walkAnswer(a, "up");
    if (process.env.WALK_DEBUG) {
      console.log("DOWN", rule, down.presses.join(" > "));
      console.log("UP  ", rule, up.presses.join(" > "));
      console.log("PROB", rule, JSON.stringify([...down.problems, ...up.problems]));
    }

    expect(down.yielded).toBe(true);
    expect(up.yielded).toBe(true);
    // Every section is a stop going Down (section 5 was the one missed on the Deck).
    for (let s = 1; s <= GEO_ANSWER.sections.length; s += 1) expect(down.stops).toContain(`section${s}`);
    // The Deck's order: a section's cover, then the section, going Down.
    expect(down.stops).toEqual([
      "section1", "section2", "section3", "section4",
      "cover1", "section5", "cover2", "section6", "cover3", "section7",
    ]);
    expect(new Set(down.stops).size).toBe(down.stops.length);
    expect(new Set(up.stops).size).toBe(up.stops.length);
    expect(up.stops).toEqual([...down.stops].reverse());
    expect(down.problems).toEqual([]);
    expect(up.problems).toEqual([]);
  });
});

/*
 * The same cause, a step further: a short section with no cover between the ring and a cover two sections
 * on. With all three on screen, Down took the far cover and the short section in between was never a stop.
 */
describe("a cover two sections ahead does not jump the section in between", () => {
  it("Down goes section, the short section, then the cover; Up comes back the same way", () => {
    const a = deckAnswer([[100, 150], [150, 190], [190, 280]]);
    const cover = a.cover(a.stops[2]!, [198, 250]);
    a.stops[0]!.focus();

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[1]);
    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(cover);
    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[2]);

    expect(a.up()).toBe(true);
    expect(document.activeElement).toBe(cover);
    expect(a.up()).toBe(true);
    expect(document.activeElement).toBe(a.stops[1]);
    expect(a.up()).toBe(true);
    expect(document.activeElement).toBe(a.stops[0]);
  });
});
