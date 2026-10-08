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

/**
 * Put `el`'s top edge at the scroll pane's own top edge, `padPx` below it. Unlike
 * `scrollIntoView({ block: "start" })` this ignores the pane's `scroll-padding-top`, which Steam's
 * Quick Access scroll area sets to 116 px: measured on the Deck
 * (docs/test-evidence/plan64-NOTES-OPEN-SCROLL-rec.json), opening a "From the notes" block asked to
 * bring its header to the top, the header already sat exactly 116 px down, and the view moved 1 px
 * -- 17% of the block showed in a band of about 200 px above the dock. Nothing of ours is pinned
 * to the top of that pane (only the dock, at the bottom), so the full band is free to use.
 * Returns false, after falling back to scrollIntoView, when there is no scroll pane to move.
 */
export function scrollElementTopToPaneTop(el: HTMLElement, padPx = 4): boolean {
  const pane = findScrollablePanel(el);
  if (!pane) {
    el.scrollIntoView({ block: "start" });
    return false;
  }
  const delta = el.getBoundingClientRect().top - pane.getBoundingClientRect().top - padPx;
  pane.scrollTop = Math.max(0, Math.min(panelScrollMax(pane), pane.scrollTop + delta));
  return true;
}

/**
 * Scroll down just enough that `el` (something that has just opened) clears the bottom dock,
 * without pushing its own top, or `keep` (the control holding the ring, above it), off the top of
 * the pane. Plain scrollTop arithmetic, for the scroll-padding reason on scrollElementTopToPaneTop.
 * Plan 70 flow 4.2 (docs/test-evidence/plan70-F4-SHOW-DETAILS.json): Show details opened its panel
 * with the tab row at y 617 behind the dock (top 600) and no scroll, so nothing seemed to happen.
 * `roomBelowPx` asks for that much clear room under `el` too (a row of chips that is about to have
 * a panel of unknown height drawn under it). Returns true when it moved the pane.
 */
export function revealBelowKeeping(
  el: HTMLElement,
  keep: HTMLElement | null,
  padPx = 8,
  roomBelowPx = 0
): boolean {
  const pane = findScrollablePanel(el);
  if (!pane) return false;
  const rect = el.getBoundingClientRect();
  const paneTop = pane.getBoundingClientRect().top;
  let delta = rect.bottom + roomBelowPx + padPx - readableBottomOf(pane);
  delta = Math.min(delta, rect.top - paneTop - padPx);
  if (keep && keep !== el && pane.contains(keep)) {
    delta = Math.min(delta, keep.getBoundingClientRect().top - paneTop - padPx);
  }
  if (delta <= 0) return false;
  const before = pane.scrollTop;
  pane.scrollTop = Math.max(0, Math.min(panelScrollMax(pane), before + delta));
  return pane.scrollTop !== before;
}

/** Extras for revealBelowKeepingAsItSettles. */
export type SettleRevealOptions = {
  /** Room to keep clear under `el`, on top of `el` itself (see revealBelowKeeping). */
  roomBelowPx?: number;
  /**
   * Asked before every pass: false drops that pass. A caller whose ring has since moved on must not
   * have a pass still pending from its last press scroll the pane a second later: measured on the
   * Deck 2026-10-08, the answer kept scrolling about a second after the ring left the Show details
   * chips for the question box.
   */
  stillWanted?: () => boolean;
};

/**
 * revealBelowKeeping, re-run as things settle: a frame after the call, then on the same
 * 150/300/900 ms schedule useDockClearanceOnFocus's lift uses (SETTLE_PASS_DELAYS_MS there, the
 * one timing this device has been measured to hold). `keep` is asked afresh on every pass, so a
 * ring that moves in the meantime is the one kept on screen. Scrolls only; never moves the ring.
 * Each pass measures first and scrolls only if `el` is still behind the dock.
 */
export function revealBelowKeepingAsItSettles(
  el: HTMLElement,
  keep: () => HTMLElement | null,
  delaysMs: readonly number[] = [150, 300, 900],
  options: SettleRevealOptions = {}
): void {
  const pass = () => {
    if (!el.isConnected) return;
    if (options.stillWanted && !options.stillWanted()) return;
    revealBelowKeeping(el, keep(), 8, options.roomBelowPx ?? 0);
  };
  requestAnimationFrame(pass);
  delaysMs.forEach((delayMs) => window.setTimeout(pass, delayMs));
}

/**
 * Scroll, up or down, only as far as needed to put `el` inside the readable band (below the pane's
 * top edge, above the dock). Used for the control holding the ring when a press did not move it
 * but may have left it out of view; it never scrolls for anything that is already on screen.
 * Returns true when it moved the pane.
 */
export function bringIntoReadableBand(el: HTMLElement, padPx = 8): boolean {
  const pane = findScrollablePanel(el);
  if (!pane) return false;
  const rect = el.getBoundingClientRect();
  /* No box at all (not displayed, or not laid out): there is nothing to bring anywhere. */
  if (rect.width === 0 && rect.height === 0) return false;
  const paneTop = pane.getBoundingClientRect().top;
  let delta = 0;
  if (rect.top < paneTop) {
    delta = rect.top - paneTop - padPx;
  } else if (rect.bottom + padPx > readableBottomOf(pane)) {
    delta = Math.min(rect.bottom + padPx - readableBottomOf(pane), rect.top - paneTop - padPx);
  }
  if (delta === 0) return false;
  const before = pane.scrollTop;
  pane.scrollTop = Math.max(0, Math.min(panelScrollMax(pane), before + delta));
  return pane.scrollTop !== before;
}

/**
 * Scroll down so the end of `body` (a panel taller than the room under its chip row) clears the
 * dock, whatever that does to the row above it. Returns true only when it moved the pane, so a
 * caller can use it as "there was more to see" and let the next press carry on.
 */
export function scrollRestOfBodyIntoView(body: HTMLElement, padPx = 8): boolean {
  const pane = findScrollablePanel(body);
  if (!pane) return false;
  const hidden = body.getBoundingClientRect().bottom + padPx - readableBottomOf(pane);
  if (hidden <= 4) return false;
  const before = pane.scrollTop;
  pane.scrollTop = Math.max(0, Math.min(panelScrollMax(pane), before + hidden));
  return pane.scrollTop !== before;
}

const revealedOnMount = new WeakSet<HTMLElement>();

/**
 * For a `ref` callback: bring something that has just appeared out from behind the dock, once per
 * element, keeping whatever holds the ring on screen. The chat summary card appeared behind the
 * dock after Sum up finished (top 597, dock 600) and when opened from the note under an answer
 * (44 of 418 px showing), measured on the Deck 2026-09-25 and 2026-09-26.
 */
export function revealOnceWhenMounted(el: HTMLElement | null, keep: () => HTMLElement | null): void {
  if (!el || revealedOnMount.has(el)) return;
  revealedOnMount.add(el);
  revealBelowKeepingAsItSettles(el, keep);
}
