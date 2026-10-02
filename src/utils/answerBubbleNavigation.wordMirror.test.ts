/**
 * Title: Underlined game words are stops both ways: a walk Down and a walk Up land on the same ones
 *
 * Purpose: Pin plan 79 helper AC, bug 1, from the Deck run of 2026-10-01 with Deep Rock Galactic:
 * Survivor (docs/test-evidence/plan78-QA-FREE-PLAY-01-GAME-try3.json). Walking Down, each underlined
 * word in the answer was a stop of its own; walking Up, the second section (three words) took one
 * landing and two presses that only scrolled, and the first section the same: not one word was a stop.
 * The maintainer's rule (D120 item 6) is that Up and Down visit the same stops, in opposite order.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts): the pane runs y 88 to the dock, a press that only
 * scrolls moves the panel 80 px, and Steam's own glide to the stop that took focus follows every press,
 * under each of the harness's rules and under none, with the dock at 290 and at 262.
 *
 * The check is on landings: the stops a press moved the ring onto. A tall section is read by
 * scrolling, and when a scroll carries a word off the screen the ring is handed back to the section
 * that holds it; that hand-off is the section's reading going on, not a landing. Up from a section's
 * first word onto its box IS a landing (the word is still on screen), which is why this file keeps
 * its own walk rather than `walkAnswer`, whose hand-off rule cannot tell the two apart.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  PANE_TOP,
  WALK_DOCKS,
  WALK_RULES,
  deckAnswer,
  resetDeckAnswerWalk,
  type Box,
  type SteamScrollRule,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

interface WordShape {
  sections: Box[];
  /** Words as [section index, box]. */
  words: Array<[number, Box]>;
  start: number;
}

/**
 * The Deep Rock Galactic: Survivor answer of the Deck run, in page coordinates (its content y plus the
 * pane's 88): two sections taller than the band, 345 and 360 px, and seven underlined words, four in
 * the first section and three in the second, the first of those on the second section's first line.
 */
const DRG_OVERCLOCKS: WordShape = {
  sections: [[294, 639], [639, 999]],
  words: [
    [0, [309, 324]], [0, [399, 414]], [0, [474, 489]], [0, [504, 519]],
    [1, [641, 656]], [1, [684, 699]], [1, [849, 864]],
  ],
  start: 0,
};

/** Three short sections, each wholly on screen at once, the middle one holding three words. */
const SHORT_WITH_WORDS: WordShape = {
  sections: [[236, 340], [348, 470], [478, 560]],
  words: [[1, [360, 375]], [1, [400, 415]], [1, [440, 455]]],
  start: 100,
};

function wordAnswer(shape: WordShape, rule: SteamScrollRule | undefined, dockTop: number) {
  const a = deckAnswer(shape.sections, shape.start, rule, { dockTop });
  const words = shape.words.map(([section, box]) => a.word(a.stops[section]!, box));
  const label = (el: Element | null): string => {
    const w = words.indexOf(el as HTMLElement);
    if (w >= 0) return `word${w + 1}`;
    const s = a.stops.indexOf(el as HTMLDivElement);
    return s >= 0 ? `section${s + 1}` : "other";
  };
  return { ...a, label };
}
type WordAnswer = ReturnType<typeof wordAnswer>;

/**
 * Press one way until the answer yields (at most `limit` presses). Every landing must show: wholly in
 * the band, or for a box taller than it, one of its edges. A press that moves neither the ring nor the
 * panel is dead; one that leaves the ring and moves the panel the wrong way is a loop in the making.
 */
function walk(a: WordAnswer, dir: "down" | "up", limit = 60) {
  const inBand = (el: HTMLElement) => a.top(el) >= PANE_TOP - 1 && a.bottom(el) <= a.dockTop + 4;
  const landings = [a.label(document.activeElement)];
  const presses = [...landings];
  const problems: string[] = [];
  let yielded = false;
  for (let i = 1; i <= limit; i += 1) {
    const before = document.activeElement as HTMLElement;
    const scrollBefore = a.pane.scrollTop;
    if (!(dir === "down" ? a.down() : a.up())) {
      yielded = true;
      break;
    }
    const ring = document.activeElement as HTMLElement;
    const name = a.label(ring);
    presses.push(name);
    const moved = a.pane.scrollTop - scrollBefore;
    if (ring === before && moved === 0) problems.push(`press ${i}: dead on ${name}`);
    if (ring === before && (dir === "down" ? moved < 0 : moved > 0)) problems.push(`press ${i}: wrong way on ${name}`);
    if (ring === before) continue;
    // The ring moved from a word to the section holding it because a scroll carried the word off the
    // screen: a hand-off. Going Down that is the only way it moves there (the section's placing may then
    // un-cut the word); going Up the press scrolled up, or left the word cut off at the dock.
    if (ring.contains(before) && (dir === "down" || moved < 0 || !inBand(before))) continue;
    landings.push(name);
    const tall = a.bottom(ring) - a.top(ring) > a.dockTop - PANE_TOP;
    const edgeShows = (y: number) => y >= PANE_TOP - 1 && y <= a.dockTop + 4;
    if (!(inBand(ring) || (tall && (edgeShows(a.top(ring)) || edgeShows(a.bottom(ring)))))) {
      problems.push(`press ${i}: ${name} not visible (${a.top(ring)}..${a.bottom(ring)})`);
    }
  }
  return { landings, presses, problems, yielded };
}

describe.each([
  ["Deep Rock Galactic overclocks", DRG_OVERCLOCKS],
  ["three short sections", SHORT_WITH_WORDS],
])("the %s answer, Down to the end and then Up back to the top", (_name, shape) => {
  describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
    describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
      it("lands on every word both ways, the same stops in opposite order, none twice", () => {
        const a = wordAnswer(shape, rule, dockTop);
        expect(a.enterFromAbove()).toBe(true);

        const down = walk(a, "down");
        const up = walk(a, "up");
        if (process.env.WALK_DEBUG) {
          console.log("DOWN", dockTop, rule, down.presses.join(" > "));
          console.log("UP  ", dockTop, rule, up.presses.join(" > "));
          console.log("PROB", dockTop, rule, JSON.stringify([...down.problems, ...up.problems]));
        }

        expect(down.yielded).toBe(true);
        expect(up.yielded).toBe(true);
        expect(down.problems).toEqual([]);
        expect(up.problems).toEqual([]);
        // Every word is a landing going Down, and going Up.
        for (let i = 1; i <= shape.words.length; i += 1) {
          expect(down.landings).toContain(`word${i}`);
          expect(up.landings).toContain(`word${i}`);
        }
        // None twice in one direction, and Up is Down backwards.
        expect(new Set(down.landings).size).toBe(down.landings.length);
        expect(new Set(up.landings).size).toBe(up.landings.length);
        expect(up.landings).toEqual([...down.landings].reverse());
      });

      it("visits the same stops when the walk Up comes first, from the row under the answer", () => {
        const a = wordAnswer(shape, rule, dockTop);
        // The ring comes from the row below the answer, so the panel is scrolled to the answer's end.
        a.pane.scrollTop = shape.sections[shape.sections.length - 1]![1] - dockTop + 8;
        expect(a.enterFromBelow()).toBe(true);

        const up = walk(a, "up");
        const down = walk(a, "down");
        if (process.env.WALK_DEBUG) console.log("LAND1", dockTop, rule, up.landings.join(" "), "|", down.landings.join(" "));

        expect(up.yielded).toBe(true);
        expect(down.yielded).toBe(true);
        expect(up.problems).toEqual([]);
        expect(down.problems).toEqual([]);
        for (let i = 1; i <= shape.words.length; i += 1) expect(up.landings).toContain(`word${i}`);
        expect(new Set(up.landings).size).toBe(up.landings.length);
        expect(down.landings).toEqual([...up.landings].reverse());
      });
    });
  });
});
