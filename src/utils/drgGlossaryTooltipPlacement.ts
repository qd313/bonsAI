/**
 * Title: Glossary tooltip placement
 * Purpose: Work out where a glossary word's floating definition goes, so it never sits on top of
 *          the word it explains.
 * Used for: DrgGlossaryTermChip, every time the popup opens and every time the page scrolls.
 * Solves: Measured on the Deck 2026-10-03 (plan 81, evidence plan81-P81-LOOK-TOOLTIP-WORDS): in 3
 *         of 14 stops the popup covered its own word, 100 percent of it for "kiting". The popup
 *         was placed once, from where the word stood when the press arrived. Steam then scrolled
 *         the word into view, the popup stayed where it was, and a word that had been under the
 *         dock ended up under its own definition. The fix is in two halves: this file decides the
 *         side from the word's CURRENT box, and the chip calls it again after every scroll.
 * Does not: Measure anything itself (the caller passes boxes in, so it is pure and testable), and
 *           it does not know where the dock is. The caller reads that from the page (the Main
 *           tab's dock, via readableBottomOf) rather than assuming a number, because the Deck's
 *           own screen, a docked screen and a running game all move it.
 *
 * How it works:
 * 1. The usable band is topLimit..bottomLimit (the pane's top, and the lower of the dock's top and
 *    the window's bottom).
 * 2. If the whole tooltip fits above the word inside the band, it goes above (the long-standing
 *    look). Else, if it fits below, it goes below.
 * 3. If it fits on neither side, it takes the side with more room and is capped to that room
 *    (maxHeight) so its own text scrolls instead of reaching over the word.
 */

/** Gap kept between the word and its tooltip. */
const GLOSSARY_TOOLTIP_GAP_PX = 6;

type GlossaryTooltipPlacementInput = {
  /** The word's current box, in window coordinates. */
  word: { top: number; bottom: number; left: number; width: number };
  /** The plugin column's left and right edges. */
  scope: { left: number; right: number };
  /** Nothing may be drawn above this line (the pane's top). */
  topLimit: number;
  /** Nothing may be drawn below this line (the dock's top, or the window's bottom). */
  bottomLimit: number;
  /** The tooltip's natural height, with no cap applied. */
  height: number;
};

export type GlossaryTooltipPlacement = {
  left: number;
  top: number;
  width: number;
  /** Set only when the tooltip had to be shortened to stay off the word. */
  maxHeight?: number;
};

export function placeGlossaryTooltip(input: GlossaryTooltipPlacementInput): GlossaryTooltipPlacement {
  const { word, scope, topLimit, bottomLimit, height } = input;
  const gap = GLOSSARY_TOOLTIP_GAP_PX;
  const width = Math.max(120, Math.min(240, scope.right - scope.left - 16));
  const left = Math.min(
    Math.max(scope.left + 8, word.left + word.width / 2 - width / 2),
    scope.right - width - 8,
  );
  const roomAbove = Math.max(0, word.top - gap - topLimit);
  const roomBelow = Math.max(0, bottomLimit - (word.bottom + gap));

  if (height <= roomAbove) return { left, top: word.top - gap - height, width };
  if (height <= roomBelow) return { left, top: word.bottom + gap, width };

  if (roomAbove > roomBelow) {
    const maxHeight = Math.floor(roomAbove);
    return { left, top: word.top - gap - maxHeight, width, maxHeight };
  }
  const maxHeight = Math.floor(roomBelow);
  return { left, top: word.bottom + gap, width, maxHeight };
}
