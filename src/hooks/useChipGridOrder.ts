/**
 * Title: Show details chips: the order they are drawn in
 *
 * Purpose: Measure the Show details chips and their row, pack them into rows that fit
 * (chipLadderGrid.ts), and hand back the order to draw them in.
 *
 * Used for: ContextChipLadder.tsx, which gives each chip its place in that order (CSS `order`, so no
 * chip element is ever moved or rebuilt, and the one holding Steam's ring keeps it).
 *
 * Solves: The packing needs real widths, which exist only once the chips are drawn. Measuring after
 * every draw, before the screen is painted, means the first frame a person sees is already packed.
 *
 * Does not: Decide where a press goes (gridMove reads the drawn rows from the screen), or scroll.
 * With no layout (a test page) it keeps the ladder's own order.
 */
import { useLayoutEffect, useState, type RefObject } from "react";
import { packChipRows } from "../components/chipLadderGrid";

/**
 * The chips' drawn order, as indices into the ladder's list.
 *
 * In: the chip row's element, each chip's element by its index, and how many chips there are.
 * Out: the order to draw them in; the ladder's own order until a packing says otherwise.
 *
 * 1. After every draw, read the row's width and each chip's full width (a label clipped by the row
 *    still reports its whole width through scrollWidth).
 * 2. Pack them; keep the result only when it differs from what is drawn, so a draw that changes
 *    nothing never draws again.
 */
export function useChipGridOrder(
  rowElRef: RefObject<HTMLElement | null>,
  chipEls: RefObject<Map<number, HTMLElement>>,
  count: number,
): number[] {
  const [order, setOrder] = useState<number[] | null>(null);

  useLayoutEffect(() => {
    const row = rowElRef.current;
    const els = chipEls.current;
    if (!row || !els) return;
    const widths: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const el = els.get(i);
      if (!el) return;
      const borders = el.offsetWidth - el.clientWidth;
      widths.push(Math.max(el.getBoundingClientRect().width, el.scrollWidth + Math.max(0, borders)));
    }
    const rows = packChipRows(widths, row.getBoundingClientRect().width);
    if (!rows) return;
    const packed = rows.flat();
    const current = order ?? widths.map((_, i) => i);
    if (packed.length !== current.length || packed.some((i, n) => i !== current[n])) setOrder(packed);
  });

  if (order && order.length === count) return order;
  return Array.from({ length: count }, (_, i) => i);
}
