/**
 * Title: Show details chips: when the answer may scroll
 * Purpose: Decide the one moment the Show details chip row is allowed to move the answer: when the
 *          ring first arrives on it. After that, stepping from chip to chip must leave the row where
 *          it is.
 * Used for: ContextChipLadder.tsx.
 * Solves: On the Deck (maintainer's recording, 2026-10-08) the whole answer jumped on every press
 *         in the chips. Each step drew a panel of a different height under the row and then
 *         scrolled the pane to clear that panel from the dock, which moved the row; the passes of
 *         one press were also still queued when the next press came. Now the ring's arrival scrolls
 *         once, to clear the ladder and to leave room under the row for a typical panel (so most
 *         panels are readable without further scrolling), and any press in the chips cancels the
 *         passes still queued from that arrival.
 * Does not: Scroll for a step, or move the ring. Never scrolls once the ring has left the chips.
 */
import { useCallback, useRef, type FocusEvent, type RefObject } from "react";
import { revealBelowKeepingAsItSettles } from "../utils/chatPanelScroll";
import { elementHasGamepadFocus } from "../utils/uiDocument";

/**
 * Room asked for under the chip row on arrival. The Deck's panels run from one line (Reply style,
 * about 40 px) to about 200 px for the knowledge-base chip; Developer details is far taller and is
 * read by scrolling (see the ladder's Down off its last chip).
 */
const PANEL_ROOM_PX = 200;

export function useChipLadderReveal(
  ladderElRef: RefObject<HTMLElement | null>,
  rowElRef: RefObject<HTMLElement | null>,
) {
  /* True while the ladder itself moves the ring from chip to chip: those focus events are not arrivals. */
  const steppingRef = useRef(false);
  /* Bumped by every arrival and every step; a queued pass belonging to an older number does nothing. */
  const generationRef = useRef(0);

  const revealOnArrival = useCallback(() => {
    const ladder = ladderElRef.current;
    if (!ladder || !elementHasGamepadFocus(ladder)) return;
    generationRef.current += 1;
    const generation = generationRef.current;
    const stillWanted = () => generation === generationRef.current && elementHasGamepadFocus(ladder);
    revealBelowKeepingAsItSettles(ladder, () => ladder, undefined, { stillWanted });
    const row = rowElRef.current;
    if (row) {
      revealBelowKeepingAsItSettles(row, () => ladder, undefined, { stillWanted, roomBelowPx: PANEL_ROOM_PX });
    }
  }, [ladderElRef, rowElRef]);

  /** Run a step (the ladder moving the ring itself): it cancels queued arrival passes and is no arrival. */
  const duringStep = useCallback(<T>(step: () => T): T => {
    generationRef.current += 1;
    steppingRef.current = true;
    try {
      return step();
    } finally {
      steppingRef.current = false;
    }
  }, []);

  /** Call on every focus event inside the ladder: reveals only when the ring came in from outside. */
  const onFocusInside = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      if (steppingRef.current) return;
      const from = e.relatedTarget as Node | null;
      if (from && e.currentTarget.contains(from)) return;
      revealOnArrival();
    },
    [revealOnArrival],
  );

  return { duringStep, onFocusInside };
}
