/**
 * Title: The chip row over minutes, in every style
 * Purpose: Pin what the Deck check looks at, with fake time and a seeded random source. With a game
 *          running that has its own chips: with one chip showing, never two general chips in a row and a
 *          little over half of all chips the game's own; with two chips, one of the two is always the
 *          game's own. Each of the four styles (fade, carousel, static, decode) must obey the same rule.
 * Used for: plan 78 helper F, commit 1 (which chip comes next). Before it, three styles refilled from
 *           the fixed pool only, so the game's chips showed once and never came back (plan 70,
 *           PHASE4-CHIPS-01 and CHIP-ROTATION-01: 17 of 420 seconds).
 * Does not: Prove the Deck. The device checks P78-TIP-CHIP and P78-CHIP-PACE do that.
 */
import { afterEach, describe, expect, it } from "vitest";
import { setFrozenTestChips } from "../data/presets";
import { simulateChipRow, type ChipEvent, type ChipStyle } from "../test-harness/chipRowSimulation";

const STYLES: ChipStyle[] = ["fade", "carousel", "static", "decode"];
const SEEDS = [11, 29];
/** Seven minutes for the default style, three for the others, as the Deck check runs them. */
const minutesFor = (style: ChipStyle) => (style === "fade" ? 7 : 3);

afterEach(() => setFrozenTestChips([]));

/** Chips in the order they appeared, leaving out the opening chips (they are dealt, not drawn). */
function appeared(events: ChipEvent[]): ChipEvent[] {
  return [...events].sort((a, b) => a.t - b.t);
}

describe.each(STYLES)("%s style with a game that has its own chips", (style) => {
  it("one chip: never two general chips in a row, and the game's own are a little over half", () => {
    let game = 0;
    let all = 0;
    for (const seed of SEEDS) {
      const { events } = simulateChipRow({ style, single: true, minutes: minutesFor(style), seed });
      const chips = appeared(events);
      for (let i = 1; i < chips.length; i++) {
        expect(
          chips[i - 1]!.game || chips[i]!.game,
          `${style} seed ${seed}: "${chips[i - 1]!.text}" then "${chips[i]!.text}" are both general`,
        ).toBe(true);
      }
      game += chips.filter((c) => c.game).length;
      all += chips.length;
    }
    const share = game / all;
    expect(share, `${game} of ${all} chips were the game's own`).toBeGreaterThanOrEqual(0.5);
    expect(share, `${game} of ${all} chips were the game's own`).toBeLessThanOrEqual(2 / 3);
  }, 240_000);

  it("two chips: one of the two on screen is always the game's own", () => {
    for (const seed of SEEDS) {
      const { gameOnScreen } = simulateChipRow({ style, single: false, minutes: minutesFor(style), seed });
      const bare = gameOnScreen.filter((s) => s.total === 2 && s.count === 0);
      expect(bare.length, `${style} seed ${seed}: first at ${bare[0]?.t} ms`).toBe(0);
    }
  }, 240_000);
});
