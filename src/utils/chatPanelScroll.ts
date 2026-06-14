/** QAM tab scroll container used by Decky plugin panels. */
export function findTabContentsScroll(anchor: HTMLElement | null): HTMLElement | null {
  return anchor?.closest('[class*="TabContentsScroll"]') as HTMLElement | null;
}

/** Prefer TabContentsScroll; fall back to first scrollable ancestor. */
export function findScrollablePanel(anchor: HTMLElement | null): HTMLElement | null {
  const tab = findTabContentsScroll(anchor);
  if (tab) return tab;
  let el: HTMLElement | null = anchor;
  while (el) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === "auto" || oy === "scroll" || oy === "overlay") return el;
    }
    el = el.parentElement;
  }
  return null;
}

/** Max scroll offset for a scroll container. */
export function panelScrollMax(scroll: HTMLElement): number {
  return Math.max(0, scroll.scrollHeight - scroll.clientHeight);
}

/** Scroll QAM panel from an anchor element; true when scroll position changed. */
export function tryScrollPanelFromAnchor(
  anchor: HTMLElement | null,
  direction: "up" | "down",
  stepPx?: number
): boolean {
  if (!anchor) return false;
  const scroll = findScrollablePanel(anchor);
  if (!scroll) return false;
  const max = panelScrollMax(scroll);
  if (max <= 0) return false;
  if (direction === "down" && scroll.scrollTop >= max - 1) return false;
  if (direction === "up" && scroll.scrollTop <= 0) return false;
  const step = stepPx ?? Math.max(80, Math.floor(scroll.clientHeight * 0.35));
  return scrollTabContentsByStep(anchor, direction, step);
}

/** Scroll QAM panel from current focus; true when scroll position changed. */
export function tryScrollPanelFromFocus(direction: "up" | "down", stepPx?: number): boolean {
  return tryScrollPanelFromAnchor(document.activeElement as HTMLElement | null, direction, stepPx);
}

/** Step the plugin tab scroll area; returns true when scroll position changed. */
export function scrollTabContentsByStep(
  anchor: HTMLElement,
  direction: "up" | "down",
  stepPx = 80
): boolean {
  const scroll = findScrollablePanel(anchor);
  if (!scroll) return false;
  const max = panelScrollMax(scroll);
  if (max <= 0) return false;
  const before = scroll.scrollTop;
  const next =
    direction === "down" ? Math.min(max, before + stepPx) : Math.max(0, before - stepPx);
  if (Math.abs(next - before) < 1) return false;
  scroll.scrollTop = next;
  return true;
}

export function chunkHasContentBelowViewport(chunkEl: HTMLElement, scrollEl: HTMLElement): boolean {
  return chunkEl.getBoundingClientRect().bottom > scrollEl.getBoundingClientRect().bottom + 4;
}

export function chunkHasContentAboveViewport(chunkEl: HTMLElement, scrollEl: HTMLElement): boolean {
  return chunkEl.getBoundingClientRect().top < scrollEl.getBoundingClientRect().top - 4;
}
