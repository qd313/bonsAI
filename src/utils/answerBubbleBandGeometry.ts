/**
 * Title: Answer bubble panel geometry
 *
 * Purpose: When the ring walks through an answer with Up and Down, the panel around it has to be
 * scrolled so that whatever the ring lands on can be read: not half under the tab header at the
 * top, not half behind the Ask bar (the "dock") at the bottom. This file holds the measuring and
 * scrolling for that. Every function here takes elements and returns a yes/no or scrolls the
 * panel; none of them moves the ring or remembers anything between presses.
 *
 * Used for: answerBubbleNavigation.ts, which decides what a press does and calls these to tidy up
 * the scroll afterwards. `elementIsWithinViewportOf` and `revealBelowDock` are also reached through
 * that file by the reply-buttons code and the test walk.
 *
 * Solves: The navigation file grew past its size limit; this is its self-contained geometry half,
 * moved out unchanged with its explanations.
 *
 * Does not: Choose the next stop, move focus, or hold the walk's memory (`walk`, `boxLandedIn`).
 * That is all in answerBubbleNavigation.ts.
 */
import {
  chunkHasContentAboveViewport,
  chunkHasContentBelowViewport,
  findScrollablePanel,
  panelScrollMax,
  readableBottomOf,
  scrollTabContentsByStep,
  tryGeometryPanelScroll,
} from "./chatPanelScroll";
import { findLastSpoilerFenceIn } from "./spoilerFenceRegistry";

/** A pixel or two of an edge is rounding, not a cut. */
export const CUT_TOLERANCE_PX = 1;

/**
 * True when `el` overlaps the READABLE band of its scroll container.
 *
 * Readable, not the container's full height: the Main tab's dock is sticky inside the container and
 * covers its bottom, so a section wholly behind the Ask bar used to count as in view and could take
 * the ring (measured 2026-09-06).
 */
export function elementIsWithinViewportOf(el: HTMLElement, scroll: HTMLElement): boolean {
  const elRect = el.getBoundingClientRect();
  const scrollRect = scroll.getBoundingClientRect();
  return elRect.bottom > scrollRect.top && elRect.top < readableBottomOf(scroll);
}

/**
 * Feature: a section the ring just landed on should be readable, not half behind the Ask bar.
 * Input: the focused section and its scroll container. Output: true when the panel actually moved.
 *
 * Scrolls only as far as it takes to clear the dock, and never past the section's own top — a
 * section taller than the readable band parks with its top at the top of the band rather than
 * jumping its start off screen. Nothing else about the step-by-step scrolling changes.
 *
 * One pass, at the moment of landing. Steam's own focus scroll starts about 30ms AFTER this
 * returns and glides for ~150ms — scroll log on the Deck, 2026-09-06, Up out of the Show details
 * line: Steam smooth-scrolled the whole bubble "nearest", which for a bubble taller than the pane
 * means bottom-aligned, and that dragged the last section under the dock. A second pass a frame
 * later ran before the glide had moved anything and changed nothing. The late correction belongs
 * to useDockClearanceOnFocus, whose settle passes at 150/300/900ms re-measure after the glide.
 */
export function revealBelowDock(el: HTMLElement, scroll: HTMLElement): boolean {
  const elRect = el.getBoundingClientRect();
  const scrollRect = scroll.getBoundingClientRect();
  const hidden = elRect.bottom - readableBottomOf(scroll);
  if (hidden <= 4) return false;
  const headroom = Math.max(0, elRect.top - scrollRect.top);
  const step = Math.min(hidden, headroom);
  if (step < 1) return false;
  const before = scroll.scrollTop;
  scroll.scrollTop = Math.min(panelScrollMax(scroll), before + step);
  return scroll.scrollTop !== before;
}

/** Room left above a section the walk brings out from under the tab header. */
export const SECTION_TOP_PAD_PX = 8;

/** Height of the readable band: from the tab header's bottom edge to the dock's top. */
export function bandHeightOf(scroll: HTMLElement): number {
  return readableBottomOf(scroll) - scroll.getBoundingClientRect().top;
}

/** Less than this below a cover's bottom edge is the section's own padding, not text after it (the Deck's lone cover: 55 px in a 71 px box). */
const TEXT_AFTER_COVER_MIN_PX = 24;

/** The last hidden cover inside `section`, wherever it is on screen, or null. */
export function lastHiddenCoverIn(section: HTMLElement): HTMLElement | null {
  return findLastSpoilerFenceIn(section, () => true);
}

/** True when `section` is no more than `cover` and its padding: nothing else to stop on in it. */
export function isCoverOnly(section: HTMLElement, cover: HTMLElement): boolean {
  const box = section.getBoundingClientRect();
  const c = cover.getBoundingClientRect();
  return box.bottom - box.top - (c.bottom - c.top) <= TEXT_AFTER_COVER_MIN_PX;
}

/**
 * True when `section` has a box stop of its own next to its covers: it holds a hidden cover and text
 * runs on below the last one (the Deck's Soul Sanctum section 1: a 55 px cover, then a paragraph). A
 * section that is only its cover, or ends with it, has none: its box adds nothing to stop on, and A
 * on it opens the cover anyway. Worked out from the page's own boxes, never from what is on screen,
 * so Down and Up agree on it whatever the panel is doing (`boxAfterLastCover`, `stepUpIntoSection`).
 */
export function hasBoxStop(section: HTMLElement): boolean {
  const cover = lastHiddenCoverIn(section);
  return Boolean(cover) && section.getBoundingClientRect().bottom - cover!.getBoundingClientRect().bottom > TEXT_AFTER_COVER_MIN_PX;
}

/**
 * True when `cover` sits at the head of `section`: its bottom is within the section's first screenful (the
 * section's top just under the header, `SECTION_TOP_PAD_PX` above it, and the whole cover still above the
 * dock), so landing on the cover first leaves no text of the section unread above the header. Every cover
 * the Deck walked in plan 77 and 78 is one (24 px down, its bottom at most 79 px). A deeper one is reached by
 * reading the section: on the Deck a cover 383 px into a 446 px section took the ring straight from the line
 * above, and the section's opening was never on screen (plan78-P78-TALL-SECTION-LOOP-BEFORE.json).
 */
export function isCoverAtHead(section: HTMLElement, cover: HTMLElement, scroll: HTMLElement): boolean {
  const reach = cover.getBoundingClientRect().bottom - section.getBoundingClientRect().top;
  return reach + SECTION_TOP_PAD_PX <= bandHeightOf(scroll);
}

/** True when `el` sits wholly inside the readable band: below the tab header, above the dock. */
export function elementIsWhollyInBandOf(el: HTMLElement, scroll: HTMLElement): boolean {
  const elRect = el.getBoundingClientRect();
  return (
    elRect.top >= scroll.getBoundingClientRect().top - CUT_TOLERANCE_PX &&
    elRect.bottom <= readableBottomOf(scroll) + CUT_TOLERANCE_PX
  );
}

/**
 * Feature: a section the ring lands on is readable from its top, not half under the tab header.
 * Input: the landed section and its scroll container. Output: true when the panel moved.
 *
 * The walk's contract is that every stop the ring lands on is wholly visible, or, when it is taller
 * than the readable band, has its top edge visible (docs/test-evidence/plan76-P76-WALK-COVERS-try2.json:
 * the ring sat on a box 67% on screen, its top third, where its cover is, under the tab header).
 * `revealBelowDock` only ever scrolls the other way, for the dock. Here: a top cut off by the header
 * is brought to just under it (section a screen tall or not); else a bottom cut off by the dock, on a
 * section that fits, is lifted clear of it, never past the section's own top. Nothing moves when the
 * section already meets the contract. One pass at the moment of landing, like `revealBelowDock`.
 * `maxMovePx` refuses a scroll longer than that, for a walk Up into a section it is reading from its
 * end: everything between would go past unread.
 */
export function revealSectionInBand(section: HTMLElement, scroll: HTMLElement, maxMovePx = Infinity): boolean {
  const rect = section.getBoundingClientRect();
  const paneTop = scroll.getBoundingClientRect().top;
  const limit = readableBottomOf(scroll);
  const band = limit - paneTop;
  const height = rect.bottom - rect.top;
  let delta = 0;
  if (rect.top < paneTop - CUT_TOLERANCE_PX) {
    const pad = Math.min(SECTION_TOP_PAD_PX, Math.max(0, band - height));
    delta = rect.top - (paneTop + pad);
  } else if (height <= band && rect.bottom > limit + CUT_TOLERANCE_PX) {
    delta = rect.bottom - limit;
  }
  if (delta === 0 || Math.abs(delta) > maxMovePx) return false;
  const before = scroll.scrollTop;
  scroll.scrollTop = Math.max(0, Math.min(panelScrollMax(scroll), before + delta));
  return scroll.scrollTop !== before;
}

/**
 * Up lands on the box of a section taller than the readable band, coming from the section's first word:
 * bring the section's top to the top of the pane, where Down leaves it, so Up is Down reversed. The Deck
 * (plan81-P81-M-K2K3-GAME.json) left a 525 px section where the walk had it, its top 101 px below the pane
 * top with 99 px of earlier content above it: 19% of it showing, against 38% going Down. A section that
 * fits the band is left to `revealSectionInBand`. Only scrolls the panel; true when it moved.
 */
export function showTallSectionTop(section: HTMLElement, scroll: HTMLElement): boolean {
  const rect = section.getBoundingClientRect();
  if (rect.bottom - rect.top <= bandHeightOf(scroll)) return false;
  const delta = rect.top - scroll.getBoundingClientRect().top;
  if (delta <= CUT_TOLERANCE_PX) return false;
  const before = scroll.scrollTop;
  scroll.scrollTop = Math.min(panelScrollMax(scroll), before + delta);
  return scroll.scrollTop !== before;
}

/**
 * Down: the ring's section is already fully read (its bottom edge is inside the band) and the next one
 * starts below the dock, no more than a screen away. Scroll so the next section's top sits just under
 * the header, so the press that follows can land on it. Before this the press only scrolled 80 px and
 * left the ring on the read section, top under the header, one press later than Up would have been
 * (docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-FREEPLAY.json). A section still running past the
 * dock is not "read": its scroll-only presses are the reading design. Only moves the panel, and only
 * towards a later stop, so it cannot bounce.
 */
export function hopToSectionBelow(current: HTMLElement, next: HTMLElement, scroll: HTMLElement): boolean {
  const limit = readableBottomOf(scroll);
  const paneTop = scroll.getBoundingClientRect().top;
  if (current.getBoundingClientRect().bottom > limit + 4) return false;
  const rect = next.getBoundingClientRect();
  if (rect.top < limit || rect.top - limit > bandHeightOf(scroll)) return false;
  const pad = Math.min(SECTION_TOP_PAD_PX, Math.max(0, bandHeightOf(scroll) - (rect.bottom - rect.top)));
  const before = scroll.scrollTop;
  scroll.scrollTop = Math.min(panelScrollMax(scroll), before + rect.top - (paneTop + pad));
  return scroll.scrollTop !== before;
}

/**
 * Up: the ring's section has been read from its top (its top edge is inside the band) and the one above
 * is wholly above the header, no more than a screen away. Scroll so that section's bottom edge sits at
 * the dock (a taller one is then read from its end, a shorter one is wholly in view). The mirror of
 * `hopToSectionBelow`; only moves the panel, towards an earlier stop.
 */
export function hopToSectionAbove(current: HTMLElement, prev: HTMLElement, scroll: HTMLElement): boolean {
  const limit = readableBottomOf(scroll);
  const paneTop = scroll.getBoundingClientRect().top;
  if (current.getBoundingClientRect().top < paneTop - CUT_TOLERANCE_PX) return false;
  const rect = prev.getBoundingClientRect();
  if (rect.bottom > paneTop || paneTop - rect.bottom > bandHeightOf(scroll)) return false;
  const before = scroll.scrollTop;
  scroll.scrollTop = Math.max(0, before - (limit - rect.bottom));
  return scroll.scrollTop !== before;
}

/**
 * A section taller than the band, entered going Up from below: show its BOTTOM edge just above the
 * dock, so it is read from its end, upward. Landing on it left it wherever the panel was, which on the
 * Deck was top 58 px under the header and bottom 84 px under the dock, so neither edge showed
 * (docs/test-evidence/plan77-BLOCK2-GAME.json). `revealBelowDock` cannot help, it never scrolls past the
 * section's own top; this does, because for a tall section the top is not what the walk reads first.
 * Nothing moves for a section that fits the band, or whose bottom edge is already above the dock.
 */
function revealTallFromItsEnd(section: HTMLElement, scroll: HTMLElement): boolean {
  const rect = section.getBoundingClientRect();
  if (rect.bottom - rect.top <= bandHeightOf(scroll)) return false;
  const hidden = rect.bottom - readableBottomOf(scroll);
  if (hidden <= 4) return false;
  const before = scroll.scrollTop;
  scroll.scrollTop = Math.min(panelScrollMax(scroll), before + hidden);
  return scroll.scrollTop !== before;
}

/**
 * Settle a section the ring just landed on going Up, or came into the answer on from below: a tall one
 * shows its bottom edge (`revealTallFromItsEnd`); one that fits is lifted clear of the dock and, when
 * its top is under the header, brought under it if that is no more than a screen's scroll.
 */
export function settleUpLanding(section: HTMLElement, scroll: HTMLElement): void {
  const rect = section.getBoundingClientRect();
  if (rect.bottom - rect.top > bandHeightOf(scroll)) {
    revealTallFromItsEnd(section, scroll);
    return;
  }
  revealBelowDock(section, scroll);
  revealSectionInBand(section, scroll, bandHeightOf(scroll));
}

/** How far one press that only scrolls moves the panel (scrollTabContentsByStep's own step). */
const PRESS_STEP_PX = 80;

/**
 * How far the next scroll press should go when `section` (the one the ring is reading) ends, going Down, or
 * starts, going Up, less than a whole press away: just that far, so the press stops with the section's
 * bottom on the dock or its top on the header. 0 otherwise. On the Deck a 210 px section, 8 px taller than
 * the band, took a whole 80 px press to show its last 8 px, ending 72 px above the dock
 * (plan78-QA-FREE-PLAY-01-NOGAME-try2.json, answer A). Within 4 px is already read, as everywhere here.
 */
function stepToSectionEdge(section: HTMLElement | undefined, scroll: HTMLElement, dir: "down" | "up"): number {
  if (!section) return 0;
  const rect = section.getBoundingClientRect();
  const rest = dir === "down" ? rect.bottom - readableBottomOf(scroll) : scroll.getBoundingClientRect().top - rect.top;
  return rest > 4 && rest < PRESS_STEP_PX ? rest : 0;
}

/** Scroll QAM panel down; true only when scrollTop increases. `section`: see `stepToSectionEdge`. */
export function panelStepDown(bubbleEl: HTMLElement, section?: HTMLElement): boolean {
  const scroll = findScrollablePanel(bubbleEl);
  if (!scroll) return false;
  const before = scroll.scrollTop;
  const edge = stepToSectionEdge(section, scroll, "down");
  if (edge && panelScrollMax(scroll) > 0) {
    scroll.scrollTop = Math.min(panelScrollMax(scroll), before + edge);
    return scroll.scrollTop > before;
  }
  if (scrollTabContentsByStep(bubbleEl, "down")) {
    return scroll.scrollTop > before;
  }
  const max = panelScrollMax(scroll);
  if (max <= 0 && chunkHasContentBelowViewport(bubbleEl, scroll)) {
    return tryGeometryPanelScroll(bubbleEl, "down");
  }
  if (before >= max - 2) return false;
  const step = Math.max(80, Math.floor(scroll.clientHeight * 0.35));
  scroll.scrollTop = Math.min(max, before + step);
  return scroll.scrollTop > before;
}

/** Scroll QAM panel up; true only when scrollTop decreases. `section`: see `stepToSectionEdge`. */
export function panelStepUp(bubbleEl: HTMLElement, section?: HTMLElement): boolean {
  const scroll = findScrollablePanel(bubbleEl);
  if (!scroll) return false;
  const before = scroll.scrollTop;
  const max = panelScrollMax(scroll);
  if (scroll.scrollTop <= 0) {
    if (max <= 0 && chunkHasContentAboveViewport(bubbleEl, scroll)) {
      return tryGeometryPanelScroll(bubbleEl, "up");
    }
    return false;
  }
  const edge = stepToSectionEdge(section, scroll, "up");
  if (edge) {
    scroll.scrollTop = Math.max(0, before - edge);
    return scroll.scrollTop < before;
  }
  if (scrollTabContentsByStep(bubbleEl, "up")) {
    return scroll.scrollTop < before;
  }
  const step = Math.max(80, Math.floor(scroll.clientHeight * 0.35));
  scroll.scrollTop = Math.max(0, before - step);
  return scroll.scrollTop < before;
}
