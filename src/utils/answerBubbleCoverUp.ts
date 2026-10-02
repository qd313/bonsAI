/**
 * Title: Going Up onto a hidden spoiler cover
 *
 * Purpose: Walking Up through an answer, a section that holds a still-hidden spoiler cover offers the
 * cover as a stop, and when that section also has text below its last cover, its box first (Down went
 * cover, then box; Up goes box, then cover). This file holds the three Up steps that do that, and the
 * small scroll that brings a cover sitting above the screen back onto it first.
 *
 * Used for: answerBubbleNavigation.ts, whose Up press (`handleAnswerBubbleMoveUp`) and entry from
 * below (`focusLastAnswerChunk`) call these.
 *
 * Solves: The navigation file was past its size limit; this is a self-contained piece of it, moved out
 * unchanged with its explanations, to make room there for the Up walk over underlined game words.
 *
 * Does not: Hold any memory between presses, or choose between a cover and a section; the navigation
 * file decides when each step is tried.
 *
 * How it works: `stepUpIntoSection()` is tried when Up steps into the section above; it lands on the
 * box or the cover. `coverToLandOnGoingUp()` is tried with the ring already in a section; it names the
 * cover before the ring. `focusCoverGoingUp()` lands on a section's last cover, and
 * `showCoverFromAbove()` scrolls a cover above the screen down onto it, refusing more than a screen.
 */
import { readableBottomOf } from "./chatPanelScroll";
import {
  CUT_TOLERANCE_PX, elementIsWhollyInBandOf, elementIsWithinViewportOf, hasBoxStop, lastHiddenCoverIn, settleUpLanding,
} from "./answerBubbleBandGeometry";
import { findLastSpoilerFenceIn, focusSpoilerFence } from "./spoilerFenceRegistry";
import { focusAnswerStop } from "./answerStopRegistry";
import { uiGamepadFocusElement } from "./uiDocument";

/**
 * Going Up into `section`: land on a still-hidden spoiler cover inside it instead of on the section
 * (plan 74 lane 3). A section's own A does nothing, so Up used to leave the ring beside the cover
 * with no way to open it (docs/test-evidence/plan70-SPOILER-CREDITS-01.json); Down already parks on
 * a cover first. A plain focus: the cover is inside the answer's own container, the move Down's
 * cover step already makes on the device (spoilerFenceRegistry.ts). The next Down walks on past it
 * because the ring is on it, not because it was flagged.
 *
 * A cover still above the screen counts too (plan 74 lane 3, round two). Going Up, a section comes
 * into view from its bottom, so a cover at its top is the last part of it to appear: the Deck found
 * Up out of a tall second section landing on the first section around its cover, every time
 * (docs/test-evidence/plan74-P74-COVER-UP.json). `showCoverFromAbove` brings such a cover down onto
 * the screen first, when that is no more than a screen's scroll.
 */
function focusCoverGoingUp(section: HTMLElement, scroll: HTMLElement | null): boolean {
  if (!scroll) return false;
  const inView = findLastSpoilerFenceIn(section, (el) => elementIsWithinViewportOf(el, scroll));
  if (inView) return focusSpoilerFence(inView);
  const paneTop = scroll.getBoundingClientRect().top;
  const above = findLastSpoilerFenceIn(section, (el) => el.getBoundingClientRect().bottom <= paneTop);
  return Boolean(above) && showCoverFromAbove(section, above!, scroll) && focusSpoilerFence(above);
}

/**
 * Going Up into `section` from the one below: the stops it offers, mirroring what a walk Down does
 * there (plan 77 helper E; the maintainer's call of 2026-09-29, docs/test-evidence/
 * plan76-REPLY-STOPS-MIRROR-01-try2.json). Down goes cover, then the section's box (`boxAfterLastCover`),
 * so Up goes the box, then the cover:
 *
 * - a section with a box stop (`hasBoxStop`) -> the box, brought into the band from its top when that
 *   takes no more than a screen's scroll; the next Up (`coverToLandOnGoingUp`) then lands on the
 *   cover, scrolling it into view first if it still is not;
 * - a section that is only its cover, or ends with it -> the cover (`focusCoverGoingUp`).
 *
 * False when the section holds no hidden cover, so the caller lands on the box as for any section.
 */
export function stepUpIntoSection(section: HTMLElement, scroll: HTMLElement): boolean {
  if (!lastHiddenCoverIn(section)) return false;
  if (!hasBoxStop(section)) return focusCoverGoingUp(section, scroll);
  if (!focusAnswerStop(section)) return false;
  settleUpLanding(section, scroll);
  return true;
}

/**
 * Up, with the ring on a section's box or on something inside it: the hidden cover of that same
 * section the ring should land on next, or null. This is the other half of `stepUpIntoSection`: Down
 * went cover, then the box, then on; Up goes the box, then the cover, then on.
 *
 * - the last hidden cover that is wholly on screen and before the ring (the ring on the box itself
 *   has every cover of its section before it);
 * - else a cover before the ring that is cut off at the top or above the screen, scrolled into view
 *   when that is no more than a screen's scroll (`showCoverFromAbove`).
 *
 * A cover the ring is on is never before it, and every step here moves the ring to an EARLIER stop of
 * the section, so a walk Up cannot bounce between the box and a cover.
 */
export function coverToLandOnGoingUp(section: HTMLElement, scroll: HTMLElement): HTMLElement | null {
  const ring = uiGamepadFocusElement();
  if (!ring || !section.contains(ring)) return null;
  const before = (el: HTMLElement) =>
    el !== ring && (ring === section || Boolean(ring.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING));
  /*
   * Wholly on screen only. A cover cut off at the bottom is not offered: the Up scroll that follows
   * carries it further down, `keepRingOnScreen` moves the ring back to the box, and offering it again
   * would trade the ring between the two for ever (found in the harness, 2026-09-29). One that is
   * wholly on screen can only be left again by a scroll that carries it out for good.
   */
  const inBand = findLastSpoilerFenceIn(section, (el) => before(el) && elementIsWhollyInBandOf(el, scroll));
  if (inBand) return inBand;
  const paneTop = scroll.getBoundingClientRect().top;
  const cut = findLastSpoilerFenceIn(
    section,
    (el) => before(el) && el.getBoundingClientRect().top < paneTop - CUT_TOLERANCE_PX
  );
  return cut && showCoverFromAbove(section, cut, scroll) ? cut : null;
}

/** Room left above a cover (or its section) that Up scrolls onto the screen; revealBelowKeeping's. */
const COVER_TOP_PAD_PX = 8;

/**
 * Scroll the panel up so `cover`, above the screen, sits on it: the whole of `section` from its top
 * when the cover still fits that way (the Deck's first section, a cover then one paragraph), else the
 * cover's own top. True when the cover is on screen afterwards.
 *
 * Refuses a scroll of more than one screen's height, the same care Down's step takes: everything
 * between the cover and the old top of the screen would go past unread. Then the section takes the
 * ring as before, and its text scrolls by on the presses after.
 *
 * Plain scrollTop arithmetic rather than scrollIntoView, which obeys the Quick Access pane's 116 px
 * scroll-padding-top (scrollElementTopToPaneTop in chatPanelScroll.ts has the measurement).
 */
function showCoverFromAbove(section: HTMLElement, cover: HTMLElement, scroll: HTMLElement): boolean {
  const paneTop = scroll.getBoundingClientRect().top;
  const band = readableBottomOf(scroll) - paneTop;
  const sectionTop = section.getBoundingClientRect().top;
  const coverRect = cover.getBoundingClientRect();
  const fromSectionTop = coverRect.bottom - sectionTop + COVER_TOP_PAD_PX <= band;
  const lift = paneTop + COVER_TOP_PAD_PX - (fromSectionTop ? sectionTop : coverRect.top);
  if (lift <= 0 || lift > band) return false;
  scroll.scrollTop = Math.max(0, scroll.scrollTop - lift);
  return elementIsWithinViewportOf(cover, scroll);
}
