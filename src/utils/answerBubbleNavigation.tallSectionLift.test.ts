/**
 * Title: Reading a tall section with the D-pad neither loops nor jumps past its middle
 *
 * Purpose: Pin plan 78 helper D, round four. On 2026-10-01 the Deck showed that the plugin's own lift off
 * the dock really moves the panel when it asks for an element's end (plan78-P78-DOWN-SHORT-SECTION.json:
 * a section left at y 24 to 204, its bottom 86 px above the dock). Modelled that way, the test setup found
 * two faults in reading a section taller than the band, both from the lift acting on a section the walk
 * is reading by scrolling:
 *
 * - Up through a tall section with a spoiler cover deep in it looped for ever. With the ring on the cover,
 *   an Up press scrolled the cover under the dock, so the walk moved the ring to its section, as it must.
 *   The lift then saw a section whose top is above the screen and whose bottom is under the dock, and
 *   asked for its end: the panel jumped back down 232 px, the cover came back, the next Up landed on it
 *   again, and so on.
 * - Down through a tall section with the ring on an underlined game word jumped: once the word scrolled off
 *   the top, the ring moved to its section and the lift sent the panel 265 px on, past the section's middle.
 *
 * The walk places every section it lands on itself, or reads it by scrolling; the lift now leaves an
 * answer's sections alone, and lifts everything else as before.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts), with the lift's scroll request moving the panel as
 * measured on 2026-10-01 (`liftScrollsToEnd`).
 *
 * Does not: prove the ring moves on the device; see answerBubbleNavigation.ringFollowsScroll.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEEP_COVER,
  WALK_DOCKS,
  WALK_RULES,
  deckAnswer,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

describe("Up through a tall section with a cover deep in it (372 px section, cover 192 px down)", () => {
  it("the press that carries the cover under the dock scrolls 80 px up and leaves the panel there", () => {
    const a = shapedAnswer(DEEP_COVER, undefined, 290, { liftScrollsToEnd: true });
    a.pane.scrollTop = 344;
    a.land(a.covers[0]!);
    expect([a.top(a.covers[0]!), a.bottom(a.covers[0]!)]).toEqual([176, 231]);

    expect(a.up()).toBe(true);
    // The ring moves to the section (the cover is now 21 px under the dock) and the panel stays where
    // the press put it. Before: the lift sent it back to 496, the cover returned, and Up looped.
    expect(document.activeElement).toBe(a.stops[1]);
    expect(a.pane.scrollTop).toBe(264);
  });

  describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
    describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
      it("Down then Up both end, with no dead press and the cover landed on at most once each way", () => {
        const a = shapedAnswer(DEEP_COVER, rule, dockTop, { liftScrollsToEnd: true });
        a.land(a.stops[0]!);

        const down = walkAnswer(a, "down", 30, false);
        const up = walkAnswer(a, "up", 30, false);
        if (process.env.WALK_DEBUG) {
          console.log("DOWN", dockTop, rule, down.presses.join(" > "), JSON.stringify(down.problems));
          console.log("UP  ", dockTop, rule, up.presses.join(" > "), JSON.stringify(up.problems));
        }

        expect(down.yielded).toBe(true);
        expect(up.yielded).toBe(true);
        expect(down.problems).toEqual([]);
        expect(up.problems).toEqual([]);
        expect(down.stops.filter((name) => name === "cover1").length).toBeLessThanOrEqual(1);
        expect(up.stops.filter((name) => name === "cover1").length).toBeLessThanOrEqual(1);
        // The tall box takes the ring on each side of its cover (the walk's design: it is entered on the
        // box, and the ring returns to the box once the cover has been read past), never a third time.
        expect(down.stops.filter((name) => name === "section2").length).toBeLessThanOrEqual(2);
        expect(up.stops.filter((name) => name === "section2").length).toBeLessThanOrEqual(2);
      });

      it("coming in from the row below, Up reads to the top of the answer and leaves it", () => {
        const a = shapedAnswer(DEEP_COVER, rule, dockTop, { liftScrollsToEnd: true });
        a.pane.scrollTop = DEEP_COVER.sections[2]![1] - dockTop + 8;
        expect(a.enterFromBelow()).toBe(true);

        const up = walkAnswer(a, "up", 30, false);

        expect(up.yielded).toBe(true);
        expect(up.problems).toEqual([]);
        expect(up.stops.filter((name) => name === "cover1").length).toBeLessThanOrEqual(1);
        expect(up.stops.filter((name) => name === "section2").length).toBeLessThanOrEqual(2);
      });
    });
  });
});

describe("Down through a tall section with the ring on an underlined game word", () => {
  it("reads on 80 px a press after the word scrolls off, without jumping past the section's middle", () => {
    // The Deep Rock Galactic answer of plan76-P76-M-GLOSSARY-STICK.json: one 662 px section, the word at y 189.
    const a = deckAnswer([[299, 961], [961, 991]], 332, undefined, { liftScrollsToEnd: true });
    const word = a.word(a.stops[0]!, [521, 536]);
    word.focus();

    const scrolls: number[] = [];
    while (document.activeElement !== a.stops[1] && scrolls.length < 12) {
      expect(a.down()).toBe(true);
      scrolls.push(a.pane.scrollTop);
    }

    // Before: [412, 757, 757], the lift taking the panel 265 px on when the ring moved to the section. The
    // last press stops with the section's bottom on the dock (19 px), then the next section is landed.
    expect(scrolls).toEqual([412, 492, 572, 652, 671, 865]);
    expect(document.activeElement).toBe(a.stops[1]);
  });
});
