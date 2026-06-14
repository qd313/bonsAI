import type { PresetPrompt } from "../../data/presets";

/** Auto-advance interval for vertical carousel mode (ms). */
export const CAROUSEL_STEP_MS = 5800;
/** CSS slide transition duration on the track (ms). */
export const CAROUSEL_SLIDE_MS = 550;
/** Max presets kept in scrollable history (limits D-pad rows above the Ask field). */
export const CAROUSEL_HISTORY_MAX = 5;
/** Pause auto-advance after manual D-pad browse (ms). */
export const CAROUSEL_MANUAL_PAUSE_MS = 12_000;
/** Row height: chip minHeight 34 + track gap 5. */
export const CAROUSEL_ROW_HEIGHT_PX = 39;

export function seedsKeyFrom(seeds: PresetPrompt[]): string {
  return seeds.map((s) => s.text).join("\u0000");
}

export function clampHistory(history: PresetPrompt[]): PresetPrompt[] {
  if (history.length <= CAROUSEL_HISTORY_MAX) return history;
  const trim = history.length - CAROUSEL_HISTORY_MAX;
  return history.slice(trim);
}

/** translateY offset so `focusIndex` row sits in the middle visible slot. */
export function carouselTrackOffsetPx(focusIndex: number): number {
  return Math.max(0, focusIndex - 1) * CAROUSEL_ROW_HEIGHT_PX;
}

export type CarouselAdvanceResult = {
  history: PresetPrompt[];
  focusIndex: number;
};

/**
 * Auto-advance: move focus down; append a new preset when already at the end.
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
 * Soft-merge contextual seeds after an Ask without clearing history or resetting focus to 0.
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

export function buildInitialCarouselState(
  contextual: [PresetPrompt, PresetPrompt, PresetPrompt],
): { history: PresetPrompt[]; focusIndex: number } {
  return { history: [...contextual], focusIndex: 1 };
}
