/**
 * Title: The AI models box's list, laid out in the Deck's numbers
 * Purpose: Test helper for the Browse screen's walk tests. Gives the list, its sticky column-header row,
 *          group titles, rows and their buttons the boxes the Deck measured (header 26 px, rows 35 px, a
 *          list too short for all its rows, 2026-10-02), and models Steam's scroll-into-view for
 *          `block: "nearest"` as the Deck did it: the sticky header counts as free space and
 *          scroll-margin-top changes nothing, so the plugin has to clear the header itself.
 * Used for: PullModelsModal.listScroll.test.tsx and PullModelsModal.tryOrder.test.tsx.
 * Does not: render anything or press anything; the tests do, and call `steamNearest` on whatever took
 *           the ring after each press, as Steam does.
 */
export const LIST_TOP = 217;
export const LIST_HEIGHT = 130; // short enough that four rows overflow, as the Deck's list did (it scrolled 41 px)
const HEADER_H = 26;
const ROW_H = 35;
const TITLE_H = 18;
const SLOT_INSET = 5.5;
const SLOT_H = 24;

const rect = (top: number, bottom: number) =>
  ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

/** Gives the list, its sticky header, its group titles, rows and their buttons the Deck's boxes. */
export function layOutList(list: HTMLElement) {
  const header = list.querySelector<HTMLElement>(".bonsai-pullmodels-table-row--head")!;
  const items = Array.from(
    list.querySelectorAll<HTMLElement>(".bonsai-pullmodels-group-title, .bonsai-pullmodels-table-row--data")
  );
  const contentY = new Map<HTMLElement, number>();
  let y = HEADER_H;
  for (const el of items) {
    contentY.set(el, y);
    y += el.classList.contains("bonsai-pullmodels-group-title") ? TITLE_H : ROW_H;
  }
  const scrollHeight = y;
  Object.defineProperty(list, "clientHeight", { value: LIST_HEIGHT, configurable: true });
  Object.defineProperty(list, "scrollHeight", { value: scrollHeight, configurable: true });
  list.getBoundingClientRect = () => rect(LIST_TOP, LIST_TOP + LIST_HEIGHT);
  header.getBoundingClientRect = () => rect(LIST_TOP, LIST_TOP + HEADER_H); // sticky: never moves
  for (const el of items) {
    const top = () => LIST_TOP + contentY.get(el)! - list.scrollTop;
    el.getBoundingClientRect = () => rect(top(), top() + (el.classList.contains("bonsai-pullmodels-group-title") ? TITLE_H : ROW_H));
    if (el.classList.contains("bonsai-pullmodels-group-title")) continue;
    for (const btn of Array.from(el.querySelectorAll<HTMLElement>("button"))) {
      btn.getBoundingClientRect = () => rect(top() + SLOT_INSET, top() + SLOT_INSET + SLOT_H);
    }
  }
  return { header, scrollHeight };
}

/**
 * `scrollIntoView({block:"nearest"})` as the Deck did it on 2026-10-02 (plan79-P79-M9-MODELS-BOX-AFTER.json):
 * the sticky header counts as free space, and scroll-margin-top changed nothing. Going Up onto the first model
 * with the list scrolled 41 px, the row was already partly inside the list's box, so the list was NOT scrolled
 * at all and 15 px of the row stayed behind the header. A row that overflows the bottom edge is scrolled in.
 */
export function steamNearest(list: HTMLElement, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const maxScroll = Math.max(0, list.scrollHeight - LIST_HEIGHT);
  if (r.top < LIST_TOP && r.bottom <= LIST_TOP) list.scrollTop = Math.max(0, list.scrollTop - (LIST_TOP - r.top));
  else if (r.bottom > LIST_TOP + LIST_HEIGHT) {
    list.scrollTop = Math.min(maxScroll, list.scrollTop + (r.bottom - (LIST_TOP + LIST_HEIGHT)));
  }
}
