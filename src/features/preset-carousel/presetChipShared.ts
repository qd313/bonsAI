/**
 * Title: Preset chip shared timing and seed helpers
 *
 * Purpose: The small pieces every animation mode in MainTabPresetAnimatedChips.tsx needs alike —
 * the fade durations, the per-slot stagger, the reduced-motion check, normalizeThreeSeeds (which
 * fills out a short seed list to exactly three prompts), and the row's own prop contract
 * (MainTabPresetAnimatedChipsProps).
 *
 * Used for: MainTabPresetAnimatedChipsInner (fade/static), MainTabPresetDecodeSlots and
 * MainTabPresetSidewaysCarousel, all in src/components/MainTabPresetAnimatedChips.tsx.
 *
 * Solves: Keeps the numbers that have to agree with the CSS transition durations (the fade
 * timings) and the "always exactly three seeds" contract in one place, so the four animation
 * modes cannot quietly drift apart on either. The prop type lives here too (not in the component
 * file) so that MainTabPresetDecodeSlots, in its own file, can read it without importing back
 * from the component file that imports MainTabPresetDecodeSlots — an import cycle the front-end
 * ratchet catches.
 *
 * Does not: Decide which animation mode is active, or draw anything.
 */
import type React from "react";
import { getRandomPresets, type PresetPrompt, type PresetSamplerOptions } from "../../data/presets";
import type { AskModeId } from "../../data/askMode";

/*
 * Fade timings for chips side by side: while one chip fades, the other is still there, so a slow
 * out and a quicker in read as a calm swap rather than an empty row. They were cut to 500/500 while
 * the row was one chip (2026-08-31) because that chip left the row blank for three seconds per
 * cycle; restored 2026-09-01 with the second chip.
 */
/** Fade-in duration (ms); must match the slot wrapper transition when opacity increases. */
export const PRESET_CAROUSEL_FADE_IN_MS = 1000;
/** Fade-out duration (ms); must match the slot wrapper transition when opacity decreases. */
export const PRESET_CAROUSEL_FADE_OUT_MS = 2000;
/** Carousel schedules new preset cycles for this long after mount/re-seed; in-flight fades still complete, then no more swaps until remount. */
export const PRESET_CAROUSEL_ACTIVE_MS = 60_000;
/** Stagger each slot's first appearance so the chips never move in lockstep. */
const PRESET_SLOT_STAGGER_MS: readonly number[] = [750, 1300, 1700];
export function slotStaggerMs(slotIndex: number): number {
  return PRESET_SLOT_STAGGER_MS[slotIndex] ?? PRESET_SLOT_STAGGER_MS[PRESET_SLOT_STAGGER_MS.length - 1]!;
}

export type SlotFade = { opacity: number; transitionMs: number };

/**
 * Three contextual seeds still arrive from upstream (and a frozen QA batch is applied at count
 * 3), even though PRESET_VISIBLE_SLOTS show at a time — the slot rotation queues the rest.
 */
export function normalizeThreeSeeds(
  seeds: PresetPrompt[],
  samplerOptions?: PresetSamplerOptions,
): [PresetPrompt, PresetPrompt, PresetPrompt] {
  const fallback = getRandomPresets(3, samplerOptions);
  return [
    seeds[0] ?? fallback[0]!,
    seeds[1] ?? fallback[1]!,
    seeds[2] ?? fallback[2]!,
  ];
}

export type PresetChipAnimationMode = "fade" | "carousel" | "static" | "decode";

export type MainTabPresetAnimatedChipsProps = {
  /** When upstream presets change (e.g. after ask), carousel re-seeds from this list. */
  seeds: PresetPrompt[];
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  /** When false, chips stay fully opaque and prompts rotate after hold without opacity transitions. */
  fadeAnimationEnabled?: boolean;
  /** fade = opacity crossfade; carousel = sideways window on a history; static = no opacity animation; decode = Ghost in the Shell scramble-to-resolve reveal. */
  animationMode?: PresetChipAnimationMode;
  /** If a preset declares `preferAskMode`, apply it when the chip is chosen. */
  onPreferAskMode?: (mode: AskModeId) => void;
  /** D-pad Down from any chip hands the ring to the Ask field; returns whether it moved. */
  onCarouselExitDown?: () => boolean | void;
  /** When true, KB-advice static seeds are excluded from timer-driven re-samples. */
  useLocalKnowledgeBase?: boolean;
  /**
   * Bumped by MainTabPresetRow every time an Ask completes, so every mode's 60-second walk
   * restarts even when the reseed produced the exact same three seeds. A pinned QA batch always
   * returns its first three entries verbatim (`applyTempFrozenCarousel` in data/presets.ts), so
   * `seedsKeyFrom` cannot tell an Ask happened from this alone (D58 #3).
   */
  askRestartToken?: number;
  /**
   * "One suggestion chip" setting (roadmap `[chips]` ★★★): when true the row shows a single chip
   * with the whole column instead of `PRESET_VISIBLE_SLOTS` side by side. Off (two chips) is the
   * shipped default. See `effectivePresetVisibleSlots`.
   */
  presetSingleChip?: boolean;
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
