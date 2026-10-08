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
 * Does not: Scroll to clear a step's panel from the dock, or move the ring. Never scrolls once the
 *           ring has left the chips. The only scroll after a step is bringing the chip holding the
 *           ring back into view, when the person had scrolled it off the top reading a long panel.
 */
import { useCallback, useRef, type FocusEvent, type RefObject } from "react";
import { bringIntoReadableBand, revealBelowKeepingAsItSettles } from "../utils/chatPanelScroll";
import { elementHasGamepadFocus } from "../utils/uiDocument";

/**
 * Room asked for under the chip row on arrival. The Deck's panels run from one line (Reply style,
 * about 40 px) to about 200 px for the knowledge-base chip; Developer details is far taller and is
 * read by scrolling (see the ladder's Down off its last chip).
 */
const PANEL_ROOM_PX = 200;

/**
 * The ladder's scrolling rules, as three handles.
 *
 * In: the ladder's own element and its chip row's element (both refs kept by the ladder).
 * Out: `duringStep` (wrap the ladder moving the ring itself), `keepInView` (call after a step with
 * the chip now holding the ring) and `onFocusInside` (the ladder's focus handler).
 *
 * What can go wrong: nothing throws; every scroll is a pass that measures first and does nothing
 * when the ring has left the ladder or a newer press has come.
 *
 * 1. A focus coming in from outside the ladder is the ring's arrival: scroll once to clear the
 *    ladder from the dock and leave room under the row, on the settle schedule.
 * 2. A step bumps the generation so those queued passes do nothing, and scrolls nothing itself.
 * 3. After a step, a chip that is out of view is brought into view; one already on screen is not.
 */
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

  /**
   * After a step: if the chip now holding the ring is out of view (the person had scrolled down to
   * the end of a long panel, which carried the row off the top), scroll just enough to show it. A
   * chip already on screen is never touched, so a plain step does not move the answer.
   */
  const keepInView = useCallback(
    (chip: HTMLElement | null | undefined) => {
      if (!chip) return;
      const generation = generationRef.current;
      const pass = () => {
        const ladder = ladderElRef.current;
        if (generation !== generationRef.current || !chip.isConnected) return;
        if (ladder && elementHasGamepadFocus(ladder)) bringIntoReadableBand(chip);
      };
      pass();
      requestAnimationFrame(pass);
    },
    [ladderElRef],
  );

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

  return { duringStep, keepInView, onFocusInside };
}
