/**
 * Title: Chat panel scroll helpers
 * Purpose: Locate QAM TabContentsScroll, scroll panels by step, and geometry nudges for clipped content.
 * Used for: answerBubbleNavigation, useStreamScrollPin, and settingsPanelScroll.
 * Solves: Reliable scroll targets inside Decky tab panels without assuming a single overflow ancestor.
 * Does not: Manage focus graph — see liveTurnFocusGraph and focusNavigation.
 */
/** QAM tab scroll container used by Decky plugin panels. */
export function findTabContentsScroll(anchor: HTMLElement | null): HTMLElement | null {
  return anchor?.closest('[class*="TabContentsScroll"]') as HTMLElement | null;
}

/** Prefer TabContentsScroll when it has scroll range; else nearest overflow ancestor. */
export function findScrollablePanel(anchor: HTMLElement | null): HTMLElement | null {
  const tab = findTabContentsScroll(anchor);
  if (tab && panelScrollMax(tab) > 0) return tab;

  let el: HTMLElement | null = anchor;
  while (el) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === "auto" || oy === "scroll" || oy === "overlay") return el;
    }
    el = el.parentElement;
  }
  return tab;
}

/** Nudge scroll when TabContentsScroll grew with content (max=0) but content is clipped. */
export function tryGeometryPanelScroll(
  anchor: HTMLElement,
  direction: "up" | "down",
  stepPx = 120
): boolean {
  const scroll = findTabContentsScroll(anchor) ?? findScrollablePanel(anchor);
  if (!scroll) return false;

  const before = scroll.scrollTop;
  if (panelScrollMax(scroll) > 0) {
    return scrollTabContentsByStep(anchor, direction, stepPx);
  }

  const target =
    direction === "down"
      ? (anchor.closest(".bonsai-chat-ai-bubble") as HTMLElement | null) ?? anchor
      : (scroll.firstElementChild as HTMLElement | null) ?? anchor;
  target.scrollIntoView({
    block: direction === "down" ? "end" : "start",
    behavior: "auto",
  });
  return scroll.scrollTop !== before || panelScrollMax(scroll) > 0;
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
  if (max <= 0) {
    return tryGeometryPanelScroll(anchor, direction, stepPx);
  }
  if (direction === "down" && scroll.scrollTop >= max - 1) return false;
  if (direction === "up" && scroll.scrollTop <= 0) return false;
  const step = stepPx ?? Math.max(80, Math.floor(scroll.clientHeight * 0.35));
  return scrollTabContentsByStep(anchor, direction, step);
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

/**
 * Feature: the readable bottom edge of a scroll panel.
 * Input: the scroll container. Output: the y below which nothing can be read.
 *
 * The Main tab's bottom dock (presets, Ask bar, context line) is sticky INSIDE this container, so
 * the container's own bottom edge is well below the last readable pixel. Measured on the Deck
 * 2026-09-06: the last part of a long answer sat a third behind the Ask bar with the ring on it,
 * because every check here compared against the container's bottom and saw nothing hidden.
 *
 * Falls back to the container's bottom on any tab that has no dock.
 */
export function readableBottomOf(scrollEl: HTMLElement): number {
  const containerBottom = scrollEl.getBoundingClientRect().bottom;
  const dock = scrollEl.querySelector(".bonsai-main-tab-dock") as HTMLElement | null;
  if (!dock) return containerBottom;
  const dockTop = dock.getBoundingClientRect().top;
  /* A dock parked below the fold, or one with no height yet, must not shrink the band to nothing. */
  if (!(dockTop > scrollEl.getBoundingClientRect().top)) return containerBottom;
  return Math.min(containerBottom, dockTop);
}

export function chunkHasContentBelowViewport(chunkEl: HTMLElement, scrollEl: HTMLElement): boolean {
  return chunkEl.getBoundingClientRect().bottom > readableBottomOf(scrollEl) + 4;
}

export function chunkHasContentAboveViewport(chunkEl: HTMLElement, scrollEl: HTMLElement): boolean {
  return chunkEl.getBoundingClientRect().top < scrollEl.getBoundingClientRect().top - 4;
}
