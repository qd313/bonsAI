/**
 * Title: Deciding which suggestion chips come from the game's own knowledge base
 *
 * Purpose: Given the row of static preset chips and a list of chips pulled
 * from the running game's own knowledge base, decides which of the row's
 * slots actually show a knowledge-base chip instead of the static one —
 * both when the row is first built, and each time the carousel rotates in
 * a new chip afterward. A chip actually about this game is always tried
 * before a chip about Steam Deck compatibility in general, and if any
 * knowledge-base chip is available at all, this guarantees at least one is
 * visible on screen rather than leaving it possible for none to ever show.
 *
 * Used for: composePresetSeedsWithSessionRag, and the Main tab's preset
 * carousel seed list.
 *
 * Solves: Some variety in the suggested questions without replacing the
 * whole static row every time the screen redraws, and without the row
 * ever silently having zero knowledge-base chips in it when the game is
 * actually covered by the knowledge base.
 *
 * Does not: Ask the back end for the candidate chips in the first place —
 * see the helper that fetches them for that.
 */
import type { AskModeId } from "../../data/askMode";
import type { PresetPrompt } from "../../data/presets";
import { PRESET_VISIBLE_SLOTS } from "./presetRowLayout";

/** Default per-slot probability of substituting a RAG candidate when available. */
export const SESSION_RAG_CHIP_PROBABILITY = 0.3;

export type SessionRagChipCandidate = {
  text: string;
  category: string;
  preferAskMode?: AskModeId;
  domain?: string;
};

export type ComposeSessionPresetsArgs = {
  staticSeeds: PresetPrompt[];
  ragCandidates: SessionRagChipCandidate[];
  ragProbability?: number;
  /** Injectable RNG for tests (returns [0, 1)). */
  random?: () => number;
};

/** A chip drawn from the corpus for the running game, as opposed to a shared Deck tip. */
function isGameCandidate(candidate: SessionRagChipCandidate): boolean {
  return (candidate.domain || "").toLowerCase() === "strategy";
}

function toPresetPrompt(candidate: SessionRagChipCandidate): PresetPrompt {
  return {
    text: candidate.text,
    category: candidate.category,
    ...(candidate.preferAskMode ? { preferAskMode: candidate.preferAskMode } : {}),
    // V4: badge game chips only. A shared Proton tip is not evidence this game is covered.
    ...(isGameCandidate(candidate) ? { ragTip: true } : {}),
  };
}

/**
 * G2: a chip naming something from *this game's* corpus is the one worth guaranteeing, so game
 * candidates are tried before shared compat ones. Order within each group is preserved — the
 * backend already ranks them.
 */
function orderCandidates(candidates: SessionRagChipCandidate[]): SessionRagChipCandidate[] {
  return [...candidates.filter(isGameCandidate), ...candidates.filter((c) => !isGameCandidate(c))];
}

/**
 * Random pick among the eligible candidates that share the top priority band.
 *
 * `available` is already `orderCandidates`-ordered, so its head run of game candidates (or, once
 * those are exhausted, its head run of compat ones) is the band `available[0]` belongs to — that is
 * the slice this picks within. This is what stops rotation defaulting to `available[0]` every time:
 * ranks 1-3 came back every minute while ranks 4-6 waited for 1-3 to be shown and fall out of
 * history, which happened rarely because 1-3 kept winning first (filed 2026-08-29, "Chip rotation
 * favours the top of the candidate list"). The game-before-compat preference itself is untouched —
 * a compat candidate is never picked while a game one is still eligible.
 */
function pickFromAvailable(
  available: readonly SessionRagChipCandidate[],
  random: () => number,
): SessionRagChipCandidate {
  const topBandIsGame = isGameCandidate(available[0]!);
  const band = available.filter((c) => isGameCandidate(c) === topBandIsGame);
  const index = Math.min(band.length - 1, Math.floor(random() * band.length));
  return band[index]!;
}

/**
 * For each static seed slot, independently roll for a RAG substitute (~30% default).
 * Dedupes chip texts; never invents RAG when the candidate pool is empty.
 */
export function composeSessionPresets({
  staticSeeds,
  ragCandidates,
  ragProbability = SESSION_RAG_CHIP_PROBABILITY,
  random = Math.random,
}: ComposeSessionPresetsArgs): PresetPrompt[] {
  if (staticSeeds.length === 0) {
    return [];
  }
  if (ragCandidates.length === 0) {
    return [...staticSeeds];
  }

  const usedTexts = new Set<string>();
  const ragPool = orderCandidates(ragCandidates);
  const ragTexts = new Set(ragPool.map((c) => c.text));
  let ragIndex = 0;

  const pickRag = (): PresetPrompt | null => {
    for (let i = 0; i < ragPool.length; i++) {
      const idx = (ragIndex + i) % ragPool.length;
      const candidate = ragPool[idx]!;
      if (usedTexts.has(candidate.text)) {
        continue;
      }
      ragIndex = (idx + 1) % ragPool.length;
      usedTexts.add(candidate.text);
      return toPresetPrompt(candidate);
    }
    return null;
  };

  const out: PresetPrompt[] = [];
  for (const seed of staticSeeds) {
    const rollRag = random() < ragProbability;
    if (rollRag) {
      const rag = pickRag();
      if (rag) {
        out.push(rag);
        continue;
      }
    }
    if (!usedTexts.has(seed.text)) {
      usedTexts.add(seed.text);
      out.push(seed);
      continue;
    }
    const fallbackRag = pickRag();
    out.push(fallbackRag ?? seed);
  }

  // V1, the guarantee. Rolling per slot at ~30% means three static chips come up about a third
  // of the time (0.7^3 = 34%), so a player with a covered game could open the plugin and see no
  // sign the corpus exists -- which is what Phase 4's discovery found on Deck. When candidates
  // exist, at least one slot is a RAG chip.
  //
  // The converted slot is the last one that is actually on screen — not the first, and not the
  // last seed. The first chip is the one a contextual reseed has deliberately chosen for the
  // category the user just used, and overwriting that would trade one kind of relevance for
  // another. And seeds arrive in threes while the row shows PRESET_VISIBLE_SLOTS of them (two,
  // D43 2026-09-01): converting the third seed would satisfy the guarantee somewhere nobody can
  // see, which is the original Phase 4 discovery all over again.
  if (!out.some((prompt) => ragTexts.has(prompt.text))) {
    const forced = pickRag();
    if (forced) {
      out[Math.min(out.length, PRESET_VISIBLE_SLOTS) - 1] = forced;
    }
  }

  return out;
}

export type PickNextCarouselChipArgs = {
  /** Every text in carousel history. A chip already here is never picked again. */
  historyTexts: ReadonlySet<string>;
  /** The text(s) on screen right now — see carouselState.visibleWindowTexts. */
  visibleTexts: ReadonlySet<string>;
  ragCandidates: SessionRagChipCandidate[];
  /** What to show when no RAG chip is chosen; the caller binds this to getRandomPresetExcluding. */
  staticFallback: () => PresetPrompt;
  ragProbability?: number;
  /** Injectable RNG for tests (returns [0, 1)). */
  random?: () => number;
};

/**
 * The chip the auto-advance tick should append next.
 *
 * `composeSessionPresets` above runs **once**, when the carousel is seeded. Rotation then
 * replenished itself straight from the static preset pool, so every corpus chip was carried out of
 * the window within about four ticks and none could ever come back — measured on device
 * 2026-08-29 as "present to 21s, gone from 24s, never again", with the backend supplying eight
 * candidates the whole time. The guarantee was real but applied at one instant; this is the same
 * guarantee applied to the tick.
 *
 * The two text sets are not interchangeable. Dedupe reads `historyTexts` so a chip is not repeated
 * while it is still remembered; the guarantee reads `visibleTexts`, because a corpus chip sitting
 * in history off screen is exactly the state the user complains about.
 *
 * Which eligible candidate wins — the guarantee pick and the roll pick alike — is a random draw
 * within the top-priority band (see `pickFromAvailable`), not always the first entry.
 */
export function pickNextCarouselChip({
  historyTexts,
  visibleTexts,
  ragCandidates,
  staticFallback,
  ragProbability = SESSION_RAG_CHIP_PROBABILITY,
  random = Math.random,
}: PickNextCarouselChipArgs): PresetPrompt {
  if (ragCandidates.length === 0) {
    return staticFallback();
  }
  const available = orderCandidates(ragCandidates).filter((c) => !historyTexts.has(c.text));
  if (available.length === 0) {
    return staticFallback();
  }
  // The guarantee, at rotation time: nothing on screen is from the corpus, so the next chip is —
  // whichever eligible candidate the random pick lands on, not always the top-ranked one.
  const corpusOnScreen = ragCandidates.some((c) => visibleTexts.has(c.text));
  if (!corpusOnScreen) {
    return toPresetPrompt(pickFromAvailable(available, random));
  }
  return random() < ragProbability
    ? toPresetPrompt(pickFromAvailable(available, random))
    : staticFallback();
}
