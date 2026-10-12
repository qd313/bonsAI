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
 * Going through the nav node everywhere removes that whole class of bug and needs no page search.
 *
 * Does not: Draw anything, or decide what a press on a stop does; the controls supply that.
 */
import { useCallback, useRef } from "react";

import { takeHolderFocus } from "../../utils/chatTranscriptNavHelpers";
import { takeNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { searchMove, type SearchDirection, type SearchStopAt } from "./searchNav";

type Cell = { el: HTMLElement | null; nav: NavRefHolder };

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

const centerX = (el: HTMLElement): number | null => {
  const r = el.getBoundingClientRect();
  return r.width > 0 ? r.left + r.width / 2 : null;
};

/**
 * In: the rows' names top to bottom, as drawn right now (rows with no stop on screen are skipped).
 * Out: `stop(row, col)` for each control, and `focusStop` for landing the ring from code.
 * Can go wrong: a stop that is not drawn yet is skipped, not waited for; a caller that moves the ring
 * right after a state change does it in a layout effect, once the control exists.
 */
export function useSearchNav(rowOrder: readonly string[]): SearchNav {
  const order = useRef(rowOrder);
  order.current = rowOrder;
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

  const hop = useCallback((target: Cell): boolean => {
    if (takeHolderFocus(target.nav)) return true;
    if (target.el === null) return false;
    target.el.focus();
    return true;
  }, []);

  const press = useCallback(
    (row: string, col: number, direction: SearchDirection): boolean => {
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
      );
      if (move === "hold") return true;
      if (move === "leave") return takeNavFocus("tab-bar");
      return hop(rows[move.row]!.cells[move.col]!) || true;
    },
    [live, hop],
  );

  const stop = useCallback(
    (row: string, col: number): SearchStopProps => {
      const c = cell(row, col);
      return {
        ref: (el) => {
          c.el = el;
        },
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
