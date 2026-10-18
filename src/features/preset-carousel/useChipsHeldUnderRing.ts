/**
 * Title: New suggestion chips wait while the ring is on the row
 *
 * Purpose: When an answer finishes, the suggestion chips are re-seeded and their walk restarts, so
 * the chip under the ring changed its words at that moment. On the Deck the ring was on a chip as an
 * answer finished, the chip's words changed under it, and the page jumped about 215 px
 * (plan93-P93-M4-ANSWER-FINISH-after-try2.json, run B). This hook hands the row the chips it already
 * shows for as long as the ring is anywhere in the row, and the new ones the moment it leaves.
 *
 * Used for: MainTabPresetRow.tsx, around the chips' seeds and their restart token.
 *
 * Solves: A finished answer changing the control a person is standing on.
 *
 * Does not: Hold the chips' own fade cycle (the row's `rowHeld` already keeps a chip under the ring
 * from fading), or move the ring.
 */
import { useEffect, useReducer, useRef, type RefObject } from "react";
import { uiGamepadFocusElement } from "../../shared/dpad/uiDocument";

/** Whether Steam's ring is on something inside `host`. */
function ringIn(host: HTMLElement | null): boolean {
  const ring = uiGamepadFocusElement();
  return Boolean(ring && host?.contains(ring));
}

/**
 * In: the row's host element and the newest value (the seeds and the restart token).
 * Out: the value the row should use: the newest one, unless the ring is in the row, where it is the
 * one from before the ring arrived. Re-renders once when the ring leaves, so the held value is let go.
 */
export function useChipsHeldUnderRing<T>(hostRef: RefObject<HTMLElement | null>, newest: T): T {
  const shownRef = useRef(newest);
  const newestRef = useRef(newest);
  newestRef.current = newest;
  const [, recheck] = useReducer((n: number) => n + 1, 0);
  if (!ringIn(hostRef.current)) shownRef.current = newest;

  useEffect(() => {
    const doc = hostRef.current?.ownerDocument ?? document;
    let timer = 0;
    /* Read once the move is over: while focus leaves, the page names no element yet. */
    const onFocusMove = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (shownRef.current !== newestRef.current && !ringIn(hostRef.current)) recheck();
      }, 0);
    };
    doc.addEventListener("focusin", onFocusMove, true);
    doc.addEventListener("focusout", onFocusMove, true);
    return () => {
      window.clearTimeout(timer);
      doc.removeEventListener("focusin", onFocusMove, true);
      doc.removeEventListener("focusout", onFocusMove, true);
    };
  }, [hostRef]);

  return shownRef.current;
}
