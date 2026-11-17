/**
 * Title: Preset chip shared timing and seed helpers
 *
 * Purpose: The small pieces both chip looks in MainTabPresetAnimatedChips.tsx need alike —
 * the per-slot stagger, the reduced-motion check, seedsKeyFrom, normalizeThreeSeeds (which
 * fills out a short seed list to exactly three prompts), and the row's own prop contract
 * (MainTabPresetAnimatedChipsProps).
 *
 * Used for: MainTabPresetPlainSlots (the static look) and MainTabPresetDecodeSlots, and the row
 * above them (MainTabPresetRow reads prefersReducedMotion).
 *
 * Solves: Keeps the per-slot stagger and the "always exactly three seeds" contract in one place, so the two chip
 * looks cannot quietly drift apart on either. The prop type lives here too (not in the component
 * file) so that MainTabPresetDecodeSlots, in its own file, can read it without importing back
 * from the component file that imports MainTabPresetDecodeSlots — an import cycle the front-end
 * ratchet catches.
 *
 * Does not: Decide which animation mode is active, or draw anything.
 */
import type React from "react";
import { getRandomPresets, type PresetPrompt, type PresetSamplerOptions } from "./presets";
import type { AskModeId } from "../ask/bar/askMode";

/** Stagger each slot's first appearance so the chips never move in lockstep. */
const PRESET_SLOT_STAGGER_MS: readonly number[] = [750, 1300, 1700];
export function slotStaggerMs(slotIndex: number): number {
  return PRESET_SLOT_STAGGER_MS[slotIndex] ?? PRESET_SLOT_STAGGER_MS[PRESET_SLOT_STAGGER_MS.length - 1]!;
}

/** A key for a list of seeds: it changes when any seed's words change, so a row can tell it was reseeded. */
export function seedsKeyFrom(seeds: PresetPrompt[]): string {
  return seeds.map((s) => s.text).join("\u0000");
}

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

/** decode = Ghost in the Shell scramble-to-resolve reveal (the default); static = plain swaps, for less motion. */
export type PresetChipAnimationMode = "static" | "decode";

export type MainTabPresetAnimatedChipsProps = {
  /** When upstream presets change (e.g. after ask), the row re-seeds from this list. */
  seeds: PresetPrompt[];
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  /** decode (the default) or static; see PresetChipAnimationMode. */
  animationMode?: PresetChipAnimationMode;
  /** If a preset declares `preferAskMode`, apply it when the chip is chosen. */
  onPreferAskMode?: (mode: AskModeId) => void;
  /** D-pad Down from any chip hands the ring to the Ask field; returns whether it moved. */
  onCarouselExitDown?: () => boolean | void;
  /** When true, KB-advice static seeds are excluded from timer-driven re-samples. */
  useLocalKnowledgeBase?: boolean;
  /**
   * Bumped by MainTabPresetRow every time an Ask completes, so every mode's walk restarts from
   * the reseeded chips even when the reseed produced the exact same three seeds. A pinned QA batch always
   * returns its first three entries verbatim (`applyTempFrozenCarousel` in data/presets.ts), so
   * `seedsKeyFrom` cannot tell an Ask happened from this alone (D58 #3).
   */
  askRestartToken?: number;
  /**
   * True while an answer is being written. No mode starts a new chip change while it is set: the
   * panel is busy, and a chip that changes under the ring can take a press meant for another
   * (plan 70, helper S). A change already under way finishes. Read through a ref at each cycle
   * boundary, never an effect dependency, so setting it neither resets nor animates the row; the
   * completed Ask's `askRestartToken` bump is what starts the walk again.
   */
  holdStill?: boolean;
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
