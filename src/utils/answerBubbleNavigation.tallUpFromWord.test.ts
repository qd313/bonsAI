/**
 * Title: Up from the first underlined word of a section taller than the screen shows its start
 *
 * Purpose: Pin plan 81 helper K, step K2. On the Deck (plan81-P81-M-K2K3-GAME.json, build afd2f444, a game
 * running: page 534 high, pane 128 to 534, dock 330, room 202) the long Zhukov paragraph was one section 525 px
 * tall with five underlined words. Down onto it left its top exactly at the pane top (128.5, scrollTop 220):
 * 38% showing. Up from its first word onto the same section did not move the panel: it stayed at 229.1 to
 * 754.1 with 99 px of earlier content above it and only 100.9 px (19%) showing, 424 px under the dock.
 * Up is meant to be Down reversed, so the landing on the section is now placed the way Down places it: a
 * section taller than the room has its top brought to the pane top.
 *
 * Built the way the Deck is (deckAnswerWalk.ts): the game's pane (`paneTop` 128, `paneBottom` 534, dock 330),
 * a 525 px section with five 15 px words at the page heights worked out from the Deck's scrollTops, a 45 px
 * section after it, Steam's scroll under each modelled rule with its top margin on, and a bounded walk.
 *
 * Does not: cover the no-game screen (no section there was taller than the room; the shorter shapes of the
 * other walk tests do), or a tall section entered from below (answerBubbleNavigation.tallEntry.test.ts).
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  WALK_RULES,
  deckAnswer,
  resetDeckAnswerWalk,
  type SteamScrollRule,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

const PANE_TOP = 128;
const DOCK_TOP = 330;
const SECTION: [number, number] = [349, 874];
const WORDS = [363, 438, 604, 694, 754]; // page tops of the five 15 px words, read off the Deck's scrollTops

function zhukov(rule: SteamScrollRule | undefined, steamTopMargin: boolean, liftScrollsToEnd = true) {
  const a = deckAnswer([SECTION, [874, 919]], 88, rule, {
    dockTop: DOCK_TOP,
    paneTop: PANE_TOP,
    paneBottom: 534,
    steamTopMargin,
    liftScrollsToEnd,
  });
  const words = WORDS.map((top) => a.word(a.stops[0]!, [top, top + 15]));
  const name = (el: Element | null) => {
    const w = words.indexOf(el as HTMLElement);
    if (w >= 0) return `word${w + 1}`;
    const s = a.stops.indexOf(el as HTMLDivElement);
    return s >= 0 ? `section${s + 1}` : "other";
  };
  const ring = () => document.activeElement as HTMLElement;
  /** The share of the section between the pane top and the dock, as a whole percent. */
  const shown = () => {
    const s = a.stops[0]!;
    const seen = Math.max(0, Math.min(a.bottom(s), DOCK_TOP) - Math.max(a.top(s), PANE_TOP));
    return Math.round((100 * seen) / (a.bottom(s) - a.top(s)));
  };
  return { ...a, words, name, ring, shown };
}

describe.each(WALK_RULES)("the Zhukov answer in the game's pane, Steam scroll rule: %s", (rule) => {
  describe.each([true, false])("Steam's top margin modelled: %s", (margin) => {
    it("Down onto the section puts its top at the pane top (the Deck: 128.5, 38% showing)", () => {
      const a = zhukov(rule, margin);
      expect(a.enterFromAbove()).toBe(true);
      expect(a.name(a.ring())).toBe("section1");
      expect(a.top(a.stops[0]!)).toBeGreaterThanOrEqual(PANE_TOP - 1);
      expect(a.top(a.stops[0]!)).toBeLessThanOrEqual(PANE_TOP + 1);
      expect(a.shown()).toBeGreaterThanOrEqual(38);
    });

    it("Up from the first word onto the section puts its top at the pane top too, at least as much showing as Down", () => {
      const a = zhukov(rule, margin);
      a.enterFromAbove();
      expect(a.down()).toBe(true); // the first word
      expect(a.name(a.ring())).toBe("word1");

      expect(a.up()).toBe(true);
      expect(a.name(a.ring())).toBe("section1");
      expect(a.top(a.stops[0]!)).toBeGreaterThanOrEqual(PANE_TOP - 1); // the Deck: 229.1, 99 px of earlier content above
      expect(a.top(a.stops[0]!)).toBeLessThanOrEqual(PANE_TOP + 1);
      expect(a.shown()).toBeGreaterThanOrEqual(38); // the Deck: 19%

      // And the way back is the way it came: Down from the box is the first word again, then the box again on Up.
      expect(a.down()).toBe(true);
      expect(a.name(a.ring())).toBe("word1");
      expect(a.up()).toBe(true);
      expect(a.name(a.ring())).toBe("section1");
    });

    it("walking Down to the end and Up again from there ends on the section with its start showing, no word twice", () => {
      const a = zhukov(rule, margin);
      a.enterFromAbove();
      for (let i = 0; i < 20 && a.down(); i += 1) {
        /* to the end of the answer */
      }
      expect(a.name(a.ring())).toBe("section2");

      const stops: string[] = [];
      expect(a.enterFromBelow()).toBe(true);
      for (let i = 0; i < 20; i += 1) {
        const named = a.name(a.ring());
        if (named !== stops[stops.length - 1]) stops.push(named); // a press that only scrolled keeps the stop
        if (!a.up()) break;
      }
      const words = stops.filter((s) => s.startsWith("word"));
      expect(new Set(words).size).toBe(words.length); // no word twice
      expect(words.length).toBe(5); // every word once
      expect(stops.length).toBeLessThan(16); // bounded: the walk ends, it does not loop
      expect(stops[stops.length - 1]).toBe("section1");
      expect(a.shown()).toBeGreaterThanOrEqual(38);
    });
  });
});
