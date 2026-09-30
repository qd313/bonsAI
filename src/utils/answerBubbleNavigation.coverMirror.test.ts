/**
 * Title: Down and Up visit the same stops, covers included
 *
 * Purpose: Pin plan 76 lane 3, bug 2 (roadmap: "Walking Down onto a section that holds only a
 * spoiler cover lands on the section's outer box, and A there does nothing" and the last stop of
 * "Walking down a reply and walking back up visit different stops"; docs/test-evidence/
 * plan76-P76-M-COVER-ONLY.json and plan74-REPLY-STOPS-MIRROR-01-r2.json). Down landed on the box
 * around a cover where Up landed on the cover, and every one of those runs began with a walk Up:
 * a flag set when the ring first landed on a cover made every later walk Down skip it.
 *
 * Built from the Deck's three shapes side by side: a section with a paragraph and then a cover, a
 * section that is only a cover, and a section that starts with a cover and then has a paragraph.
 *
 * Does not: prove the ring moves on the device (see answerBubbleNavigation.ringFollowsScroll.test.ts
 * for the call that moves it).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { deckAnswer, resetDeckAnswerWalk } from "../test-harness/deckAnswerWalk";
import { registerSpoilerFence } from "./spoilerFenceRegistry";
import { openHiddenCoverIn } from "./answerBubbleNavigation";

beforeEach(resetDeckAnswerWalk);

/*
 * Down and Up visit the same stops, covers included (REPLY-STOPS-MIRROR-01). Built from the Deck's
 * three shapes side by side: a section with a paragraph and then a cover, a section that is only a
 * cover, and a section that starts with a cover and then has a paragraph. All on screen at once so
 * the walk is the stops themselves, not the scrolling.
 */
describe("Down and Up visit the same stops", () => {
  function threeShapes() {
    const a = deckAnswer([[100, 170], [170, 230], [230, 285]]);
    const cover1 = a.cover(a.stops[0]!, [130, 165]); // second child: a paragraph comes first
    const cover2 = a.cover(a.stops[1]!, [175, 225]); // the section is only a cover
    const cover3 = a.cover(a.stops[2]!, [233, 265]); // first child, a paragraph after
    return { ...a, cover1, cover2, cover3 };
  }
  const name = (a: ReturnType<typeof threeShapes>, el: Element | null) => {
    const covers: Array<Element | null> = [a.cover1, a.cover2, a.cover3];
    const at = covers.indexOf(el);
    return at >= 0 ? `cover${at + 1}` : `section${a.stops.indexOf(el as HTMLDivElement) + 1}`;
  };

  /** Walk from `from` in one direction until the answer yields, naming every stop landed on. */
  function walk(a: ReturnType<typeof threeShapes>, from: HTMLElement, dir: "down" | "up"): string[] {
    from.focus();
    const seen: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      if (!(dir === "down" ? a.down() : a.up())) break;
      seen.push(name(a, document.activeElement));
    }
    return seen;
  }

  it("Down over the three shapes lands on each cover, never on the box around one", () => {
    const a = threeShapes();
    expect(walk(a, a.cover1, "down")).toEqual(["cover2", "cover3"]);
  });

  it("Up over the three shapes lands on the same covers in reverse", () => {
    const a = threeShapes();
    expect(walk(a, a.cover3, "up")).toEqual(["cover2", "cover1"]);
  });

  it("Down after a walk Up still lands on the covers (the walk Up used to use them up)", () => {
    const a = threeShapes();
    const up = walk(a, a.cover3, "up");
    expect(up).toEqual(["cover2", "cover1"]);

    expect(walk(a, a.cover1, "down")).toEqual(["cover2", "cover3"]);
    // And once more, as a second pass down the same answer.
    expect(walk(a, a.cover1, "down")).toEqual(["cover2", "cover3"]);
  });

  it("entering from the section above lands on the cover-only section's cover", () => {
    const a = threeShapes();
    walk(a, a.cover3, "up");
    a.stops[0]!.focus();

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.cover1); // section 1's own cover first, in reading order
    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.cover2);
  });

  it("a cover the ring has left is not offered again by the next Down", () => {
    const a = threeShapes();
    a.cover2.focus();

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.cover3);
    expect(a.down()).toBe(false); // nothing below: the answer yields, as it always did
  });

  it("a cover in a section taller than the band lands when it is on screen, then the scroll goes on", () => {
    const a = deckAnswer([[100, 500], [500, 560]]);
    const cover = a.cover(a.stops[0]!, [110, 165]);
    a.bubble.focus();

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(cover);
    // Text runs on below the cover, so the section's box is the next stop (plan 77): the ring goes to
    // it at once, with the panel where it was. Reading the tall section then goes on by scrolling,
    // 80 px a press, with the ring on the box (the next section is 210 px below the band).
    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[0]);
    expect(a.pane.scrollTop).toBe(0);
    expect(a.down()).toBe(true);
    expect(a.pane.scrollTop).toBe(80);
    expect(a.down()).toBe(true);
    expect(a.pane.scrollTop).toBe(160);
  });
});

/*
 * docs/test-evidence/plan76-S1.json: on the Deck the first Down after landing on each cover did
 * nothing a person could see, and the second left it (2 of 2 runs, both covers). The cover registers
 * itself through an inline ref, which runs again on every render, and each run reset its "already
 * offered" flag: the next Down offered the cover the ring was already on, focused it again, and
 * reported the press handled with nothing changed. The walk now asks where the ring is instead, so a
 * cover the ring is on is never offered to it.
 */
describe("Down from a cover the ring is already on", () => {
  it("is not a dead press when the cover registered itself again after the ring landed", () => {
    const a = deckAnswer([[100, 500], [500, 560]]);
    const cover = a.cover(a.stops[0]!, [110, 165]);
    cover.focus();
    registerSpoilerFence("cover-1", cover); // a re-render: the same element, registered afresh

    expect(a.down()).toBe(true);

    // The press did something a person can see: text runs on below the cover, so the ring moved to
    // the section's box.
    expect(document.activeElement).toBe(a.stops[0]);
  });

  it("walks on to the next cover instead of landing on the same one", () => {
    const a = deckAnswer([[100, 200], [200, 280]]);
    const first = a.cover(a.stops[0]!, [110, 190]);
    const second = a.cover(a.stops[1]!, [210, 270]);
    first.focus();
    registerSpoilerFence("cover-1", first);

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(second);
  });
});

describe("A on a section that holds a hidden cover", () => {
  it("opens the first hidden cover on screen inside it", () => {
    const a = deckAnswer([[100, 170], [170, 230]]);
    let opened = 0;
    a.cover(a.stops[0]!, [110, 160], () => (opened += 1));

    expect(openHiddenCoverIn(a.stops[0]!)).toBe(true);
    expect(opened).toBe(1);
  });

  it("does nothing on a section with no hidden cover, or one that is off screen", () => {
    const a = deckAnswer([[100, 170], [700, 760]]);
    let opened = 0;
    a.cover(a.stops[1]!, [710, 750], () => (opened += 1));

    expect(openHiddenCoverIn(a.stops[0]!)).toBe(false);
    expect(openHiddenCoverIn(a.stops[1]!)).toBe(false);
    expect(opened).toBe(0);
  });
});

/*
 * Plan 77: a section with text after its cover has a box stop of its own, and Down and Up agree on it
 * whatever the panel is doing: Down goes cover, box, next section; Up goes next section, box, cover.
 * (Until then Down stopped on the box only when a scroll happened to cut the cover off, and Up never
 * did: docs/test-evidence/plan76-REPLY-STOPS-MIRROR-01-try2.json.) Everything is on screen at once
 * here, so the panel plays no part.
 */
describe("A section with text after its cover has a box stop, both ways", () => {
  function coverThenText() {
    const a = deckAnswer([[100, 190], [190, 250]]);
    const cover = a.cover(a.stops[0]!, [105, 150]); // 40 px of text below it
    return { ...a, cover };
  }

  it("Down goes cover, the section's box, then the next section", () => {
    const a = coverThenText();
    a.cover.focus();

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[0]);
    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[1]);
  });

  it("Up goes next section, the box, then the cover, then leaves", () => {
    const a = coverThenText();
    a.stops[1]!.focus();

    expect(a.up()).toBe(true);
    expect(document.activeElement).toBe(a.stops[0]);
    expect(a.up()).toBe(true);
    expect(document.activeElement).toBe(a.cover);
    expect(a.up()).toBe(false);
  });

  it("walking Down again after a walk Up offers the box again", () => {
    const a = coverThenText();
    a.stops[1]!.focus();
    a.up();
    a.up();
    expect(document.activeElement).toBe(a.cover);

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[0]);
  });

  it("a section that ends with its cover, or is only its cover, has no box stop", () => {
    const a = deckAnswer([[100, 170], [170, 230]]);
    const first = a.cover(a.stops[0]!, [130, 165]); // 5 px below it: the section's own padding
    first.focus();

    expect(a.down()).toBe(true);
    expect(document.activeElement).toBe(a.stops[1]);
    expect(a.up()).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it("a cover deep in a tall section does not trade the ring with the section's box for ever", () => {
    // A section taller than the band whose cover is deep inside it: Down enters on the box, lands on the
    // cover once it scrolls into view, and the scroll past it hands the ring back to the box (the cover
    // slides off the top). The box stop after the cover is NOT offered on top of that, and the cover is
    // not offered again: the walk goes on to the next section.
    const a = deckAnswer([[20, 100], [100, 700], [700, 760]]);
    const cover = a.cover(a.stops[1]!, [500, 555]);
    a.stops[0]!.focus();

    const landings: Element[] = [];
    for (let i = 0; i < 20 && document.activeElement !== a.stops[2]; i += 1) {
      expect(a.down()).toBe(true);
      const ring = document.activeElement as Element;
      if (landings[landings.length - 1] !== ring) landings.push(ring);
    }

    expect(document.activeElement).toBe(a.stops[2]);
    expect(landings.filter((el) => el === cover)).toHaveLength(1);
    // The box, the cover, and the box once more after a scroll took the cover away: never a third time.
    expect(landings.filter((el) => el === a.stops[1]).length).toBeLessThanOrEqual(2);
  });
});

describe("Down into a section that is only a cover", () => {
  it("lands on the cover, lifted clear of the dock, when only the box is on screen", () => {
    // The next section's box starts 1 px above the dock (y 289 against 290) but the cover inside it, 8 px
    // lower, is not on screen yet. The box stands in for the cover (A on it opens the cover), so the walk
    // takes the cover itself, the stop Up lands on.
    const a = deckAnswer([[100, 200], [289, 360]]);
    const cover = a.cover(a.stops[1]!, [297, 352]);
    a.stops[0]!.focus();

    expect(a.down()).toBe(true);

    expect(document.activeElement).toBe(cover);
    expect(a.bottom(cover)).toBeLessThanOrEqual(290 + 4);
  });
});
