/**
 * Title: Down walks a whole answer with covers to its end, and never bounces
 *
 * Purpose: Pin plan 76 lane 3, round two. The first version of the ring-follows-the-scroll step
 * (commit 6f68e721) passed on the Deck for words but looped for covers: on the Soul Sanctum answer
 * Down went cover 1, cover 1, section 1's box, cover 1, box, cover 1... and never reached section 2,
 * the menu or Helpful (docs/test-evidence/plan76-P76-WALK-COVERS.json, runs/
 * plan76-P76-WALK-COVERS-down.json). Steam glided the panel after the ring moved to the box, which
 * brought the cover back into view, and the step's memory of the cover it had left was tied to the
 * cover being cut off, so it was forgotten, and the cover, which sits inside the box, counted as
 * "ahead" of it again.
 *
 * The shape is the Deck's: section 1 is a cover then a paragraph (191 tall), section 2 one paragraph,
 * section 3 a cover then a paragraph (218 tall), in a pane whose visible band is y 88 to 290. Every
 * walk runs under each of the three Steam scroll rules the harness models, because the loop depends
 * on where Steam leaves the panel, and that differed from stop to stop on the Deck.
 *
 * Does not: prove the ring moves on the device (see answerBubbleNavigation.ringFollowsScroll.test.ts).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { PANE_TOP, deckAnswer, resetDeckAnswerWalk, type SteamScrollRule } from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

const RULES: Array<SteamScrollRule | undefined> = [undefined, "top", "padded", "center"];

function soulSanctum(rule: SteamScrollRule | undefined) {
  const a = deckAnswer([[265, 456], [470, 620], [634, 852]], 0, rule);
  const cover1 = a.cover(a.stops[0]!, [273, 328]);
  const cover3 = a.cover(a.stops[2]!, [642, 697]);
  const label = (el: Element | null) =>
    el === cover1 ? "cover1" : el === cover3 ? "cover3" : `section${a.stops.indexOf(el as HTMLDivElement) + 1}`;
  return { ...a, cover1, cover3, label };
}

/** Press until the answer yields; every landing named, with what each press did to the ring and panel. */
function walk(a: ReturnType<typeof soulSanctum>, dir: "down" | "up", limit = 30) {
  const landings: string[] = [a.label(document.activeElement)];
  const idle: number[] = [];
  let yielded = false;
  let presses = 0;
  for (let i = 1; i <= limit; i += 1) {
    presses = i;
    const ringBefore = document.activeElement;
    const scrollBefore = a.pane.scrollTop;
    if (!(dir === "down" ? a.down() : a.up())) {
      yielded = true;
      break;
    }
    const ring = document.activeElement as HTMLElement;
    const named = a.label(ring);
    if (landings[landings.length - 1] !== named) landings.push(named);
    if (ring === ringBefore && a.pane.scrollTop === scrollBefore) idle.push(i);
    // The ring is never left on a small stop that is cut off at the top of the pane.
    const isSection = a.stops.includes(ring as HTMLDivElement);
    expect(isSection || a.top(ring) >= PANE_TOP - 1, `press ${i} left ${named} cut off`).toBe(true);
  }
  return { landings, idle, yielded, presses };
}

describe.each(RULES)("Down through the Soul Sanctum answer (Steam scroll rule: %s)", (rule) => {
  it("reaches the end of the answer without landing on any stop twice, and no press is dead", () => {
    const a = soulSanctum(rule);
    a.land(a.cover1);

    const { landings, idle, yielded, presses } = walk(a, "down");
    if (process.env.WALK_DEBUG) console.log(rule, presses, landings.join(" > "));

    expect(presses).toBeLessThan(15); // a bounded walk: the Deck's looped for ever
    expect(yielded).toBe(true); // the answer handed the press on: Helpful and the menu are reachable
    expect(new Set(landings).size).toBe(landings.length); // no stop visited twice
    expect(landings[0]).toBe("cover1");
    expect(landings.indexOf("section2")).toBeGreaterThan(landings.indexOf("cover1"));
    expect(landings[landings.length - 1]).toMatch(/cover3|section3/);
    expect(idle).toEqual([]);
  });

  it("Up from the end walks back over the same stops and leaves at the top", () => {
    const a = soulSanctum(rule);
    a.land(a.cover1);
    walk(a, "down");

    const up = walk(a, "up");

    expect(up.yielded).toBe(true);
    expect(up.idle).toEqual([]);
    expect(new Set(up.landings).size).toBe(up.landings.length);
    // Down went cover 1, (maybe section 1's box after a scroll), section 2, the last section. Up goes
    // the last section, section 2, cover 1: the same stops, and Up never uses section 1's box.
    expect(up.landings.filter((name) => name !== "section3" && name !== "cover3")).toEqual(["section2", "cover1"]);
  });
});
