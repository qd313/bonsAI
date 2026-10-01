/**
 * Title: Which chip comes next (one rule for all four chip styles)
 *
 * Purpose: Decide what a chip spot shows when it changes, for fade, carousel, static and decode alike.
 * The kind of the next chip follows from the chip that anchors the choice: after a general chip the
 * next one is one of the running game's own, and after a game chip the next is a game chip again with
 * chance GAME_CHIP_AGAIN_CHANCE. "Anchor" is the chip leaving when one chip is showing, and the chip
 * that stays when two are showing. So with one chip at least every second chip is the game's, with
 * two chips one of the pair is always the game's, and the game's share overall is about 55 in 100.
 *
 * Used for: presetSlotRotation (fade, static, decode) and the carousel's auto-advance tick.
 *
 * Solves: Plan 70's finding (PHASE4-CHIPS-01, CHIP-ROTATION-01): with a game running and one chip
 * showing, the game's own chip showed for 17 of 420 seconds and never came back, because three of the
 * four styles refilled from the fixed pool only and the fourth had its own, different rule. Also: the
 * game's chips are dealt in turns, so one does not come back while the others have not had theirs, and
 * never the same chip twice running unless the game has only one.
 *
 * Does not: Know about timing (see presetPace.ts), pinned test batches (the callers check those first
 * and a pinned batch always wins), or drawing. The random source is a parameter so tests are exact.
 */
import type { PresetPrompt } from "../../data/presets";
import { isGameCandidate, type SessionRagChipCandidate, toPresetPrompt } from "./sessionRagComposer";

/** After a game chip, the chance the next chip is one of the game's again. The maintainer's to tune. */
export const GAME_CHIP_AGAIN_CHANCE = 0.2;
/**
 * Chance that a general draw is a shared Deck tip from the library (compat) instead of the fixed
 * pool. They count as general, never as the game's own.
 */
const SHARED_TIP_CHANCE = 0.1;

export type NextChipArgs = {
  /** The chip leaving this spot. */
  current: PresetPrompt | null;
  /** Texts of chips that stay on screen (the other spot at two chips, none at one chip). */
  staying: ReadonlySet<string>;
  /** Whether the anchor chip is a game chip: the leaving one at one chip, the staying one at two. */
  anchorIsGame: boolean;
  /** Opening chips that have not had their turn yet, in order. */
  queue: readonly PresetPrompt[];
  /** Game chips already shown in the current round; a chip does not return until the round is over. */
  gameRound: readonly string[];
  /** Texts to keep out of the general draw (recently shown, or still in the carousel's history). */
  avoid: ReadonlySet<string>;
  /** Draws a general chip from the fixed pool, honouring the given exclusions. */
  drawGeneral: (exclude: ReadonlySet<string>) => PresetPrompt;
  /** What the back end offered for the running game (the list the hook last published). */
  ragCandidates: readonly SessionRagChipCandidate[];
  random?: () => number;
  /** Chance of another game chip after a game chip; the Developer-tab override sets it, else 0.2. */
  againChance?: number;
};

export type NextChipPick = {
  next: PresetPrompt;
  queue: readonly PresetPrompt[];
  gameRound: readonly string[];
};

/** The queue with one chip taken out. */
const without = (queue: readonly PresetPrompt[], text: string) => queue.filter((p) => p.text !== text);

/**
 * The chip a spot shows next. The kind comes from the anchor chip (see the header); within the kind:
 * the opening chips not yet shown go first, in order; then the game's own chips that have not had a
 * turn this round (a random one, never one on screen, never the one just shown unless it is the
 * game's only); a general chip is the opening list's next general one, now and then a shared Deck
 * tip, otherwise a draw from the fixed pool. When the game has no chips at all the opening list and
 * then the pool, as before this rule existed.
 */
export function chooseNextChip(args: NextChipArgs): NextChipPick {
  const random = args.random ?? Math.random;
  const candidates = args.ragCandidates;
  const againChance = args.againChance ?? GAME_CHIP_AGAIN_CHANCE;
  const { current, staying } = args;
  const leavingText = current?.text ?? null;
  const blocked = (text: string) => staying.has(text) || text === leavingText;

  const gameTexts = new Set(candidates.filter(isGameCandidate).map((c) => c.text));
  const isGame = (p: PresetPrompt) => p.ragTip === true || gameTexts.has(p.text);
  // An opening chip that is the chip on screen, or is on screen elsewhere, has had its turn.
  const queue = args.queue.filter((p) => !blocked(p.text));
  const queuedGames = queue.filter(isGame);
  const knownGameTexts = new Set([...gameTexts, ...queuedGames.map((p) => p.text)]);

  const result = (next: PresetPrompt, rest: readonly PresetPrompt[]): NextChipPick => ({
    next,
    queue: rest,
    gameRound: isGame(next) && !args.gameRound.includes(next.text) ? [...args.gameRound, next.text] : args.gameRound,
  });
  const general = (): NextChipPick => {
    const queuedGeneral = queue.find((p) => !isGame(p));
    if (queuedGeneral) return result(queuedGeneral, without(queue, queuedGeneral.text));
    const sharedTips = candidates.filter((c) => !isGameCandidate(c) && !blocked(c.text) && !args.avoid.has(c.text));
    if (sharedTips.length > 0 && random() < SHARED_TIP_CHANCE) {
      const tip = sharedTips[Math.min(sharedTips.length - 1, Math.floor(random() * sharedTips.length))]!;
      return result(toPresetPrompt(tip), queue);
    }
    return result(args.drawGeneral(new Set([...staying, ...args.avoid, ...(leavingText ? [leavingText] : [])])), queue);
  };

  // The game has no chips at all: everything behaves as before this rule existed.
  if (knownGameTexts.size === 0) {
    const head = queue[0];
    return head ? result(head, queue.slice(1)) : general();
  }

  const wantGame = !args.anchorIsGame || random() < againChance;
  if (!wantGame) return general();

  // The game's own chips among the opening ones come first, in the order they were dealt.
  const queuedGame = queuedGames[0];
  if (queuedGame) return result(queuedGame, without(queue, queuedGame.text));

  const queueTexts = new Set(queue.map((p) => p.text));
  const fresh = candidates.filter((c) => isGameCandidate(c) && !queueTexts.has(c.text) && !blocked(c.text));
  const pick = (from: readonly SessionRagChipCandidate[], round: readonly string[]): NextChipPick | null => {
    if (from.length === 0) return null;
    const chosen = from[Math.min(from.length - 1, Math.floor(random() * from.length))]!;
    return {
      next: toPresetPrompt(chosen),
      queue,
      gameRound: round.includes(chosen.text) ? round : [...round, chosen.text],
    };
  };
  const notAvoided = fresh.filter((c) => !args.avoid.has(c.text));
  // Prefer a chip that has not had its turn this round and is not still in the history; ease those
  // two conditions one at a time (a short list of game chips has to come round again).
  const unshown = (list: readonly SessionRagChipCandidate[]) => list.filter((c) => !args.gameRound.includes(c.text));
  const picked =
    pick(unshown(notAvoided), args.gameRound) ??
    pick(unshown(fresh), args.gameRound) ??
    pick(notAvoided, []) ??
    pick(fresh, []);
  if (picked) return picked;
  // Only the chip that is leaving is left, and it is the game's only chip: it may run twice.
  if (current && knownGameTexts.size === 1 && knownGameTexts.has(current.text) && !staying.has(current.text)) {
    return { next: current, queue, gameRound: args.gameRound };
  }
  return general();
}
