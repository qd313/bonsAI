/**
 * Title: Preset carousel state helpers
 * Purpose: Constants and pure functions for the sideways preset carousel: history, timing, and
 *          which chips the window shows.
 * Used for: MainTab preset carousel component and D-pad browse/auto-advance logic.
 * Solves: Bounded history, manual pause, and the window-start math that keeps the focused chip on
 *         screen as the row slides left and right.
 * Does not: Fetch RAG candidates — see sessionRagComposer and sessionRagChipCandidates.
 */
import { getFrozenTestChips, nextFrozenPresetAfter, type PresetPrompt } from "../../data/presets";
import { PRESET_VISIBLE_SLOTS } from "./presetRowLayout";

/** CSS slide transition duration on the track (ms). */
export const CAROUSEL_SLIDE_MS = 550;
/** Max presets kept in scrollable history (limits how far Left can walk back). */
export const CAROUSEL_HISTORY_MAX = 5;
/** Pause auto-advance after manual D-pad browse (ms). */
export const CAROUSEL_MANUAL_PAUSE_MS = 12_000;

export function seedsKeyFrom(seeds: PresetPrompt[]): string {
  return seeds.map((s) => s.text).join("\u0000");
}

export function clampHistory(history: PresetPrompt[]): PresetPrompt[] {
  if (history.length <= CAROUSEL_HISTORY_MAX) return history;
  const trim = history.length - CAROUSEL_HISTORY_MAX;
  return history.slice(trim);
}

/**
 * Index of the leftmost chip in the visible window.
 *
 * The row is a `windowSize`-wide window on the history, which runs left to right (sideways since
 * 2026-09-01; it was a vertical stack before). The focused chip sits at the right edge, so a new
 * chip appended by auto-advance slides in from the right and the one before it stays on screen —
 * unless the history is shorter than the window, in which case the window starts at 0.
 */
export function carouselWindowStart(
  focusIndex: number,
  windowSize: number = PRESET_VISIBLE_SLOTS,
): number {
  return Math.max(0, focusIndex - (windowSize - 1));
}

/**
 * The texts actually on screen — the window around the focused chip.
 *
 * Distinct from "every text in history" on purpose. History runs to CAROUSEL_HISTORY_MAX and the
 * window shows `windowSize` of it, so a chip can be in history and off screen. Anything asking "is
 * the user currently seeing one of these?" must ask this, not the history set.
 */
export function visibleWindowTexts(
  history: readonly PresetPrompt[],
  focusIndex: number,
  windowSize: number = PRESET_VISIBLE_SLOTS,
): Set<string> {
  const start = carouselWindowStart(focusIndex, windowSize);
  return new Set(history.slice(start, start + windowSize).map((p) => p.text));
}

export type CarouselAdvanceResult = {
  history: PresetPrompt[];
  focusIndex: number;
};

/**
 * Auto-advance: move focus one to the right; append a new preset when already at the end.
 */
export function advanceCarouselFocus(
  history: PresetPrompt[],
  focusIndex: number,
  nextPreset: PresetPrompt,
): CarouselAdvanceResult {
  if (history.length === 0) {
    return { history: [nextPreset], focusIndex: 0 };
  }
  if (focusIndex < history.length - 1) {
    return { history, focusIndex: focusIndex + 1 };
  }
  const merged = clampHistory([...history, nextPreset]);
  return { history: merged, focusIndex: merged.length - 1 };
}

/**
 * The next pinned QA batch entry not already in `history`, walking forward from the newest
 * entry's text and wrapping at the end of the batch; null when no batch is pinned or every pinned
 * entry is already represented in history.
 *
 * D58 #3: `CAROUSEL_HISTORY_MAX` caps how many chips the carousel remembers, and a batch longer
 * than that cannot be reached by auto-advance alone once the user starts browsing it by hand —
 * auto-advance stands down entirely while a chip has focus (see MainTabPresetAnimatedChips), and
 * walking a pinned batch with the D-pad is exactly that. Right at the last chip calls this to pull
 * the next entry in directly, the same way Left at the window's edge already pulls an earlier one
 * back into view via `requestFocus`.
 *
 * Mirrors `nextFrozenNotOnScreen` in presetSlotRotation — the fade/static/decode modes' per-slot
 * version of the same "batch longer than what is visible" problem — rather than importing it: that
 * module documents itself as not driving carousel mode, and history (not a single slot's
 * neighbours) is what the carousel needs to walk against.
 */
export function nextFrozenHistoryEntry(history: readonly PresetPrompt[]): PresetPrompt | null {
  const last = history[history.length - 1];
  if (!last) return null;
  const exclude = new Set(history.map((p) => p.text));
  let cursor = last.text;
  const bound = getFrozenTestChips().length + 1;
  for (let i = 0; i < bound; i++) {
    const candidate = nextFrozenPresetAfter(cursor);
    if (!candidate) return null;
    if (!exclude.has(candidate.text)) return candidate;
    cursor = candidate.text;
  }
  return null;
}

/**
 * Soft-merge contextual seeds after an Ask without clearing history or resetting focus to 0.
 *
 * The three seeds land on the chip left of focus, the focused chip, and the chip right of it. With
 * a two-wide window the first two are on screen and the third is one step to the right — reached by
 * the next auto-advance or a D-pad Right, rather than lost.
 */
export function mergeContextualSeeds(
  history: PresetPrompt[],
  contextual: [PresetPrompt, PresetPrompt, PresetPrompt],
  focusIndex: number,
): { history: PresetPrompt[]; focusIndex: number } {
  if (history.length === 0) {
    return { history: [...contextual], focusIndex: 1 };
  }

  const contextualTexts = contextual.map((c) => c.text);
  const windowTexts = [
    history[focusIndex - 1]?.text,
    history[focusIndex]?.text,
    history[focusIndex + 1]?.text,
  ].filter((t): t is string => Boolean(t));

  const windowMatches =
    contextualTexts.length === 3 &&
    contextualTexts.every((t) => windowTexts.includes(t));

  if (windowMatches) {
    return { history, focusIndex };
  }

  const next = [...history];
  const targets: number[] = [];
  if (focusIndex > 0) targets.push(focusIndex - 1);
  targets.push(focusIndex);
  if (focusIndex < next.length - 1) targets.push(focusIndex + 1);

  for (let i = 0; i < targets.length && i < 3; i++) {
    next[targets[i]!] = contextual[i]!;
  }

  for (const preset of contextual) {
    if (!next.some((h) => h.text === preset.text)) {
      const insertAt = Math.min(focusIndex + 1, next.length);
      next.splice(insertAt, 0, preset);
    }
  }

  const clamped = clampHistory(next);
  const safeFocus = Math.min(Math.max(0, focusIndex), clamped.length - 1);
  return { history: clamped, focusIndex: safeFocus };
}

/** Focus starts on the FIRST contextual seed, at the left edge of the window. */
export function buildInitialCarouselState(
  contextual: [PresetPrompt, PresetPrompt, PresetPrompt],
): { history: PresetPrompt[]; focusIndex: number } {
  return { history: [...contextual], focusIndex: 0 };
}
