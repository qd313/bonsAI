/**
 * Title: Right and Left in the AI models box go to what sits beside the ring
 *
 * Purpose: The AI models box has two sides that scroll on their own: the filters column on the left
 * and, on the right, the try-order switch above the model list. A sideways press crosses between them
 * and must land on the stop that sits level with the ring on screen, measured at the moment of the
 * press. Before plan 92's second night Right went to "the list's remembered row" and Left to "the
 * column's remembered stop", which on the Deck's own screen landed 32 to 100 px above or below the
 * ring for 10 of the 12 column stops (plan92-P92-M-MODELS-MAP.json); the maintainer asked for the
 * ring to go to what is directly beside it instead.
 *
 * Used for: PullModelsModal.tsx (Right from any column stop, through the column's `toList`; Left from a
 * row's first cell, the star or a PC row's up button).
 *
 * How it works:
 *
 *     column (scrolls on its own)          right side (the switch, then the list, which scrolls on its own)
 *     [ 4 models match     Clear ] ------> [ Text ][ Pictures ][ Reset order ]   level: the switch
 *       Open source only            ------> ☆ gemma4 ... (32 px below: the nearest within reach)
 *       Also try open-weight        <-----> ☆ gemma4 ...                         level: that row's star
 *       Any installed (greyed)       <-x-   ☆ qwen3.5 ...  Left goes to Also try instead (38 px), never here
 *       Speed                       <-----> ☆ qwen2.5vl ...
 *       Strategy                    ------> ☆ qwen2.5vl ... (30 px; the next row is scrolled out of sight)
 *
 * 1. `pickBeside` (pure, no DOM): the candidate whose vertical centre is nearest the ring's, but only
 *    when it is within `reach`; otherwise none, and the press is held (it does nothing; on the Deck's
 *    own screen that is only an empty list, since every stop has something within reach). A key named in
 *    `prefer` wins while it is still within reach, so a Right then a Left comes back to where it began.
 * 2. `usePullModelsBeside` measures the real elements at the press: the ring's own button, the
 *    switch's active chip and each row's star whose centre is inside the list's visible box (below its
 *    sticky header row, above its bottom edge) for Right; for Left, the column's stops (the column hands
 *    over only the ones that can take the ring, the greyed licence row left out by its own state) whose
 *    centre is inside the column's box. Anything scrolled out of sight is not a candidate.
 * 3. `reach` is `BESIDE_REACH_ROWS` (one and a half) model rows, the row's height read from the first
 *    row the list draws: about 52 px on the Deck. The one running plan 92's second night chose this
 *    over half a row, because a held press feels dead and "no dead press" is a standing Deck check;
 *    this is the one place the number lives.
 * 4. The ring crosses only by Steam's own transfer onto the other side's nav node (`handRingTo`), then
 *    a sibling focus onto the chosen stop inside it, never a bare focus() across containers.
 *
 * Does not: Decide Up and Down (each side walks itself), skip the greyed licence row itself (the
 * column leaves it out of its stops by its own state, never by asking the button: on the Deck a greyed
 * button still takes the ring), or remember anything after the box closes.
 */
import { useRef, type MutableRefObject } from "react";
import type { NavRefHolder } from "../../../shared/dpad/navFocusRegistry";
import { handRingTo } from "./pullModelsBoxMemory";

type BesideCandidate<K> = { key: K; y: number };

/** A pixel of slack, for rounding between the two sides' boxes. */
const SLACK_PX = 1;

/**
 * The key of the candidate beside a ring whose vertical centre is `originY`: the nearest centre within
 * `reach`, `prefer` first when it is within reach, or null when nothing is (the press is held).
 */
export function pickBeside<K>(
  originY: number,
  candidates: readonly BesideCandidate<K>[],
  reach: number,
  prefer: K | null = null
): K | null {
  let best: BesideCandidate<K> | null = null;
  for (const c of candidates) {
    const gap = Math.abs(c.y - originY);
    if (gap > reach + SLACK_PX) continue;
    if (prefer !== null && c.key === prefer) return c.key;
    if (!best || gap < Math.abs(best.y - originY)) best = c;
  }
  return best ? best.key : null;
}

/** The vertical centre of a real element on screen, or null for anything that is not one. */
function centreY(el: unknown): number | null {
  if (!el || typeof (el as Element).getBoundingClientRect !== "function") return null;
  const r = (el as Element).getBoundingClientRect();
  return (r.top + r.bottom) / 2;
}

/** How many model rows away a landing may sit from the ring and still count as beside it. */
export const BESIDE_REACH_ROWS = 1.5;

/** The reach in pixels: `BESIDE_REACH_ROWS` of the list's first drawn row (else of the ring's own height). */
function reachPx(list: HTMLElement | null, origin: Element): number {
  const row = list?.querySelector(".bonsai-pullmodels-table-row--data");
  const h = row?.getBoundingClientRect().height || origin.getBoundingClientRect().height;
  return h * BESIDE_REACH_ROWS;
}

const SWITCH = "switch";
const ROW = "row:";

/** One stop of the filters column, as the column hands it over: its key and its element on screen. */
type ColumnStop = { key: string; el: HTMLElement };
/** What the box can ask of the column: its stops that can take the ring, and a sibling focus onto one (null: Clear). */
export type FiltersColumnApi = { focusStop: (key: string | null) => boolean; stops: () => ColumnStop[] };

type BesideArgs = {
  /** The two sides' nav nodes (Steam fills them): the transfer targets of Right and Left. */
  listNavRef: NavRefHolder;
  columnNavRef: NavRefHolder;
  columnApi: MutableRefObject<FiltersColumnApi | null>;
  /** The list's scroll box and its sticky column-header row (plain divs). */
  listRef: MutableRefObject<HTMLElement | null>;
  headerRef: MutableRefObject<HTMLElement | null>;
  /** Each row's first cell (its star, or a PC row's up button), by row index. */
  selectCellRefs: MutableRefObject<(HTMLElement | null)[]>;
  /** A sibling focus onto a row's star once the ring is in the list (it clears the sticky header too). */
  focusRowCell: (rowIndex: number, cell: "select") => boolean;
  /** The try-order switch's active chip, when the switch is drawn, and the ring's way onto it. */
  switchChip: () => HTMLElement | null;
  enterSwitch: () => boolean;
};

/**
 * In: the box's two sides, as above. Out: `enterList(origin, from)`, Right from a column stop (the
 * element the ring is on and the stop's key), and `enterColumn(rowIndex)`, Left from a row's first
 * cell. Each is true when the press is taken (moved, or held because nothing is beside); false only
 * when Steam's transfer failed, which leaves the press to Steam.
 */
export function usePullModelsBeside(a: BesideArgs) {
  /** The last crossing, so a press straight back returns to where it came from. */
  const crossing = useRef<{ from: string; to: string } | null>(null);
  const backTo = (at: string) => (crossing.current?.to === at ? crossing.current.from : null);

  const enterList = (origin: HTMLElement | null, from: string): boolean => {
    const y = centreY(origin);
    const list = a.listRef.current;
    if (y === null || !origin) return true;
    const candidates: BesideCandidate<string>[] = [];
    const chipY = centreY(a.switchChip());
    if (chipY !== null) candidates.push({ key: SWITCH, y: chipY });
    if (list) {
      const box = list.getBoundingClientRect();
      const top = a.headerRef.current?.getBoundingClientRect().bottom ?? box.top;
      a.selectCellRefs.current.forEach((el, i) => {
        const cy = centreY(el);
        if (cy !== null && cy >= top && cy <= box.bottom) candidates.push({ key: ROW + i, y: cy });
      });
    }
    const key = pickBeside(y, candidates, reachPx(list, origin), backTo(from));
    if (key === null) return true;
    if (key === SWITCH) {
      if (!a.enterSwitch()) return false;
    } else {
      if (!handRingTo(a.listNavRef)) return false;
      a.focusRowCell(Number(key.slice(ROW.length)), "select");
    }
    crossing.current = { from, to: key };
    return true;
  };

  const enterColumn = (rowIndex: number): boolean => {
    const at = ROW + rowIndex;
    const origin = a.selectCellRefs.current[rowIndex];
    const y = centreY(origin);
    const api = a.columnApi.current;
    if (y === null || !origin || !api) return true;
    const stops = api.stops();
    const box = stops[0]?.el.closest(".bonsai-pullmodels-filtercol")?.getBoundingClientRect();
    const candidates: BesideCandidate<string>[] = [];
    for (const s of stops) {
      const cy = centreY(s.el);
      if (cy !== null && (!box || (cy >= box.top && cy <= box.bottom))) candidates.push({ key: s.key, y: cy });
    }
    const key = pickBeside(y, candidates, reachPx(a.listRef.current, origin), backTo(at));
    if (key === null) return true;
    if (!handRingTo(a.columnNavRef)) return false;
    api.focusStop(key);
    crossing.current = { from: at, to: key };
    return true;
  };

  return { enterList, enterColumn };
}
