/**
 * Title: The Search tab's stops and how the ring moves between them
 *
 * Purpose: Every control on the Search tab is a stop in one of the tab's rows (searchNav.ts holds the rule).
 * This hook keeps the stops: it hands each control the props that make it a stop (its own nav node, and the
 * four move handlers), remembers which element and nav node sits at which place, measures the rows at the
 * moment of a press, and moves the ring with Steam's own transfer (the stop's nav node `TakeFocus`), the
 * way every hop in this plugin that leaves a container has to. Up from the top row goes to the tab bar the
 * same way.
 *
 * Used for: SearchTab.tsx and the controls inside it.
 *
 * Solves: A text field is a container of its own for Steam, so a plain `focus()` from it onto a button (or
 * back) moves the page's focus while Steam's ring stays behind (AGENTS.md, "The Steam Deck focus graph").
 * Going through the nav node everywhere removes that whole class of bug and needs no page search. A stop drawn in
 * the same moment as the move (new matches arriving as the ring comes back from a closed note) may not have its
 * nav node yet: the move waits a few frames for it and never falls back to a plain `focus()`, which would leave
 * the ring on nothing (plan 93, lane B11; seen once on the Deck 2026-10-12, plan 92 block 3).
 *
 * Does not: Draw anything, or decide what a press on a stop does; the controls supply that.
 */
import { useCallback, useEffect, useRef } from "react";

import { takeHolderFocus } from "../../utils/chatTranscriptNavHelpers";
import { takeNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { searchMove, type SearchDirection, type SearchStopAt } from "./searchNav";

/** How many frames a move waits for a stop that was drawn in the same moment to get its nav node (about 130 ms). */
export const NAV_WAIT_FRAMES = 8;

/** The next frame, or a short timer where the page has no frames; returns how to cancel it. */
function nextFrame(run: () => void): () => void {
  if (typeof window.requestAnimationFrame === "function") {
    const id = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(id);
  }
  const id = window.setTimeout(run, 16);
  return () => window.clearTimeout(id);
}

type Cell = { el: HTMLElement | null; nav: NavRefHolder; setEl?: (el: HTMLElement | null) => void };

export type SearchStopProps = {
  ref: (el: HTMLElement | null) => void;
  onMoveUp: () => boolean;
  onMoveDown: () => boolean;
  onMoveLeft: () => boolean;
  onMoveRight: () => boolean;
  navRef: NavRefHolder;
};

export type SearchNav = {
  /** The props that make a control the stop at `col` of the row named `row`. */
  stop: (row: string, col: number) => SearchStopProps;
  /** Steam's transfer onto that stop; true when the ring moved. */
  focusStop: (row: string, col: number) => boolean;
};

/*
 * A move handler must never throw: on the Deck a throw hands the press back to Steam, which steps along its own
 * order (plan 92, build 649daecc: Down on a game button went to the next game). So a stop whose `ref` is not an
 * element (a `ref` on Steam's text field holds the component) is not measured and not focused, rather than called.
 */
const centerX = (el: HTMLElement): number | null => {
  if (typeof el.getBoundingClientRect !== "function") return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 ? r.left + r.width / 2 : null;
};

/**
 * In: the rows' names top to bottom, as drawn right now (rows with no stop on screen are skipped), and
 * `enter(from, to)`: the place a row is entered at from another, by name, or null for the nearest in x.
 * Out: `stop(row, col)` for each control, and `focusStop` for landing the ring from code.
 * Can go wrong: a stop that is not drawn yet is skipped, not waited for; a caller that moves the ring
 * right after a state change does it in a layout effect, once the control exists. A stop that is drawn but
 * whose nav node Steam has not filled yet is waited for (NAV_WAIT_FRAMES); one that never gets it is left
 * alone and the ring stays where it was.
 */
export function useSearchNav(
  rowOrder: readonly string[],
  enter: (from: string, to: string) => number | null = () => null,
): SearchNav {
  const order = useRef(rowOrder);
  order.current = rowOrder;
  const enterAt = useRef(enter);
  enterAt.current = enter;
  const cells = useRef(new Map<string, Cell[]>());

  const cell = (row: string, col: number): Cell => {
    let list = cells.current.get(row);
    if (!list) cells.current.set(row, (list = []));
    return (list[col] ??= { el: null, nav: { current: null } });
  };

  /** The rows that have a stop on screen, top first, each as its drawn stops. */
  const live = useCallback((): Array<{ key: string; cells: Cell[] }> => {
    const out: Array<{ key: string; cells: Cell[] }> = [];
    for (const key of order.current) {
      const drawn = (cells.current.get(key) ?? []).filter((c) => c.el !== null);
      if (drawn.length > 0) out.push({ key, cells: drawn });
    }
    return out;
  }, []);

  /* The wait for one stop's nav node; a newer move, or the tab going away, ends it. */
  const waiting = useRef<(() => void) | null>(null);
  const stopWaiting = useCallback(() => {
    waiting.current?.();
    waiting.current = null;
  }, []);
  useEffect(() => stopWaiting, [stopWaiting]);

  /**
   * Steam's transfer onto the stop. Every stop here is a Focusable of its own, so the ring crosses a
   * container on every hop and a plain `focus()` would move the page's focus while Steam's ring stayed
   * behind and then cleared; there is no hop in this tab that stays inside one container, so there is no plain
   * focus. A stop drawn in this same moment may not have its nav node yet: wait for it a few frames. If it never
   * comes, leave the ring where it is (a dead press is better than a lost ring). True only when the ring moved
   * now; a move that is still waiting reports false.
   */
  const hop = useCallback(
    (target: Cell): boolean => {
      stopWaiting();
      if (takeHolderFocus(target.nav)) return true;
      if (target.el === null) return false;
      let left = NAV_WAIT_FRAMES;
      const look = () => {
        waiting.current = null;
        if (target.el === null || takeHolderFocus(target.nav)) return;
        if (--left > 0) waiting.current = nextFrame(look);
      };
      waiting.current = nextFrame(look);
      return false;
    },
    [stopWaiting],
  );

  const press = useCallback(
    (row: string, col: number, direction: SearchDirection): boolean => {
      stopWaiting();
      const rows = live();
      const at: SearchStopAt = { row: rows.findIndex((r) => r.key === row), col };
      if (at.row < 0) return false;
      const centers = (r: number): number[] | null => {
        const xs = rows[r]!.cells.map((c) => centerX(c.el!));
        return xs.every((x): x is number => x !== null) ? xs : null;
      };
      const move = searchMove(
        rows.map((r) => r.cells.length),
        at,
        direction,
        centers,
        (from, to) => enterAt.current(rows[from]!.key, rows[to]!.key),
      );
      if (move === "hold") return true;
      if (move === "leave") return takeNavFocus("tab-bar");
      return hop(rows[move.row]!.cells[move.col]!) || true;
    },
    [live, hop, stopWaiting],
  );

  const stop = useCallback(
    (row: string, col: number): SearchStopProps => {
      const c = cell(row, col);
      return {
        /* One function for the life of the cell, so it runs only when the control is drawn or goes away. When the
           control goes away its nav node goes with it: a later move onto a stop drawn in its place must wait for
           that stop's own node, not transfer onto the old one (plan 93, lane B11). */
        ref: (c.setEl ??= (el) => {
          c.el = el;
          if (el === null) c.nav.current = null;
        }),
        navRef: c.nav,
        onMoveUp: () => press(row, col, "up"),
        onMoveDown: () => press(row, col, "down"),
        onMoveLeft: () => press(row, col, "left"),
        onMoveRight: () => press(row, col, "right"),
      };
    },
    [press],
  );

  const focusStop = useCallback(
    (row: string, col: number): boolean => {
      const c = cells.current.get(row)?.[col];
      return c ? hop(c) : false;
    },
    [hop],
  );

  return { stop, focusStop };
}
