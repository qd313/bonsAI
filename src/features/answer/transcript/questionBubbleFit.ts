/**
 * Title: Fit the open question bubble to its longest line
 *
 * Purpose: Option D for the question bubble (the maintainer's pick, 2026-09-26, plan 72). The
 * stylesheet already evens out the open question's lines (text-wrap: balance), but a browser
 * does not shrink a box to its longest line after wrapping: measured on the Deck
 * (plan72-P-QBUBBLE-handheld.json), a three-line question kept its bubble at full width with
 * 20.3 px of empty space left of the widest line. This reads the text's real line boxes, evens
 * the lines out itself (balance did nothing on the Deck), and sets the bubble to the widest line,
 * plus its padding and border, plus the room the text keeps clear of the Retry arrow.
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

/** Set on a bubble while it is fitted: the stylesheet then drops the Retry float (see fit). */
const FITTED_ATTR = "data-bonsai-fitted";

/**
 * Even out the lines by hand. The stylesheet asks for text-wrap: balance, but the Deck re-check
 * (plan72-F-BUBBLE.json, build 0065fccb) found it has no effect there: the lines stayed 193.6 /
 * 225.0 / 105.8. Most likely Chromium skips balancing when a float sits in the paragraph, and the
 * Retry spacer is one. So: a binary search on the title's max-width for the narrowest width that
 * keeps the same number of lines and no more height. About six layouts, once per fit, never per
 * frame.
 * In: the title, its natural lines and height, and the widest the title may be.
 * Out: that narrowest width, left set on the title; or null when even the widest does not keep
 * the lines, with the title's max-width cleared again.
 */
function balanceTitle(title: HTMLElement, natural: number[], height: number, widest: number): number | null {
  const keeps = (width: number): boolean => {
    title.style.setProperty("max-width", `${width}px`, "important");
    return lineWidths(title).length === natural.length && title.scrollHeight <= height;
  };
  let fits = Math.floor(widest);
  if (!keeps(fits)) {
    title.style.removeProperty("max-width");
    return null;
  }
  const total = natural.reduce((sum, w) => sum + w, 0);
  let fails = Math.floor(total / natural.length) - 1;
  while (fits - fails > 1) {
    const mid = Math.floor((fits + fails) / 2);
    if (keeps(mid)) fits = mid;
    else fails = mid;
  }
  title.style.setProperty("max-width", `${fits}px`, "important");
  return fits;
}

/**
 * Measure and set the width. Inline widths are cleared first so the text wraps at the bubble's
 * natural (capped) width; `!important` because the stylesheet's own `width: fit-content` carries
 * it. The room kept for Retry is the float the stylesheet puts on the title's last line (its
 * `::after`, 0 when there is no Retry).
 *
 * Fitted, the bubble is the balanced text width + that room + its own padding and border, and the
 * title box sits at the right (its `margin-left: auto`), so the room is on the left of EVERY line
 * and the widest one starts 3 px from the arrow. The float is then switched off (FITTED_ATTR): left
 * on, it would take the room a second time from the last line, and it stops the lines narrowing
 * (the last line plus 19 would set the width, leaving 22 px beside the arrow). When the balanced
 * text will not fit beside that room, the float stays and the bubble gets the plain fit instead:
 * the widest natural line + padding + room, as passed on the Deck (plan72-F-BUBBLE.json).
 */
function fit(header: HTMLElement): void {
  const title = header.querySelector<HTMLElement>(".bonsai-chat-turn-row-title");
  header.style.removeProperty("width");
  header.removeAttribute(FITTED_ATTR);
  if (!title) return;
  title.style.removeProperty("max-width");
  const widths = lineWidths(title);
  if (widths.length < 2) return;
  const titleWidth = title.getBoundingClientRect().width;
  const padding = header.getBoundingClientRect().width - titleWidth;
  const retryRoom = parseFloat(window.getComputedStyle(title, "::after").width) || 0;
  const height = title.scrollHeight;
  header.setAttribute(FITTED_ATTR, "");
  const textWidth = balanceTitle(title, widths, height, titleWidth - retryRoom);
  if (textWidth === null) {
    header.removeAttribute(FITTED_ATTR);
    header.style.setProperty("width", `${Math.ceil(Math.max(...widths) + padding + retryRoom)}px`, "important");
    return;
  }
  header.style.setProperty("width", `${Math.ceil(textWidth + padding + retryRoom)}px`, "important");
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
      header.removeAttribute(FITTED_ATTR);
      header.querySelector<HTMLElement>(".bonsai-chat-turn-row-title")?.style.removeProperty("max-width");
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
