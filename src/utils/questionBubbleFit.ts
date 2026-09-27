/**
 * Title: Fit the open question bubble to its longest line
 *
 * Purpose: Option D for the question bubble (the maintainer's pick, 2026-09-26, plan 72). The
 * stylesheet already evens out the open question's lines (text-wrap: balance), but a browser
 * does not shrink a box to its longest line after wrapping: measured on the Deck
 * (plan72-P-QBUBBLE-handheld.json), a three-line question kept its bubble at full width with
 * 20.3 px of empty space left of the widest line. This reads the text's real line boxes and sets
 * the bubble to the widest line, plus its padding and border, plus the room the text keeps clear
 * of the Retry arrow.
 *
 * Used for: buildTurnHeaderElement.tsx, from the question bubble's ref.
 *
 * Does not: Touch a collapsed row (one line with an ellipsis) or a one-line question, which
 * already fits its text. Does not measure on every render or every frame: only when the text,
 * the open state, Retry, or the column's width changes.
 */

/** What the last fit of one bubble was for, and the column watch that re-fits it. */
/* `columnWidth` is null until the watch first reports, which it does as soon as it starts. */
type FitState = { key: string; columnWidth: number | null; observer: ResizeObserver | null };

const fits = new WeakMap<HTMLElement, FitState>();

/** Lines closer together than this, top to top, are the same line split into fragments. */
const SAME_LINE_PX = 3;

/**
 * In: the title span. Out: the width of each laid-out line, top to bottom.
 * A Range over the text reports one box per line fragment; fragments on one line are merged.
 */
function lineWidths(title: HTMLElement): number[] {
  const range = document.createRange();
  range.selectNodeContents(title);
  const lines: { top: number; left: number; right: number }[] = [];
  for (const r of Array.from(range.getClientRects?.() ?? [])) {
    if (r.width < 1) continue;
    const same = lines.find((l) => Math.abs(l.top - r.top) < SAME_LINE_PX);
    if (same) {
      same.left = Math.min(same.left, r.left);
      same.right = Math.max(same.right, r.right);
    } else {
      lines.push({ top: r.top, left: r.left, right: r.right });
    }
  }
  return lines.map((l) => l.right - l.left);
}

/**
 * Measure once and set the width. The inline width is cleared first so the text wraps at the
 * bubble's natural (capped) width; `!important` because the stylesheet's own
 * `width: fit-content` carries it. The room kept for Retry is the float the stylesheet puts on
 * the title's last line (its `::after`, 0 when there is no Retry): adding it to every line keeps
 * the widest line clear of the arrow by the same 3 px as the last one.
 */
function fit(header: HTMLElement): void {
  const title = header.querySelector<HTMLElement>(".bonsai-chat-turn-row-title");
  header.style.removeProperty("width");
  if (!title) return;
  const widths = lineWidths(title);
  if (widths.length < 2) return;
  const longest = Math.max(...widths);
  const padding = header.getBoundingClientRect().width - title.getBoundingClientRect().width;
  const retryRoom = parseFloat(window.getComputedStyle(title, "::after").width) || 0;
  header.style.setProperty("width", `${Math.ceil(longest + padding + retryRoom)}px`, "important");
}

/**
 * For the question bubble's ref, on every render. In: the bubble (or null on unmount), whether
 * it is open, and a key that changes whenever what is inside it does (its text and Retry).
 * A closed bubble gets its natural width back and stops being watched.
 */
export function fitOpenQuestionBubble(header: HTMLElement | null, expanded: boolean, key: string): void {
  if (!header) return;
  const state = fits.get(header);
  if (!expanded) {
    if (state) {
      state.observer?.disconnect();
      fits.delete(header);
      header.style.removeProperty("width");
    }
    return;
  }
  if (state?.key === key) return;
  state?.observer?.disconnect();
  const next: FitState = { key, columnWidth: null, observer: null };
  fits.set(header, next);
  fit(header);

  const column = header.parentElement;
  if (!column || typeof ResizeObserver === "undefined") return;
  next.observer = new ResizeObserver((entries) => {
    if (!header.isConnected) {
      next.observer?.disconnect();
      return;
    }
    const width = entries[entries.length - 1]?.contentRect.width;
    if (width == null) return;
    const before = next.columnWidth;
    next.columnWidth = width;
    /* The first report comes once layout has settled after mount: fit once more there, in case
       the bubble was measured before it had a place (then no lines read, and no width set). */
    if (before === null || Math.abs(width - before) >= 0.5) fit(header);
  });
  next.observer.observe(column);
}
