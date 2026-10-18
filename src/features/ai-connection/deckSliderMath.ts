/**
 * Title: Deck slider math
 * Purpose: Clamp, index/percent mapping, and Deck button direction helpers for discrete sliders.
 * Used for: DeckFocusSlider bridges and Settings/Ollama tab slider focus handlers.
 * Solves: Consistent D-pad left/right stepping and track percentage math across slider UIs.
 * Does not: Render sliders — see DeckFocusSlider and section parent focus graphs.
 */
import { isLeftNavigationKey, isRightNavigationKey } from "../../utils/focusNavigation";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isLeftDeckButton(key: string): boolean {
  const lower = key.toLowerCase();
  return isLeftNavigationKey(key) || key === "GamepadLeftStickLeft" || lower.includes("left");
}

export function isRightDeckButton(key: string): boolean {
  const lower = key.toLowerCase();
  return isRightNavigationKey(key) || key === "GamepadLeftStickRight" || lower.includes("right");
}

/** Map discrete slot index to track percentage (0 at min, 100 at max). */
export function indexToPct(index: number, maxIdx: number): number {
  if (maxIdx <= 0) return 50;
  return (index / maxIdx) * 100;
}

/** Snap track percentage to nearest discrete slot index. */
export function pctToIndex(pct: number, maxIdx: number): number {
  if (maxIdx <= 0) return 0;
  return clamp(Math.round((clamp(pct, 0, 100) / 100) * maxIdx), 0, maxIdx);
}

/** Pointer X position as 0–100 track percentage. */
export function clientXToPct(clientX: number, rect: DOMRect): number {
  if (rect.width <= 0) return 0;
  return clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
}

/** Map a numeric domain value to track percentage. */
export function valueToPct(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 0;
  return ((value - min) / span) * 100;
}

/** Map track percentage back to a numeric domain value. */
export function pctToValue(pct: number, min: number, max: number): number {
  const span = max - min;
  return min + (span * clamp(pct, 0, 100)) / 100;
}

/** Pick the thumb whose percentage is closest to `pct`. */
export function pickNearestThumbIndex(pct: number, thumbPcts: readonly number[]): number {
  if (thumbPcts.length === 0) return 0;
  let bestIdx = 0;
  let bestDist = Math.abs(pct - thumbPcts[0]!);
  for (let i = 1; i < thumbPcts.length; i++) {
    const dist = Math.abs(pct - thumbPcts[i]!);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}
