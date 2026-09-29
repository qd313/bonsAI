/**
 * Title: The answer walk keeps the ring on something you can see
 *
 * Purpose: Pin plan 76 lane 3, bug 1, built from the shapes the Deck measured on 2026-09-28 (build
 * 39c17312, the Deck's own screen: the visible band runs from y 88 to the dock at y 290, and a press
 * that only scrolls moves the panel 80 px):
 *
 * - docs/test-evidence/plan76-P76-M-GLOSSARY-STICK.json: Down onto an underlined game word, then
 *   five presses that only scrolled with the ring still on the word, 300 px above the screen.
 * - docs/test-evidence/plan76-P76-M-COVER-SCROLL.json: a press that only scrolled left the ring on a
 *   cover with a third of it cut off at the top.
 * - docs/test-evidence/plan76-S1.json: each cover cost one extra Down that seemed to do nothing,
 *   with the cover 67% behind the tab bar while the ring sat on it.
 *
 * The rule under test: after a press that scrolls, the ring is never left on a cover, a revealed
 * cover's hide line or a word that the scroll has cut off; it moves to the section that holds it and
 * the scroll stays. Reading a tall section by scrolling is unchanged.
 *
 * Does not: prove the ring moves on the device. On the device Steam calls the section's move
 * handler, which calls `focusAnswerStop` (a plain focus() between two Focusables of the same
 * answer, the call the walk already makes from a cover or word to the next section).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { PANE_TOP, deckAnswer, resetDeckAnswerWalk, type Box } from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

/*
 * The Deep Rock Galactic answer: one tall section (662 px) holding a list, and in it the word
 * "overclock" (index 3) at content y 521, with the last section 440 px below it. The ring landed on
 * the word with the panel at 332; the Deck's next five presses only scrolled.
 */
describe("Down through a tall section with the ring on an underlined word", () => {
  it("moves the ring to the section before the word is carried off the top, and keeps scrolling", () => {
    const a = deckAnswer([[299, 961], [961, 991]], 332);
    const wordEl = a.word(a.stops[0]!, [521, 536]);
    wordEl.focus();
    expect(a.top(wordEl)).toBe(189);

    const scrolls: number[] = [];
    let presses = 0;
    while (document.activeElement !== a.stops[1] && presses < 12) {
      expect(a.down()).toBe(true);
      presses += 1;
      scrolls.push(a.pane.scrollTop);
      const ring = document.activeElement as HTMLElement;
      // The whole point: whatever the ring is on after a press, it is not cut off above the pane.
      expect(ring === a.stops[0] || ring === a.stops[1] || a.top(ring) >= PANE_TOP).toBe(true);
    }

    // Reading a tall section by scrolling is untouched: 80 px a press, then onto the last section,
    // the same six presses the Deck took (five scroll-only presses, then the move on).
    expect(scrolls).toEqual([412, 492, 572, 652, 732, 732]);
    expect(presses).toBe(6);
    expect(document.activeElement).toBe(a.stops[1]);
  });

  it("hands the ring to the section on the press that cuts the word, not before", () => {
    const a = deckAnswer([[299, 961], [961, 991]], 332);
    const wordEl = a.word(a.stops[0]!, [521, 536]);
    wordEl.focus();

    a.down(); // the word is at y 109, still inside the band
    expect(document.activeElement).toBe(wordEl);

    a.down(); // now at y 29
    expect(document.activeElement).toBe(a.stops[0]);
  });

  it("does not land on the word it just left, even while a sliver of it still shows", () => {
    // The word ends up cut by 8 px at the top with its bottom still inside the band: the shape that
    // would make the walk land on it, scroll it away, move off it, and land on it again.
    const a = deckAnswer([[299, 961], [961, 991]], 332);
    const wordEl = a.word(a.stops[0]!, [572, 587]);
    wordEl.focus();

    a.down(); // y 160 -> stays
    expect(document.activeElement).toBe(wordEl);
    a.down(); // y 80: cut
    expect(document.activeElement).toBe(a.stops[0]);
    expect(a.bottom(wordEl)).toBeGreaterThan(PANE_TOP); // a sliver of it is still on screen

    a.down();
    expect(document.activeElement).not.toBe(wordEl);
    expect(document.activeElement).toBe(a.stops[0]);
  });

  it("still walks on to a word further down, and not back to one above", () => {
    const a = deckAnswer([[299, 961], [961, 991]], 332);
    const above = a.word(a.stops[0]!, [430, 445]);
    const here = a.word(a.stops[0]!, [572, 587]);
    const below = a.word(a.stops[0]!, [760, 775]);
    here.focus();

    a.down(); // scroll, still visible
    a.down(); // cut: the ring goes to the section
    expect(document.activeElement).toBe(a.stops[0]);
    a.down(); // the word below is now on screen and ahead: the walk lands on it
    expect(document.activeElement).not.toBe(above);
    expect(document.activeElement).toBe(below);
  });

  it("keeps skipping the words it has passed for as long as the ring stays in that section", () => {
    // Round two: the memory used to end when the word came back on screen, which is exactly what
    // Steam's own scroll does after the ring moves to the section, and the walk then went round
    // in a circle (plan76-P76-WALK-COVERS.json). It now belongs to the section, whatever the panel does.
    const a = deckAnswer([[299, 961], [961, 991]], 332);
    const first = a.word(a.stops[0]!, [430, 445]);
    const second = a.word(a.stops[0]!, [572, 587]);
    second.focus();
    a.down();
    a.down(); // the second word is cut: the ring is on the section
    expect(document.activeElement).toBe(a.stops[0]);

    a.pane.scrollTop = 332; // the panel is put back: both words are on screen, the ring is unchanged
    a.down();

    expect(document.activeElement).not.toBe(first); // it is before the word the ring left
    expect(document.activeElement).not.toBe(second);
    expect(document.activeElement).toBe(a.stops[0]);
  });

  it("leaves the ring alone when the word is still wholly on screen after the scroll", () => {
    const a = deckAnswer([[299, 961], [961, 991]], 332);
    const wordEl = a.word(a.stops[0]!, [621, 636]);
    wordEl.focus();

    a.down();
    expect(document.activeElement).toBe(wordEl);
  });
});

describe("Up through a tall section with the ring on an underlined word", () => {
  it("moves the ring to the section when the scroll carries the word off the bottom", () => {
    // The panel is at 700 and the word sits at y 250, just above the dock (readable band ends at 290).
    const a = deckAnswer([[100, 961], [961, 991]], 700);
    const wordEl = a.word(a.stops[0]!, [950, 965]);
    wordEl.focus();
    expect(a.top(wordEl)).toBe(250);

    expect(a.up()).toBe(true); // 700 -> 620: the word is now at y 330, behind the dock
    expect(a.pane.scrollTop).toBe(620);
    expect(a.top(wordEl)).toBe(330);
    expect(document.activeElement).toBe(a.stops[0]);
  });

  it("leaves the ring on the word while it is still above the dock after the scroll", () => {
    const a = deckAnswer([[100, 961], [961, 991]], 700);
    const wordEl = a.word(a.stops[0]!, [890, 905]); // y 190
    wordEl.focus();

    expect(a.up()).toBe(true); // y 270: still on screen
    expect(document.activeElement).toBe(wordEl);
  });
});

/*
 * The Hollow Knight Soul Sanctum answer, in the Deck's numbers (COVER-SCROLL): section 1 holds a
 * paragraph, a cover 55 tall and a paragraph; section 2 is one paragraph; section 3 is a cover and
 * a paragraph (218 tall). The ring was on cover 1 at y 149 with the panel at 140.
 */
describe("Down with the ring on a cover", () => {
  const SECTIONS: Box[] = [[250, 441], [487, 637], [637, 855]];

  it("moves the ring to the cover's section when a press only scrolls and cuts the cover's top", () => {
    const a = deckAnswer(SECTIONS, 140);
    const cover1 = a.cover(a.stops[0]!, [289, 344]);
    cover1.focus();
    expect(a.top(cover1)).toBe(149);

    expect(a.down()).toBe(true);

    expect(a.pane.scrollTop).toBe(220);
    expect(a.top(cover1)).toBe(69); // 19 px above the band, as the Deck measured
    expect(document.activeElement).toBe(a.stops[0]);
  });

  /*
   * docs/test-evidence/plan76-S1.json: the first Down after landing on each cover did nothing a
   * person could see, and the second left it (2 of 2 runs, both covers), with the cover 67% behind
   * the tab bar at the dead press. Whatever the cover's height on screen, a Down whose next stop is
   * off screen must either move the ring or visibly scroll the panel, and leave the ring on something
   * that is on screen.
   */
  it("no Down from a cover is a dead press, wherever the cover sits when the ring lands on it", () => {
    for (let coverTop = 100; coverTop <= 240; coverTop += 10) {
      resetDeckAnswerWalk();
      // A tall section holding the cover, and the next section far below the screen.
      const a = deckAnswer([[coverTop - 40, coverTop + 400], [coverTop + 400, coverTop + 460]]);
      const cover = a.cover(a.stops[0]!, [coverTop, coverTop + 55]);
      cover.focus();
      const scrolledFrom = a.pane.scrollTop;

      expect(a.down()).toBe(true);

      const ring = document.activeElement as HTMLElement;
      const somethingHappened = ring !== cover || a.pane.scrollTop !== scrolledFrom;
      expect(somethingHappened, `cover at ${coverTop}`).toBe(true);
      expect(ring === a.stops[0] || a.top(ring) >= PANE_TOP, `cover at ${coverTop}`).toBe(true);
    }
  });

  it("does the same for a revealed cover's hide line", () => {
    const a = deckAnswer(SECTIONS, 140);
    const hide = a.hideLine(a.stops[0]!, [289, 304]);
    hide.focus();

    expect(a.down()).toBe(true);
    expect(a.top(hide)).toBe(69); // carried up with the scroll, 19 px above the band
    expect(document.activeElement).toBe(a.stops[0]);
  });

  it("does not put the ring back on the cover it left, and walks on to the next section", () => {
    const a = deckAnswer(SECTIONS, 140);
    const cover1 = a.cover(a.stops[0]!, [289, 344]);
    cover1.focus();

    a.down(); // hop to section 1
    expect(a.down()).toBe(true); // section 2's top is now at y 267, on screen
    expect(document.activeElement).toBe(a.stops[1]);
    expect(document.activeElement).not.toBe(cover1);
  });

  it("lands on a cover in the next section rather than on the section around it", () => {
    const a = deckAnswer(SECTIONS, 380);
    const cover3 = a.cover(a.stops[2]!, [645, 700]);
    a.stops[1]!.focus();

    expect(a.down()).toBe(true); // section 3 starts at y 257 and its cover at y 265: both on screen
    expect(document.activeElement).toBe(cover3);
  });
});
