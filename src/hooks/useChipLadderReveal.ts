/**
 * Title: Show details chips: when the answer may scroll
 * Purpose: Decide when the Show details chips may move the answer: only to keep the chip holding the ring
 *          and the end of its details box readable (chipLadderPlacement.ts), smoothly, and never for
 *          anything already readable.
 * Used for: ContextChipLadder.tsx.
 * Solves: Two Deck reports pulling opposite ways. 2026-10-08 (maintainer's recording): the whole answer
 *         jumped on every press, because each step scrolled to clear the new box and passes of one press
 *         were still queued when the next came. 2026-10-09 (plan87-M3-CHIPS.json): with the row then held
 *         perfectly still, a box opened low in the pane ran behind the question box and was never shown.
 *         The maintainer's call (plan 87, call 6): the details must stay readable, with a smooth scroll,
 *         even if the row moves a little. So a step scrolls only when its box's end is behind the dock (or
 *         the chip is off screen), by just enough, smoothly; a step whose box is readable moves nothing.
 * Also holds the pane's scroll position through a step to a shorter box: see the held block below.
 *
 * Does not: Move the ring. Never scrolls once the ring has left the chips.
 */
import { useCallback, useLayoutEffect, useRef, type FocusEvent, type RefObject } from "react";
import { findScrollablePanel } from "../utils/chatPanelScroll";
import { elementHasGamepadFocus } from "../utils/uiDocument";
import { placeOpenChip, revealBoxEnd } from "./chipLadderPlacement";

/**
 * When the placement looks again after a step or an arrival: the schedule the plugin's lift off the dock
 * uses (useDockClearanceOnFocus.ts), the one timing this device has been measured to hold. Steam's own
 * glide lands within the first of these; every pass measures first and does nothing when all is readable.
 */
const SETTLE_PASS_DELAYS_MS = [150, 300, 900];

/**
 * The ladder's scrolling rules, as five handles.
 *
 * In: the ladder's own element, the open chip's details box, and a function naming the chip that is open.
 * Out: `duringStep` (wrap the ladder moving the ring itself), `holdPosition` (call last in a step),
 * `holdRef` (the ref of the empty block the ladder draws after its box), `onFocusInside` (the ladder's
 * focus handler) and `showRestOfBox` (Down on a box whose end is hidden).
 *
 * What can go wrong: nothing throws; every pass measures first and does nothing when the ring has left the
 * ladder or a newer press has come.
 *
 * 1. A focus coming in from outside the ladder is the ring's arrival: place the open chip and its box
 *    (chipLadderPlacement.ts) now and on the settle schedule. The first look does not ask where Steam's ring
 *    is (Steam stamps it a tick after the focus event); the later looks do.
 * 2. A step bumps the generation, so passes still queued from an earlier press do nothing.
 * 3. After the render a step caused, before the screen is drawn: size the held block (4), then place the
 *    new chip and its box, then look again on the next two frames and on the settle schedule.
 * 4. A step may draw a shorter box. If the pane was scrolled past what the shorter content allows, the
 *    browser clamps the scroll and the whole row jumps (the Deck, 2026-10-08, build 1fc1551c: 130 px
 *    entering the chips near the pane's end, 198 px going Up after reading Developer details). So an empty
 *    block after the box is sized, before the screen is drawn, to exactly the missing height, and the
 *    scroll is put back. The next two frames look again, because a box can settle a few px after the first
 *    measure (build 657ef2cb: 10 px, roadmap "the row slips about 10 px once, at the second chip"); they
 *    stand down once the placement itself has scrolled for that step, so they never undo it. The block is
 *    0 high when the pane is not near its end, is re-sized at every later step, and goes with the ladder.
 *    It is NOT released when the ring leaves: that would only move the same jump to the leave press.
 */
export function useChipLadderReveal(
  ladderElRef: RefObject<HTMLElement | null>,
  bodyElRef: RefObject<HTMLElement | null>,
  openChip: () => HTMLElement | null | undefined,
) {
  /* True while the ladder itself moves the ring from chip to chip: those focus events are not arrivals. */
  const steppingRef = useRef(false);
  /* Bumped by every arrival and every step; a queued pass belonging to an older number does nothing. */
  const generationRef = useRef(0);
  /* Set once the placement has scrolled for the current generation: the held block's fixes stand down. */
  const placedRef = useRef(false);
  /* The empty block after the box (see 4 above), and the scroll position the last step started from. */
  const holdElRef = useRef<HTMLElement | null>(null);
  const wantedScrollRef = useRef<number | null>(null);
  const openChipRef = useRef(openChip);
  openChipRef.current = openChip;

  const ringInLadder = useCallback(() => {
    const ladder = ladderElRef.current;
    return Boolean(ladder && elementHasGamepadFocus(ladder));
  }, [ladderElRef]);

  /**
   * One placement pass, for this generation only, while the ring is in the ladder. `arriving`: the first look at
   * an arrival, run inside the focus event itself, before Steam has stamped its ring on the chip (see
   * revealOnArrival); the focus coming in is the evidence there, and every later pass asks the ring again.
   */
  const place = useCallback(
    (generation: number, firstPass = false, arriving = false) => {
      if (generation !== generationRef.current || !(arriving || ringInLadder())) return;
      const ladder = ladderElRef.current;
      if (placeOpenChip(openChipRef.current(), bodyElRef.current, holdElRef.current, firstPass, ladder)) placedRef.current = true;
    },
    [bodyElRef, ladderElRef, ringInLadder],
  );

  /** Place now, on the next frame, and on the settle schedule. */
  const placeAsItSettles = useCallback(
    (generation: number, arriving = false) => {
      place(generation, true, arriving);
      requestAnimationFrame(() => place(generation));
      SETTLE_PASS_DELAYS_MS.forEach((ms) => window.setTimeout(() => place(generation), ms));
    },
    [place],
  );

  /*
   * The ring coming in from outside the chips (Down from the "This answer | Session" toggle, Up from the Hide details
   * line in the dock). This must not ask where Steam's ring is: Steam stamps its ring on the new element a tick
   * AFTER the focus event (measured 2026-08-04, spoilerFenceRegistry.ts's focusSpoilerFence), so inside the event
   * the ring still reads as outside. It used to ask, and returned. On the Deck (2026-10-10, plan87-P87-F3-CHIPS-
   * GRID-try2.json) the first chip's box, entered from the toggle, stayed 25.8 px behind the dock; and Developer
   * details, entered from below, kept its end hidden while the next Down left, because the arrival's new generation
   * never began and Down still remembered showing that box's end before the ring went out.
   */
  const revealOnArrival = useCallback(() => {
    generationRef.current += 1;
    placedRef.current = false;
    placeAsItSettles(generationRef.current, true);
  }, [placeAsItSettles]);

  /** Run a step (the ladder moving the ring itself): it cancels queued passes and is no arrival. */
  const duringStep = useCallback(<T>(step: () => T): T => {
    generationRef.current += 1;
    placedRef.current = false;
    steppingRef.current = true;
    try {
      return step();
    } finally {
      steppingRef.current = false;
    }
  }, []);

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

  /* After the render a step caused, before the screen is drawn: see 3 and 4 above. */
  useLayoutEffect(() => {
    const wanted = wantedScrollRef.current;
    wantedScrollRef.current = null;
    if (wanted === null) return;
    sizeHold(wanted, false);
    const generation = generationRef.current;
    placeAsItSettles(generation);
    let frames = 2;
    const again = () => {
      if (generation !== generationRef.current || !ringInLadder()) return;
      if (!placedRef.current) sizeHold(wanted, true);
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

  /*
   * The generation in which Down last showed the rest of a box. A second Down with no step in between always
   * moves on: on the Deck (2026-10-10) a Down that asked for a scroll the pane could not give kept the ring on
   * Developer details for ever.
   */
  const shownRestInRef = useRef(-1);

  /**
   * Down on a chip whose box's end is behind the dock: show that end (chipLadderPlacement.ts's revealBoxEnd) and
   * keep the ring. True when it did; false when there was nothing to show or this chip's rest was already shown,
   * so the press moves on. Placement passes still queued from the chip's arrival are cancelled, so none pulls the
   * row back down under the reader.
   */
  const showRestOfBox = useCallback((): boolean => {
    if (shownRestInRef.current === generationRef.current) return false;
    if (!revealBoxEnd(bodyElRef.current, holdElRef.current)) return false;
    generationRef.current += 1;
    shownRestInRef.current = generationRef.current;
    placedRef.current = true;
    return true;
  }, [bodyElRef]);

  return { duringStep, holdPosition, holdRef, onFocusInside, showRestOfBox };
}
