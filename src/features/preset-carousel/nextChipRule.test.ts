import { describe, expect, it } from "vitest";
import type { PresetPrompt } from "../../data/presets";
import { chooseNextChip, GAME_CHIP_AGAIN_CHANCE, type NextChipArgs } from "./nextChipRule";
import type { SessionRagChipCandidate } from "./sessionRagComposer";

const general = (text: string): PresetPrompt => ({ text, category: "general" });
const gameChip = (text: string): PresetPrompt => ({ text, category: "strategy", ragTip: true });
const game = (text: string): SessionRagChipCandidate => ({ text, category: "strategy", domain: "strategy" });
const tip = (text: string): SessionRagChipCandidate => ({ text, category: "troubleshooting", domain: "compat" });

const GAME = [game("G1"), game("G2"), game("G3")];
let poolCounter = 0;
/** A general draw that never repeats, so a test can tell it from the game's chips. */
const drawGeneral = () => general(`pool-${++poolCounter}`);

function args(over: Partial<NextChipArgs>): NextChipArgs {
  return {
    current: general("leaving"),
    staying: new Set<string>(),
    anchorIsGame: false,
    queue: [],
    gameRound: [],
    avoid: new Set<string>(),
    drawGeneral,
    ragCandidates: GAME,
    random: () => 0.99,
    ...over,
  };
}

describe("the next-chip rule", () => {
  it("the chance of another game chip after a game chip is one in five", () => {
    expect(GAME_CHIP_AGAIN_CHANCE).toBe(0.2);
  });

  it("after a general chip the next chip is the game's own", () => {
    const pick = chooseNextChip(args({ anchorIsGame: false }));
    expect(GAME.map((c) => c.text)).toContain(pick.next.text);
    expect(pick.next.ragTip).toBe(true);
  });

  it("after a game chip the next is the game's again only on a roll under 0.2", () => {
    const again = chooseNextChip(args({ current: gameChip("G1"), anchorIsGame: true, random: () => 0.19 }));
    expect(again.next.ragTip).toBe(true);
    const other = chooseNextChip(args({ current: gameChip("G1"), anchorIsGame: true, random: () => 0.2 }));
    expect(other.next.ragTip).toBeUndefined();
    expect(other.next.text).toMatch(/^pool-/);
  });

  it("with two chips, the chip that stays decides: a general one gets a game chip beside it", () => {
    const pick = chooseNextChip(args({ staying: new Set(["pool-stays"]), anchorIsGame: false }));
    expect(pick.next.ragTip).toBe(true);
  });

  it("with two chips, a game chip that stays leaves the incoming chip general unless the roll is under 0.2", () => {
    const stays = new Set(["G2"]);
    expect(chooseNextChip(args({ staying: stays, anchorIsGame: true, random: () => 0.5 })).next.ragTip).toBeUndefined();
    const again = chooseNextChip(args({ staying: stays, anchorIsGame: true, random: () => 0.1 }));
    expect(again.next.ragTip).toBe(true);
    expect(again.next.text).not.toBe("G2");
  });

  it("a game chip does not come back while the others have not had a turn, and never twice running", () => {
    let round: readonly string[] = [];
    let current = general("start");
    const seen: string[] = [];
    for (let i = 0; i < 9; i++) {
      const pick = chooseNextChip(args({ current, gameRound: round, anchorIsGame: false }));
      seen.push(pick.next.text);
      round = pick.gameRound;
      current = pick.next;
      // A general chip between each, as one chip showing produces.
      current = general(`between-${i}`);
    }
    // Three rounds of the three game chips, none repeated inside a round.
    for (let r = 0; r < 3; r++) expect(new Set(seen.slice(r * 3, r * 3 + 3)).size).toBe(3);
  });

  it("never the same game chip twice running while the game has others", () => {
    let round: readonly string[] = [];
    let current: PresetPrompt = gameChip("G1");
    let last = "G1";
    for (let i = 0; i < 30; i++) {
      const pick = chooseNextChip(args({ current, gameRound: round, anchorIsGame: true, random: () => 0 }));
      expect(pick.next.text).not.toBe(last);
      last = pick.next.text;
      round = pick.gameRound;
      current = pick.next;
    }
  });

  it("deals the opening chips in order, each getting its turn, with the game's own where the rule asks", () => {
    // Opening list after the first chip: a general, the game's own, another general.
    let queue: readonly PresetPrompt[] = [general("open-b"), gameChip("G1"), general("open-c")];
    let current = general("open-a");
    const shown: string[] = [];
    for (let i = 0; i < 4; i++) {
      const anchorIsGame = current.ragTip === true;
      const pick = chooseNextChip(args({ current, queue, anchorIsGame, random: () => 0.99 }));
      shown.push(pick.next.text);
      queue = pick.queue;
      current = pick.next;
    }
    // General first, so the game's own comes next; the rule alternates, and the opening list is
    // never dropped: its three chips come in the order they were dealt.
    expect(shown.filter((t) => ["G1", "open-b", "open-c"].includes(t))).toEqual(["G1", "open-b", "open-c"]);
    expect(queue).toEqual([]);
  });

  it("a game chip dealt in the opening list is not drawn a second time from the candidates", () => {
    const pick = chooseNextChip(args({ queue: [gameChip("G1"), general("open-b")], anchorIsGame: false }));
    expect(pick.next.text).toBe("G1");
    const following = chooseNextChip(
      args({ current: pick.next, queue: pick.queue, gameRound: pick.gameRound, anchorIsGame: true, random: () => 0.1 }),
    );
    expect(following.next.text).not.toBe("G1");
  });

  it("shared Deck tips count as general: a tip leaving is followed by a game chip", () => {
    const pick = chooseNextChip(
      args({ current: general("Any known Proton issues for this game?"), ragCandidates: [...GAME, tip("Any known Proton issues for this game?")] }),
    );
    expect(pick.next.ragTip).toBe(true);
  });

  it("a shared Deck tip is never the 'game's own' choice", () => {
    for (let i = 0; i < 20; i++) {
      const pick = chooseNextChip(args({ ragCandidates: [...GAME, tip("T1"), tip("T2")], random: () => (i % 10) / 10 }));
      expect(["T1", "T2"]).not.toContain(pick.next.text);
    }
  });

  it("when the game has no chips at all, the opening list then the pool, as before", () => {
    const first = chooseNextChip(args({ ragCandidates: [], queue: [general("open-b")] }));
    expect(first.next.text).toBe("open-b");
    const second = chooseNextChip(args({ ragCandidates: [], queue: first.queue }));
    expect(second.next.text).toMatch(/^pool-/);
  });

  it("with only one game chip it may run twice at one chip, but with two chips it never sits twice at once", () => {
    const only = [game("ONLY")];
    const one = chooseNextChip(args({ current: gameChip("ONLY"), ragCandidates: only, anchorIsGame: true, random: () => 0 }));
    expect(one.next.text).toBe("ONLY");
    const two = chooseNextChip(
      args({ current: general("x"), staying: new Set(["ONLY"]), ragCandidates: only, anchorIsGame: true, random: () => 0 }),
    );
    expect(two.next.text).toMatch(/^pool-/);
  });

  it("the Developer override (a chance of 1) makes every chip the game's", () => {
    const pick = chooseNextChip(args({ current: gameChip("G1"), anchorIsGame: true, againChance: 1, random: () => 0.99 }));
    expect(pick.next.ragTip).toBe(true);
  });
});
