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
 * Also holds the pane's scroll position through a step: see holdPosition below.
 *
 * Does not: Scroll to clear a step's panel from the dock, or move the ring. Never scrolls once the
 *           ring has left the chips. The only scroll after a step is bringing the chip holding the
 *           ring back into view, when the person had scrolled it off the top reading a long panel.
 */
import { useCallback, useLayoutEffect, useRef, type FocusEvent, type RefObject } from "react";
import {
  bringIntoReadableBand,
  findScrollablePanel,
  revealBelowKeepingAsItSettles,
} from "../utils/chatPanelScroll";
import { elementHasGamepadFocus } from "../utils/uiDocument";

/**
 * Room asked for under the chip row on arrival. The Deck's panels run from one line (Reply style,
 * about 40 px) to about 200 px for the knowledge-base chip; Developer details is far taller and is
 * read by scrolling (see the ladder's Down off its last chip).
 */
const PANEL_ROOM_PX = 200;

/**
 * The ladder's scrolling rules, as five handles.
 *
 * In: the ladder's own element, its chip row's element and the open panel's element (refs kept by
 * the ladder).
 * Out: `duringStep` (wrap the ladder moving the ring itself), `keepInView` (call after a step with
 * the chip now holding the ring), `holdPosition` (call last in a step), `holdRef` (the ref of the
 * empty block the ladder draws after its panel) and `onFocusInside` (the ladder's focus handler).
 *
 * What can go wrong: nothing throws; every scroll is a pass that measures first and does nothing
 * when the ring has left the ladder or a newer press has come.
 *
 * 1. A focus coming in from outside the ladder is the ring's arrival: scroll once to clear the
 *    ladder from the dock and leave room under the row, on the settle schedule.
 * 2. A step bumps the generation so those queued passes do nothing, and scrolls nothing itself.
 * 3. After a step, a chip that is out of view is brought into view; one already on screen is not.
 * 4. A step may draw a shorter panel. If the pane was scrolled past what the shorter content allows,
 *    the browser clamps the scroll and the whole row moves (the Deck, 2026-10-08, build 1fc1551c:
 *    130 px entering the chips near the pane's end, 198 px going Up after reading Developer
 *    details). So after each step an empty block after the panel is sized, before the screen is
 *    drawn, to exactly the missing height, and the scroll is put back. Two frames later it looks
 *    again, because a box can settle a few px after the first measure (build 657ef2cb: 10 px). It is 0 high when the pane
 *    is not near its end, is re-sized (so it shrinks or goes) at every later step, and goes with
 *    the ladder when it collapses or unmounts. It is NOT released when the ring leaves: that would
 *    only move the same jump to the leave press.
 */
export function useChipLadderReveal(
  ladderElRef: RefObject<HTMLElement | null>,
  rowElRef: RefObject<HTMLElement | null>,
  bodyElRef: RefObject<HTMLElement | null>,
) {
  /* True while the ladder itself moves the ring from chip to chip: those focus events are not arrivals. */
  const steppingRef = useRef(false);
  /* Bumped by every arrival and every step; a queued pass belonging to an older number does nothing. */
  const generationRef = useRef(0);
  /* The empty block after the panel (see 4 above), and the scroll position the last step started from. */
  const holdElRef = useRef<HTMLElement | null>(null);
  const wantedScrollRef = useRef<number | null>(null);

  const revealOnArrival = useCallback(() => {
    const ladder = ladderElRef.current;
    if (!ladder || !elementHasGamepadFocus(ladder)) return;
    generationRef.current += 1;
    const generation = generationRef.current;
    const stillWanted = () => generation === generationRef.current && elementHasGamepadFocus(ladder);
    /* The panel, not the whole ladder: the held block after it must not count as ladder to clear. */
    const panel = bodyElRef.current ?? ladder;
    revealBelowKeepingAsItSettles(panel, () => ladder, undefined, { stillWanted });
    const row = rowElRef.current;
    if (row) {
      revealBelowKeepingAsItSettles(row, () => ladder, undefined, { stillWanted, roomBelowPx: PANEL_ROOM_PX });
    }
  }, [ladderElRef, rowElRef, bodyElRef]);

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

  /** Call last in a step: remember where the pane is scrolled to, for the layout effect below. */
  const holdPosition = useCallback(() => {
    const ladder = ladderElRef.current;
    const pane = ladder ? findScrollablePanel(ladder) : null;
    wantedScrollRef.current = pane ? pane.scrollTop : null;
  }, [ladderElRef]);

  /**
   * Size the held block so the pane can keep scroll position `wanted`, and put the scroll back.
   * `fixOnly` (the later passes): act only if the pane has in fact been pulled back below `wanted`.
   */
  const sizeHold = useCallback(
    (wanted: number, fixOnly: boolean) => {
      const hold = holdElRef.current;
      const ladder = ladderElRef.current;
      const pane = ladder ? findScrollablePanel(ladder) : null;
      if (!hold || !pane) return;
      if (fixOnly && pane.scrollTop >= wanted - 0.5) return;
      const held = parseFloat(hold.style.height) || 0;
      /* The pane's height without the held block. Reading it is also what clamps a scroll that is too far. */
      const natural = pane.scrollHeight - held;
      const missing = wanted + pane.clientHeight - natural;
      hold.style.height = missing > 0 ? `${Math.ceil(missing)}px` : "0px";
      if (Math.abs(pane.scrollTop - wanted) > 0.5) pane.scrollTop = wanted;
    },
    [ladderElRef],
  );

  /*
   * After the render a step caused, before the screen is drawn: size the held block and put the
   * scroll back. Then look again on the next two frames: on the Deck (2026-10-08, build 657ef2cb)
   * the box of the second chip measured about 10 px taller here than it ended up a frame later, the
   * block came out 10 px short and the pane was pulled back 10.1 px. Whatever settles within two
   * frames is caught before it is seen; the passes stop if a newer step comes or the ring leaves,
   * and they only act when the pane has really been pulled back, so they never fight a scroll.
   */
  useLayoutEffect(() => {
    const wanted = wantedScrollRef.current;
    wantedScrollRef.current = null;
    if (wanted === null) return;
    sizeHold(wanted, false);
    const generation = generationRef.current;
    let frames = 2;
    const again = () => {
      const ladder = ladderElRef.current;
      if (generation !== generationRef.current || !ladder || !elementHasGamepadFocus(ladder)) return;
      sizeHold(wanted, true);
      frames -= 1;
      if (frames > 0) requestAnimationFrame(again);
    };
    requestAnimationFrame(again);
  });

  const holdRef = useCallback((el: HTMLElement | null) => {
    holdElRef.current = el;
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

  return { duringStep, keepInView, holdPosition, holdRef, onFocusInside };
}
