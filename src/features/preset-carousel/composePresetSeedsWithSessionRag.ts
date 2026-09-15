/**
 * Title: Mixing knowledge-base suggestion chips into the preset carousel
 *
 * Purpose: The row of suggested-question chips on the Main tab can either
 * be built purely from static preset text, or have some of its chips
 * swapped for ones pulled from the current game's own knowledge base. This
 * file does that swap — for both the chips the carousel starts with and
 * the ones it rotates in afterward — unless a tester has frozen the
 * carousel to an exact, repeatable set of chips for testing, in which case
 * it leaves the frozen set alone.
 *
 * Used for: The Main tab's preset carousel, both when it is first built
 * and on every rotation tick afterward.
 *
 * Solves: A tester who has frozen the carousel to a known set of chips
 * (through a setting or a build-time flag) needs that exact set to stay
 * put — a knowledge-base chip getting mixed in partway through would end
 * the test run without saying so. This is where that is checked and
 * respected.
 *
 * Does not: Move the carousel's own highlight — see carouselState and the
 * Main tab's carousel screen for that.
 */
import { TEMP_PRESET_CAROUSEL_FROZEN, frozenTestChipsActive } from "../../data/presets";
import type { PresetPrompt } from "../../data/presets";
import {
  composeSessionPresets,
  pickNextCarouselChip,
  type PickNextCarouselChipArgs,
  type SessionRagChipCandidate,
} from "./sessionRagComposer";

export type ComposePresetSeedsWithSessionRagArgs = {
  staticSeeds: PresetPrompt[];
  ragCandidates: SessionRagChipCandidate[];
  ragProbability?: number;
  random?: () => number;
};

/** Apply Session RAG mix unless a frozen QA batch is active. */
export function composePresetSeedsWithSessionRag(args: ComposePresetSeedsWithSessionRagArgs): PresetPrompt[] {
  // A frozen batch means the tester chose these exact chips. Mixing a RAG chip in would replace
  // one of them and end the run without saying so, which is the failure this gate exists for.
  if ((TEMP_PRESET_CAROUSEL_FROZEN || frozenTestChipsActive()) && args.staticSeeds.length >= 3) {
    return [...args.staticSeeds];
  }
  return composeSessionPresets(args);
}

/**
 * Session RAG candidates for the running game, as last fetched.
 *
 * Module-level for the same reason `runtimeFrozenChipTexts` is (see data/presets.ts): the carousel
 * tick needs it, the tick lives inside a memoised component five props deep from the hook that
 * fetches it, and the value is global by nature — there is one running game. The alternative is
 * threading a list through useBonsaiAskOrchestration, index.tsx, useMainTabPayload, MainTab,
 * MainTabPresetRow and MainTabPresetAnimatedChips plus that component's hand-written memo compare,
 * for a value none of those layers has any opinion about.
 */
let sessionRagCandidates: SessionRagChipCandidate[] = [];
let sessionRagRotationProbability: number | undefined;

/**
 * Publish the candidates the carousel tick may draw from. Empty restores static-only rotation.
 *
 * `ragProbability` carries the Developer-tab QA override the compose path already honours. Without
 * it the override only applied to the three seeded slots and rotation went straight back to rolling
 * 0.3, so "force session RAG chips" forced half the carousel — and the half it did not force is the
 * one a QA row watching the carousel over time is actually reading.
 */
export function setSessionRagCarouselCandidates(
  candidates: SessionRagChipCandidate[],
  options?: { ragProbability?: number },
): void {
  sessionRagCandidates = [...candidates];
  sessionRagRotationProbability = options?.ragProbability;
}

export type PickCarouselChipArgs = Omit<PickNextCarouselChipArgs, "ragCandidates"> & {
  /** Defaults to the published list; passed explicitly only by tests. */
  ragCandidates?: SessionRagChipCandidate[];
};

/** Pick the next rotation chip, standing down entirely while a frozen QA batch is in force. */
export function pickCarouselChipWithSessionRag(args: PickCarouselChipArgs): PresetPrompt {
  // Same gate as the compose path: a frozen batch means the tester chose these exact chips, and
  // rotating a RAG chip in would end the run without saying so.
  if (TEMP_PRESET_CAROUSEL_FROZEN || frozenTestChipsActive()) {
    return args.staticFallback();
  }
  return pickNextCarouselChip({
    ...args,
    ragCandidates: args.ragCandidates ?? sessionRagCandidates,
    ragProbability: args.ragProbability ?? sessionRagRotationProbability,
  });
}
