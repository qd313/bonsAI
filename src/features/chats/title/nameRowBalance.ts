/**
 * Title: Keeping the chat's name on the panel's centre line
 *
 * Purpose: Decky's title bar puts its back arrow on the left and then this plugin's view. For the
 * chat's name to sit on the panel's centre line, the empty space after the name, on the right, must
 * be as wide as everything to the left of the view that the right side does not already mirror: the
 * back arrow and whatever gap Decky leaves after it. This file works that width out, and the numbers
 * the name has left over, from where Decky's bar and the view actually are.
 *
 * Used for: ChatTitleView.tsx (the empty space's width), and its tests (the name's centre and room).
 *
 * Solves: The drawing balances a 40-point arrow with a 40-point empty space and 6 points either side,
 * but Decky lays its bar out itself, and the gap after its arrow is Decky's, not ours (about 10
 * points on the 2026-10-08 photo, `84-today-deck.png`). CSS cannot read where Decky put this view,
 * so this measures it once the bar is laid out, and again whenever the bar changes size (step 6
 * reshapes it). With no back arrow (a pinned Quick Tab, plan 66) the left and right match already and
 * the empty space comes out as nothing, which is what plan 84 asks for there.
 *
 * Does not: Measure the name's words. Whether a long name fits is the stylesheet's doing (an
 * ellipsis at rest, a slide while the ring is on it).
 */
import { useLayoutEffect, useState, type RefObject } from "react";

import { DECKY_BACK_ARROW_W_PX, NAME_LINE_FURNITURE_PX } from "./chatTitleStyles";

/** The left and right edges of a box, in the panel's points. */
export type Edges = { left: number; right: number };

/** The widest believable empty space; anything wider means the measurement was taken mid-layout. */
const MAX_BALANCE_PX = 120;

/**
 * In: where Decky's bar and this view's root sit. Out: how wide the empty space on the right must be
 * so the name's box (the root less that space) is centred on the bar, or null when the measurement is
 * not usable (nothing laid out yet, or a number no real bar gives).
 */
export function balanceWidth(bar: Edges, root: Edges): number | null {
  if (!(bar.right - bar.left > 0) || !(root.right - root.left > 0)) return null;
  const w = root.left - bar.left - (bar.right - root.right);
  if (!Number.isFinite(w) || w < 0 || w > MAX_BALANCE_PX) return null;
  return Math.round(w);
}

/**
 * The name row as laid out: the name's box (between the root's left edge and the empty space), its
 * centre, and the room left for the words once the spacer, the two gaps and the menu arrow are out.
 */
export function nameRowGeometry(bar: Edges, root: Edges, balance: number) {
  const nameLeft = root.left;
  const nameRight = root.right - balance;
  return {
    nameLeft,
    nameRight,
    centre: (nameLeft + nameRight) / 2,
    panelCentre: (bar.left + bar.right) / 2,
    wordsRoom: nameRight - nameLeft - NAME_LINE_FURNITURE_PX,
  };
}

function edgesOf(el: Element): Edges {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right };
}

/**
 * The empty space's width for the view whose root is `rootRef`: the drawing's 40 until Decky's bar is
 * laid out, then the measured balance. Its parent element is Decky's bar (the view is its last child,
 * Decky Loader's TitleView.tsx, read 2026-10-08), found by structure, never by Decky's class names.
 */
export function useNameRowBalance(rootRef: RefObject<HTMLElement | null>, active: boolean): number {
  const [width, setWidth] = useState(DECKY_BACK_ARROW_W_PX);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const bar = root?.parentElement;
    if (!active || !root || !bar) return;
    const measure = () => {
      const w = balanceWidth(edgesOf(bar), edgesOf(root));
      if (w !== null) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(bar);
    watcher.observe(root);
    return () => watcher.disconnect();
  }, [rootRef, active]);
  return width;
}
