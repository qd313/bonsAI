/**
 * Title: The test setup's Steam scroll keeps the 116 px top margin, as the Deck measured it
 *
 * Purpose: Pin plan 81 helper K, step K1. The test setup (deckAnswerWalk.ts) modelled Steam's 80 px of bottom
 * padding but not the 116 px it keeps clear at the top of the pane. On the Deck a cover that the walk had
 * placed at y 104, wholly on screen, ended at y 204 (88 + 116). The setup now moves a small stop that lies
 * wholly inside that margin down to the margin line (option `steamTopMargin`, under the "padded" rule), and
 * leaves alone a stop that straddles the line or sits at or below it, as the Deck did.
 *
 * Checked against the Deck's own landings, stop by stop (each row is one measured landing, its top and bottom
 * as read, and where it was left): plan78-P78-DOWN-SHORT-SECTION.json (pane 88, dock 290; Soul Sanctum and
 * Mantis Lords, Down and Up), plan77-P77-WALK-COVERS-MIRROR-R2.json (the Up landings), and
 * plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json (a tall section the setup must leave alone). The Deck's landings
 * are the ones its Steam left, so each is a fixed point of the model, bar the two that Steam moved.
 *
 * Does not: reproduce the plugin's own placement before Steam's glide where the plugin has changed since the
 * Deck run (plan 78 and 79 builds); those landings are listed in the report, not asserted here. The walks that
 * go through the plugin are asserted only where the plugin's path and the Deck's agree.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  deckAnswer,
  resetDeckAnswerWalk,
  shapedAnswer,
  type AnswerShape,
  type Box,
} from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

/** How far down the page the lone stops sit, so the panel has room to scroll back up. */
const PANEL_AT = 300;

/** Put the ring on a lone cover whose screen box is `box` (the panel at 300) and report where Steam's glide leaves it. */
function landedAt(box: Box, options: { steamTopMargin?: boolean; dockLift?: boolean } = {}): Box {
  const page = (y: number) => y + PANEL_AT;
  const a = deckAnswer([[page(box[0] - 8), page(box[1] + 8)]], PANEL_AT, "padded", {
    dockLift: false,
    steamTopMargin: true,
    ...options,
  });
  const cover = a.cover(a.stops[0]!, [page(box[0]), page(box[1])]);
  a.land(cover);
  return [a.top(cover), a.bottom(cover)];
}

describe("a small stop wholly inside the top margin is moved down to the margin line", () => {
  it("a cover the walk placed at y 104, wholly on screen, ends at y 204 (the Deck: 104 became 204)", () => {
    expect(landedAt([104, 159])).toEqual([204, 259]);
  });

  it("a cover at 147 to 202, the Up landing before Steam moved it, ends at 204 to 259 (the Deck: Up cover 2)", () => {
    expect(landedAt([147, 202])).toEqual([204, 259]);
  });

  it("moves it by the stop's own height, whatever that is under 100 px (a 75 px box at 90 ends at 204)", () => {
    expect(landedAt([90, 165])).toEqual([204, 279]);
  });

  it("is off unless asked for, so the older walk tests keep the setup they were written against", () => {
    expect(landedAt([104, 159], { steamTopMargin: false })).toEqual([104, 159]);
  });
});

describe("the Deck's measured landings are left where they are", () => {
  // [name, top, bottom]: a landing read on the Deck, dock at y 290.
  const measured: Array<[string, number, number]> = [
    ["Soul Sanctum Down: cover 1 (P78 walk 1)", 204, 260],
    ["Soul Sanctum Down: box 1, 131 px, top inside the margin but taller than the cover rule", 159, 290],
    ["Soul Sanctum Down: box 2, 105 px, 1 px past the dock", 186, 291],
    ["Soul Sanctum Down: cover 2", 204, 259],
    ["Soul Sanctum Down: last box, 75 px, 1 px past the dock", 216, 291],
    ["Soul Sanctum Up: last box", 210, 285],
    ["Soul Sanctum Up: cover 1, straddling the margin line (P78 walk 1)", 167, 222],
    ["Soul Sanctum Up: box 1", 159, 290],
    ["round 2 Up: cover 1, straddling the margin line (R2)", 182, 237],
    ["round 2 Up: cover 2", 204, 259],
    ["round 2 Up: the 60 px last box, top on the margin line", 204, 264],
    ["round 2 Down: the 60 px last box", 230, 290],
    ["Mantis Lords Down: section 2, 195 px", 95, 290],
    ["Mantis Lords Up: section 1, 180 px", 97, 277],
    ["first-section landing (P78): section 1, 180 px", 111, 291],
  ];
  it.each(measured)("%s", (_name, top, bottom) => {
    expect(landedAt([top, bottom])).toEqual([top, bottom]);
  });

  it("a section taller than the band gets no glide (P79 try2: a 225 px section left at 128 to 353 going Down)", () => {
    const a = deckAnswer([[128 + PANEL_AT, 353 + PANEL_AT]], PANEL_AT, "padded", { steamTopMargin: true });
    a.land(a.stops[0]!);
    expect([a.top(a.stops[0]!), a.bottom(a.stops[0]!)]).toEqual([128, 353]);
  });
});

describe("Steam's 80 px of bottom padding stays in the model", () => {
  // Before plan 81 K3 the lift's margin stacked on this padding and ended the cover 86 px above the dock (149 to 204,
  // as the Deck measured); the lift now leaves the padding out of its margin and the end is 6 px above the dock.
  it("a cover half behind the dock, with no Steam glide, is lifted to end 6 px above the dock", () => {
    const a = deckAnswer([[280 + PANEL_AT, 345 + PANEL_AT]], PANEL_AT, undefined, { steamTopMargin: true });
    const cover = a.cover(a.stops[0]!, [284 + PANEL_AT, 339 + PANEL_AT]);
    a.land(cover);
    expect([a.top(cover), a.bottom(cover)]).toEqual([229, 284]);
  });
});

/** The Soul Sanctum answer of P78 walk 1, in page coordinates worked out from its landings and scrollTops. */
const SOUL_SANCTUM_P78: AnswerShape = {
  sections: [[266, 397], [397, 502], [502, 573], [573, 648]],
  covers: [[0, [273, 329]], [2, [510, 565]]],
  start: 0,
};

describe("the P78 Soul Sanctum walk Down, replayed in the Deck's numbers (dock 290, no game)", () => {
  it("lands cover 1, box 1 and the last box where the Deck left them, within 2 px", () => {
    const a = shapedAnswer(SOUL_SANCTUM_P78, "padded", 290, { steamTopMargin: true, liftScrollsToEnd: true });
    const at = () => {
      const ring = document.activeElement as HTMLElement;
      return { name: a.label(ring), top: a.top(ring), bottom: a.bottom(ring), st: a.pane.scrollTop };
    };
    const near = (got: number, want: number) => expect(Math.abs(got - want)).toBeLessThanOrEqual(2);

    expect(a.enterFromAbove()).toBe(true);
    let landing = at();
    expect(landing.name).toBe("cover1");
    near(landing.top, 204); // the Deck: 204 to 260 at scrollTop 69
    near(landing.st, 69);

    expect(a.down()).toBe(true);
    landing = at();
    expect(landing.name).toBe("section1");
    near(landing.top, 159); // the Deck: 159 to 290 at 107
    near(landing.bottom, 290);
    near(landing.st, 107);

    // Box 2 and cover 2 follow the plugin's present path (box 2's top under the header, 96), not the 1fe0787a
    // build's (186 to 291); cover 2 then sits 5 px below the Deck's 204 because of it. Steam leaves it, as it
    // does at or below the line.
    expect(a.down()).toBe(true);
    expect(at().name).toBe("section2");
    expect(a.down()).toBe(true);
    landing = at();
    expect(landing.name).toBe("cover2");
    expect(landing.top).toBeGreaterThanOrEqual(204);

    expect(a.down()).toBe(true);
    landing = at();
    expect(landing.name).toBe("section4");
    near(landing.top, 216); // the Deck: 216 to 291 at 357
    near(landing.bottom, 291);
    near(landing.st, 357);
    expect(a.down()).toBe(false); // on to the note and the choices
  });

  it("with the top margin off the same walk puts cover 1 where the old setup did, not at the Deck's 204", () => {
    const a = shapedAnswer(SOUL_SANCTUM_P78, undefined, 290, { liftScrollsToEnd: true });
    expect(a.enterFromAbove()).toBe(true);
    expect(a.top(document.activeElement as HTMLElement)).not.toBe(204);
  });
});
