/**
 * Title: The controls under an answer land just above the dock, not 86 px above it
 *
 * Purpose: Pin plan 81 helper K, step K3. When the ring lands on a control hidden behind the dock, the plugin's
 * lift (useDockClearanceOnFocus.ts) asks the pane to scroll its end into view. Steam's pane already keeps 80 px
 * of scroll padding at its bottom, and the lift's own scroll margin (the dock's covered strip plus 6 px) added
 * on top of it, so the control ended 86 px above the dock. Measured on the Deck (plan81-P81-M-K2K3-NOGAME.json
 * and plan81-P81-M-K2K3-GAME.json, build afd2f444), going Down under an answer: choice A at 171.8 to 203.8
 * with the dock at 290.17; with a game (dock 330) choice A at 195.8 to 243.8 and Helpful at 216 to 244. The lift
 * now takes Steam's 80 px out of its margin, so a lifted control ends 6 px above the dock.
 *
 * Built the way the Deck is (deckAnswerWalk.ts): the no-game pane (88 to 454, dock 290) and the game's page
 * (128 to 534, dock 330), the controls at the page heights worked out from the Deck's landings and scrollTops,
 * the ring walked from one to the next. Steam's own glide is left off for the exact numbers, as on the Deck
 * (it left these controls low enough for the lift to move them); the weaker rules (every landing wholly in the
 * band, none twice) are checked under every modelled Steam rule with the top margin on.
 *
 * Does not: cover a section or cover in the answer (the walk places those; liftForFocus leaves sections alone).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { WALK_RULES, deckAnswer, resetDeckAnswerWalk, type Box, type SteamScrollRule } from "../test-harness/deckAnswerWalk";

beforeEach(resetDeckAnswerWalk);

interface Screen {
  name: string;
  paneTop: number;
  paneBottom: number;
  dockTop: number;
  /** The controls under the answer, in page coordinates: choice A, choice B, Helpful, Show details, notes block. */
  controls: Box[];
}

const SCREENS: Screen[] = [
  {
    name: "no game (pane 88 to 454, dock 290)",
    paneTop: 88,
    paneBottom: 454,
    dockTop: 290,
    controls: [[929, 961], [969, 1001], [1059, 1087], [1103, 1118], [1118, 1165]],
  },
  {
    name: "a game running (pane 128 to 534, dock 330)",
    paneTop: 128,
    paneBottom: 534,
    dockTop: 330,
    controls: [[1016, 1064], [1072, 1104], [1161, 1189], [1205, 1220], [1236, 1283]],
  },
];

/** The controls under the answer on `screen`, the panel at the first one's hiding place. */
function underAnAnswer(screen: Screen, rule: SteamScrollRule | undefined, steamTopMargin: boolean) {
  const a = deckAnswer([[screen.controls[0]![0] - 400, screen.controls[0]![0] - 100]], screen.controls[0]![0] - screen.dockTop - 15, rule, {
    dockTop: screen.dockTop,
    paneTop: screen.paneTop,
    paneBottom: screen.paneBottom,
    steamTopMargin,
  });
  const controls = screen.controls.map((box) => a.control(box));
  const at = (el: HTMLElement): [number, number] => [a.top(el), a.bottom(el)];
  return { ...a, controls, at };
}

describe.each(SCREENS)("going Down under an answer, $name", (screen) => {
  it("each control behind the dock lands with its bottom about 6 px above the dock top (the Deck had it 86 px above)", () => {
    const a = underAnAnswer(screen, undefined, false);
    a.controls.forEach((el, i) => {
      a.land(el);
      const [top, bottom] = a.at(el);
      expect(bottom, `control ${i + 1} bottom`).toBeGreaterThanOrEqual(screen.dockTop - 16);
      expect(bottom, `control ${i + 1} bottom`).toBeLessThanOrEqual(screen.dockTop - 4);
      expect(top, `control ${i + 1} top`).toBeGreaterThanOrEqual(screen.paneTop);
    });
  });

  it("the last control (the notes block) ends where the Deck's did, 7 to 8 px above the dock", () => {
    const a = underAnAnswer(screen, undefined, false);
    a.controls.forEach((el) => a.land(el));
    const [, bottom] = a.at(a.controls[4]!);
    expect(screen.dockTop - bottom).toBeGreaterThanOrEqual(4);
    expect(screen.dockTop - bottom).toBeLessThanOrEqual(16);
  });

  describe.each(WALK_RULES)("Steam scroll rule: %s, top margin on", (rule) => {
    it("every landing is wholly between the header and the dock, and none is landed twice", () => {
      const a = underAnAnswer(screen, rule, true);
      const seen = new Set<HTMLElement>();
      a.controls.forEach((el, i) => {
        a.land(el);
        const [top, bottom] = a.at(el);
        expect(top, `control ${i + 1} under the header`).toBeGreaterThanOrEqual(screen.paneTop);
        expect(bottom, `control ${i + 1} behind the dock`).toBeLessThanOrEqual(screen.dockTop + 4);
        expect(seen.has(el)).toBe(false);
        seen.add(el);
      });
      expect(seen.size).toBe(5);
    });
  });
});
