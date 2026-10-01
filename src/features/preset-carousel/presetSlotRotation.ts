/**
 * Title: Preset slot rotation
 * Purpose: Choose the next prompt for one of the visible preset slots: a pinned QA batch walks in
 *          order, otherwise the one next-chip rule (nextChipRule.ts) over the opening seeds not yet
 *          shown, the running game's own chips and the sampled pool.
 * Used for: MainTabPresetAnimatedChips fade / static / decode modes (PRESET_VISIBLE_SLOTS across).
 * Solves: Seeds arrive in threes and the row shows two (D43, 2026-09-01), so the third seed has to
 *         wait its turn instead of never appearing; and a pinned batch longer than the row has to be
 *         walked in order, which "first entry not on screen" alone cannot do with fewer than three
 *         slots (it ping-ponged between the first two when the row was one chip, 2026-08-31).
 * Does not: Drive carousel mode, which keeps a history — see carouselState and sessionRagComposer.
 */
import {
  getFrozenTestChips,
  getRandomPresetExcluding,
  nextFrozenPresetAfter,
  type PresetPrompt,
  type PresetSamplerOptions,
} from "../../data/presets";
import {
  getSessionRagCarouselCandidates,
  pickNextChipWithSessionRag,
  type PickNextChipArgs,
} from "./composePresetSeedsWithSessionRag";

/** How many just-shown prompts stay out of the random draw, so a short pool does not stutter. */
const SLOT_ROTATION_RECENT_MAX = 3;

export type SlotRotation = {
  /** Contextual seeds not yet shown since the last seeding, in the order they were given. */
  queue: readonly PresetPrompt[];
  /** Texts shown most recently, oldest first. */
  recent: readonly string[];
  /** The last prompt any slot introduced; a pinned batch continues from here, not per slot. */
  lastIntroduced: string | null;
  /** The running game's own chips shown in the current round; one waits for the rest to have a turn. */
  gameRound: readonly string[];
  /** Opening seeds that carry the game's own mark, so a chip's kind is known from its text alone. */
  gameSeeds: readonly string[];
};

/** What the next-chip rule needs beyond the rotation itself; every field is for tests. */
export type SlotRule = Pick<PickNextChipArgs, "ragCandidates" | "random" | "againChance">;

/** The prompts that fill the row at first, and the rotation state that follows them. */
export function startSlotRotation(
  seeds: readonly PresetPrompt[],
  slotCount: number,
): { first: PresetPrompt[]; rotation: SlotRotation } {
  const first = seeds.slice(0, slotCount);
  return {
    first,
    rotation: {
      queue: seeds.slice(slotCount),
      recent: [],
      lastIntroduced: first[first.length - 1]?.text ?? null,
      gameRound: first.filter((p) => p.ragTip === true).map((p) => p.text),
      gameSeeds: seeds.filter((p) => p.ragTip === true).map((p) => p.text),
    },
  };
}

/**
 * The prompt to show after `current` in its slot, given what the other slots are showing.
 *
 * Priority: a pinned QA batch walks in order from the last entry the row introduced, skipping
 * anything still on screen. Otherwise the one next-chip rule decides (see nextChipRule): with one
 * chip showing the chip leaving sets the kind of the next, with two the chip that stays does, and
 * the opening seeds not yet shown, the game's own chips and the sampled pool all take their turns
 * through it. The pool draw excludes what is on screen and what just showed, and never returns
 * something another slot is already showing.
 */
export function nextSlotPreset(
  current: PresetPrompt,
  visibleTexts: ReadonlySet<string>,
  rotation: SlotRotation,
  options?: PresetSamplerOptions,
  rule?: SlotRule,
): { next: PresetPrompt; rotation: SlotRotation } {
  const recent = [...rotation.recent, current.text].slice(-SLOT_ROTATION_RECENT_MAX);
  // `current` is the one leaving; everything else on screen stays excluded.
  const staying = new Set([...visibleTexts].filter((t) => t !== current.text));

  const frozen = nextFrozenNotOnScreen(rotation.lastIntroduced ?? current.text, staying);
  if (frozen) {
    return { next: frozen, rotation: { ...rotation, recent, lastIntroduced: frozen.text } };
  }

  const gameTexts = new Set(rotation.gameSeeds);
  for (const c of rule?.ragCandidates ?? getSessionRagCarouselCandidates()) {
    if ((c.domain || "").toLowerCase() === "strategy") gameTexts.add(c.text);
  }
  // The anchor: the chip that stays when two are showing, the chip leaving when one is.
  const anchorText = [...staying][0] ?? current.text;
  const pick = pickNextChipWithSessionRag({
    current,
    staying,
    anchorIsGame: gameTexts.has(anchorText),
    queue: rotation.queue,
    gameRound: rotation.gameRound,
    avoid: new Set(recent),
    drawGeneral: (exclude) => {
      const drawn = getRandomPresetExcluding(new Set(exclude), options);
      // A pool too small to honour the exclusions still must not show one prompt twice.
      return staying.has(drawn.text) ? getRandomPresetExcluding(new Set(staying), options) : drawn;
    },
    ...rule,
  });
  return {
    next: pick.next,
    rotation: { ...rotation, queue: pick.queue, recent, gameRound: pick.gameRound, lastIntroduced: pick.next.text },
  };
}

/** Walk the pinned batch from `after`, skipping entries another slot is still showing. */
function nextFrozenNotOnScreen(after: string, staying: ReadonlySet<string>): PresetPrompt | null {
  let cursor = after;
  const bound = getFrozenTestChips().length + 1;
  for (let i = 0; i < bound; i++) {
    const candidate = nextFrozenPresetAfter(cursor);
    if (!candidate) return null;
    if (!staying.has(candidate.text)) return candidate;
    cursor = candidate.text;
  }
  return null;
}
