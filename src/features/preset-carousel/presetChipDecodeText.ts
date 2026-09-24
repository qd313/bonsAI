/**
 * Title: Preset chip decode text maths
 *
 * Purpose: The pure, timing-free core of the decode animation's letter-by-letter reveal — the
 * churn glyph pool, the per-slot animation state shape, and the function that composes what a
 * label should show right now from a lock boundary and a churn buffer.
 *
 * Used for: MainTabPresetDecodeSlots (the decode-mode chip row) in
 * src/components/MainTabPresetAnimatedChips.tsx, which owns the rAF loop and the timers; this
 * file only computes strings and durations, never a timer or a DOM write.
 *
 * Solves: Keeps the "what does the label show at revealedCount N" question testable on its own
 * (see composeDecodeText's tests), separately from the animation-frame plumbing that drives it.
 *
 * Does not: Read or write the DOM, schedule anything, or know about React. `composeDecodeText` is
 * a plain function of its four arguments.
 */
import type { PresetPrompt } from "../../data/presets";

/** Milliseconds between locked characters in decode mode (must feel close to live answer streaming). */
export const PRESET_DECODE_CHAR_MS = 42;
/**
 * How often the still-churning glyphs reshuffle, ms. Throttled well below frame rate on purpose:
 * the reveal loop runs one shared `requestAnimationFrame` per tick across the slots, but only
 * writes to the DOM on this cadence (or on a lock advance / caret blink) so a churning chip does
 * not repaint every 16ms frame on Deck hardware.
 */
export const PRESET_DECODE_CHURN_REFRESH_MS = 55;
/** Caret blink period, ms. */
export const PRESET_DECODE_CARET_BLINK_MS = 450;
/** Block caret glyph, drawn inline at the lock boundary rather than as a separate CSS ::after. */
export const PRESET_DECODE_CARET_CHAR = "▋";

/**
 * Churn glyph pool for the still-scrambling tail: printable ASCII plus half-width katakana
 * (U+FF66-U+FF9D). Both render half-width. Full-width CJK would not — the chip label reserves
 * its width from frame 0 at the prompt's final character count, so a double-width churn glyph
 * would push a long prompt into the ellipsis mid-animation and undo the whole point of the rewrite.
 */
const PRESET_DECODE_GLYPH_POOL: string = (() => {
  let pool = "";
  for (let code = 0x21; code <= 0x7e; code += 1) pool += String.fromCharCode(code);
  for (let code = 0xff66; code <= 0xff9d; code += 1) pool += String.fromCharCode(code);
  return pool;
})();

function randomDecodeGlyph(): string {
  return PRESET_DECODE_GLYPH_POOL[Math.floor(Math.random() * PRESET_DECODE_GLYPH_POOL.length)]!;
}

export function makeDecodeChurn(length: number): string[] {
  return Array.from({ length }, randomDecodeGlyph);
}

/**
 * Composes what the label should show right now: locked (real) characters up to `revealedCount`,
 * then a boundary position that alternates between the caret glyph and the churning glyph beneath
 * it (never an *extra* character — that would grow the string past the reserved width), then the
 * rest of the still-churning tail. Once `revealedCount` reaches the prompt length the caller
 * should just render `text` directly; this always returns a string of exactly `text.length`.
 */
export function composeDecodeText(
  text: string,
  revealedCount: number,
  churn: readonly string[],
  caretOn: boolean,
): string {
  if (revealedCount >= text.length) return text;
  const prefix = text.slice(0, revealedCount);
  const boundaryChar = caretOn ? PRESET_DECODE_CARET_CHAR : (churn[revealedCount] ?? " ");
  const tail = churn.slice(revealedCount + 1).join("");
  return prefix + boundaryChar + tail;
}

/** Per-slot decode animation state, owned by the reveal effect's closure — never React state, so a
 *  lock advance or churn refresh never triggers a re-render. See `MainTabPresetDecodeSlots`. */
export type DecodeSlotAnim = {
  prompt: PresetPrompt;
  /** `performance.now()` when this prompt's reveal began. */
  startAt: number;
  churn: string[];
  /** Avoids redundant DOM writes: skip repainting when neither the lock boundary, a churn
   *  refresh, nor the caret blink changed anything since the last tick. */
  lastRevealedCount: number;
  resolved: boolean;
  /** Valid once `resolved`: when to start the next prompt's reveal. */
  holdEndAt: number;
};
