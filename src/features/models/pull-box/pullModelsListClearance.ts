/**
 * Title: Keep a model row clear of the list's sticky column-header row
 *
 * Purpose: The AI models list has a sticky "Pull / Model / Size ..." header row at its top. The Deck's
 * scroll-into-view treats that strip as free space and does nothing for a row that is already partly
 * inside the list, so going Up onto the first model with the list scrolled left 15 of the row's 35 px
 * behind the header (plan79-P79-M9-MODELS-BOX-AFTER.json, 2026-10-02). After a row's button takes the
 * ring, this measures the row against the header and scrolls the list itself.
 *
 * Used for: `PullModelsModal.tsx` (`focusRowCell`), through `useListHeaderClearance`.
 *
 * Does not: scroll toward the bottom edge (the Deck's own scroll already handles that), and does not
 * decide where the ring goes.
 *
 * How it works: the hook hands the screen a ref for the list, a ref for the header row and `clearForRow`.
 * `clearHeader` is one measured pass. `scheduleClearHeader` runs it now and again on the
 * next frame and 150 ms later, because Steam can put a scroll back right after a press (the same repeat
 * useDockClearanceOnFocus.ts makes); a pass that finds the row clear does nothing.
 */

import { useCallback, useEffect, useRef } from "react";

const ROW_SELECTOR = ".bonsai-pullmodels-table-row--data";
/** Repeat passes after the immediate one: the next frame, then Steam's own glide time. */
const REPEAT_DELAYS_MS = [150];

/** One pass. `first` is the first model row, which always belongs at the very top of the list. */
function clearHeader(list: HTMLElement, header: HTMLElement, target: HTMLElement, first: boolean): boolean {
  const row = target.closest<HTMLElement>(ROW_SELECTOR);
  if (!row) return false;
  if (first) {
    if (list.scrollTop === 0) return false;
    list.scrollTop = 0;
    return true;
  }
  const hidden = header.getBoundingClientRect().bottom - row.getBoundingClientRect().top;
  if (hidden <= 0 || list.scrollTop <= 0) return false;
  list.scrollTop = Math.max(0, list.scrollTop - hidden);
  return true;
}

/** Runs the pass now, on the next frame and again shortly after. Returns a function that cancels the repeats. */
function scheduleClearHeader(
  list: HTMLElement,
  header: HTMLElement,
  target: HTMLElement,
  first: boolean
): () => void {
  clearHeader(list, header, target, first);
  const pass = () => {
    // The ring may have moved on; a late pass for a row it left would fight the next one.
    if (target.ownerDocument.activeElement === target) clearHeader(list, header, target, first);
  };
  const raf = window.requestAnimationFrame(pass);
  const timers = REPEAT_DELAYS_MS.map((ms) => window.setTimeout(pass, ms));
  return () => {
    window.cancelAnimationFrame(raf);
    timers.forEach((t) => window.clearTimeout(t));
  };
}

export function useListHeaderClearance() {
  const listRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelRef.current?.(), []);
  /** Call after a row's button takes the ring. `first` is the first model row. */
  const clearForRow = useCallback((target: HTMLElement, first: boolean) => {
    cancelRef.current?.();
    cancelRef.current =
      listRef.current && headerRef.current ? scheduleClearHeader(listRef.current, headerRef.current, target, first) : null;
  }, []);
  return { listRef, headerRef, clearForRow };
}
