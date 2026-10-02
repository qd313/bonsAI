/**
 * Title: Going Up over underlined game words
 *
 * Purpose: Walking Down through an answer, a section is read as its box, then each underlined game word
 * in it, top to bottom, then the next section. Walking Up has to visit the same stops in the opposite
 * order (the maintainer's rule, D120 item 6): the next section, this section's words last to first, then
 * its box. Before this file, Up skipped every word: with the ring on a section, the word finder never
 * counts that section's own words as before the ring (the Deck, 2026-10-01,
 * docs/test-evidence/plan78-QA-FREE-PLAY-01-GAME-try3.json: three words, one landing, two scrolls).
 *
 * Used for: answerBubbleNavigation.ts, whose Up press (`handleAnswerBubbleMoveUp`) tries
 * `wordStepUp()` first and steps into the section above through `landGoingUpInto()`, and whose entry
 * from below (`focusLastAnswerChunk`) uses `landGoingUpInto()` too.
 *
 * Solves: Up's mirror of Down's memory (`walk` there). A walk Up through a tall section scrolls, and a
 * scroll that carries the word the ring is on off the screen moves the ring to its section; the words
 * before that word must still be offered. So the walk keeps `upWalk`: the section, and the last word
 * passed in it.
 *
 * Does not: Move the ring across containers (every move here is a plain focus between stops of one
 * answer, the same move the walk already makes), or touch covers (answerBubbleCoverUp.ts) or Down.
 *
 * How it works: `wordStepUp()` lands on the last word on screen of the ring's own section before the
 * ring (or before the last word passed, with the ring on the section), else, with the ring on the
 * section's first word and the section's top on screen, on the section's box. `landGoingUpInto()` places
 * a section entered from below as any Up landing, then lands on its last word on screen, else its box.
 * `forgetUpWalk()` clears the memory; the navigation file calls it on every entry and every Down press.
 * `settleBoxGoingUp()` places a box Up lands on clear of the dock after the focus, and again once Steam's
 * own glide is over.
 *
 * Gotcha: when Up comes into a tall section whose last word is more than a screen above what was showing,
 * the box takes the ring first and the words follow it (box, then words last to first), not the strict
 * reverse of Down; `boxLanded` keeps the box from being landed on a second time. A word up to a screen
 * away is scrolled onto the screen instead (`showLastWordFromAbove`), which covers the Deck's answers so far.
 * Up straight after a walk Down picks up Down's own memory (`downPassed`): the box a scroll handed the ring
 * back to is not where the walk Up starts counting from.
 */
import { readableBottomOf } from "./chatPanelScroll";
import {
  CUT_TOLERANCE_PX, bandHeightOf, elementIsWithinViewportOf, revealBelowDock, revealSectionInBand, settleUpLanding,
} from "./answerBubbleBandGeometry";
import {
  findNextDrgGlossaryTermChipInView, focusDrgGlossaryTermChip, isDrgGlossaryTermChip,
} from "./drgGlossaryTermRegistry";
import { focusAnswerStop } from "./answerStopRegistry";
import { uiGamepadFocusElement } from "./uiDocument";

/**
 * In `section`, the words before `from` are still ahead: `from` is the last word passed, or null (every
 * word of the section) when Up came in on the box with no word on screen yet. `boxLanded`: the box has
 * been a landing already, so Up from the first word does not land on it a second time.
 */
let upWalk: { section: HTMLElement; from: HTMLElement | null; boxLanded: boolean } | null = null;

export function forgetUpWalk(): void {
  upWalk = null;
}

/** The last word of `section` on screen and before `from` (or `from` itself, with `andFrom`), or null. */
function lastWordGoingUp(
  bubble: HTMLElement, section: HTMLElement, from: HTMLElement | null, scroll: HTMLElement, andFrom = false,
) {
  if (andFrom && from) {
    const upTo = (el: HTMLElement) => el === from || Boolean(from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
    return findNextDrgGlossaryTermChipInView(
      bubble, (el) => section.contains(el) && elementIsWithinViewportOf(el, scroll) && upTo(el), "up", null,
    );
  }
  return findNextDrgGlossaryTermChipInView(
    bubble, (el) => section.contains(el) && elementIsWithinViewportOf(el, scroll), "up", from,
  );
}

/**
 * Up with the ring in `section` (on it, or on a word in it), or in no section at all: land on a word or on
 * the section's box, as the header describes. True when the ring moved. With no section, any word on
 * screen before the ring, as before this file (the ring on the bubble itself, or outside the sections).
 */
export function wordStepUp(
  bubble: HTMLElement, section: HTMLElement | undefined, scroll: HTMLElement, downPassed: HTMLElement | null = null,
): boolean {
  const ring = uiGamepadFocusElement();
  if (!section) {
    upWalk = null;
    const chip = findNextDrgGlossaryTermChipInView(bubble, (el) => elementIsWithinViewportOf(el, scroll), "up");
    return Boolean(chip) && focusDrgGlossaryTermChip(chip);
  }
  if (upWalk && upWalk.section !== section) upWalk = null;
  const onWord = Boolean(ring && ring !== section && isDrgGlossaryTermChip(ring));
  /* The ring on a word: that word is the walk's place in its section, whoever put the ring there. */
  if (onWord) upWalk = { section, from: ring, boxLanded: upWalk?.boxLanded ?? false };
  /*
   * On the box right after a walk Down: when the ring came back to the box because a scroll carried the
   * word it was on off the screen (`downPassed`, Down's own memory), that word and the ones before it are
   * still ahead going Up: Down landed on them after the box. Without this the walk Up from there went
   * straight on to the section above (plan79-P79-UP-MIRRORS-DOWN-WORDS.json).
   */
  const afterDown = ring === section && !upWalk && downPassed && isDrgGlossaryTermChip(downPassed) ? downPassed : null;
  /* On the box with no memory, the box is the section's first stop: nothing of it is before the ring. */
  if (ring === section && !upWalk && !afterDown) return false;
  const from = afterDown ?? (ring === section ? upWalk!.from : ring);
  const word = lastWordGoingUp(bubble, section, from, scroll, Boolean(afterDown));
  if (word && focusDrgGlossaryTermChip(word)) {
    upWalk = { section, from: word, boxLanded: upWalk?.boxLanded ?? false };
    showWordWholly(word, scroll);
    return true;
  }
  /* On the section's first word: its box, the first stop Down made there, once its top is no more than a
     screen above (until then the press reads the section upward; the landing brings the top under the
     header), and not when Up already landed on it coming in. */
  const topNear = section.getBoundingClientRect().top >= scroll.getBoundingClientRect().top - bandHeightOf(scroll);
  const firstWord = !findNextDrgGlossaryTermChipInView(bubble, (el) => section.contains(el), "up", ring);
  if (!onWord || !firstWord || upWalk?.boxLanded || !topNear || !focusAnswerStop(section)) return false;
  upWalk = null;
  revealSectionInBand(section, scroll);
  return true;
}

/**
 * Up into `section` from below it (the section under it, or the row under the answer): placed as any Up
 * landing, then its last word on screen takes the ring if it has one, since Down left the section from its
 * last word; else its box. False when neither took the ring.
 */
export function landGoingUpInto(bubble: HTMLElement, section: HTMLElement, scroll: HTMLElement): boolean {
  const shownBefore = scroll.scrollTop;
  settleUpLanding(section, scroll);
  /* A tall section holding a word, its end only a sliver under the header: its end comes down to the dock,
     so its last word can show (settling only ever lifts an end from under the dock). */
  const rect = section.getBoundingClientRect();
  const lift = readableBottomOf(scroll) - rect.bottom;
  if (rect.bottom - rect.top > bandHeightOf(scroll) && lift > 4 && lift <= bandHeightOf(scroll) &&
      findNextDrgGlossaryTermChipInView(bubble, (el) => section.contains(el), "up", null)) {
    scroll.scrollTop = Math.max(0, scroll.scrollTop - lift);
  }
  const word = lastWordGoingUp(bubble, section, null, scroll) ?? showLastWordFromAbove(bubble, section, scroll, shownBefore);
  if (word && focusDrgGlossaryTermChip(word)) {
    upWalk = { section, from: word, boxLanded: false };
    showWordWholly(word, scroll);
    return true;
  }
  if (!focusAnswerStop(section)) return false;
  upWalk = { section, from: null, boxLanded: true };
  settleBoxGoingUp(section, scroll);
  return true;
}

/**
 * A section whose words all sit above the screen once its end is placed (a section a little taller than
 * the band with its words on its first lines, the Deck's Zhukov answer, plan79-P79-UP-MIRRORS-DOWN-WORDS.json):
 * scroll its last word to just under the header and return it, so Up lands on the words before the box as it
 * does when they are on screen, whatever the panel showed before. Only when the screen moves by no more than
 * a band from what the press started on (`shownBefore`), give or take less than a line, so no line goes by
 * unseen; else null, and the box takes the ring first (this file's Gotcha).
 */
function showLastWordFromAbove(bubble: HTMLElement, section: HTMLElement, scroll: HTMLElement, shownBefore: number) {
  const paneTop = scroll.getBoundingClientRect().top;
  const above = findNextDrgGlossaryTermChipInView(
    bubble, (el) => section.contains(el) && el.getBoundingClientRect().top < paneTop, "up", null,
  );
  if (!above) return null;
  const target = Math.max(0, scroll.scrollTop - (paneTop + WORD_TOP_PAD_PX - above.getBoundingClientRect().top));
  if (Math.abs(shownBefore - target) > bandHeightOf(scroll) + LESS_THAN_A_LINE_PX) return null;
  scroll.scrollTop = target;
  return elementIsWithinViewportOf(above, scroll) ? above : null;
}

/** A word Up lands on, cut off at the header or under the dock, is brought wholly into the band. */
function showWordWholly(word: HTMLElement, scroll: HTMLElement): void {
  const cut = scroll.getBoundingClientRect().top - word.getBoundingClientRect().top;
  if (cut > CUT_TOLERANCE_PX) scroll.scrollTop = Math.max(0, scroll.scrollTop - cut - WORD_TOP_PAD_PX);
  else revealBelowDock(word, scroll);
}

/** Less than one line of answer text (the Deck's lines are about 20 px): a gap this small hides no line. */
const LESS_THAN_A_LINE_PX = 16;

/** Room left above a word Up scrolls down onto the screen (the cover's own, answerBubbleCoverUp.ts). */
const WORD_TOP_PAD_PX = 8;

/** When Steam's own glide has finished after a landing (the dock lift's passes, useDockClearanceOnFocus.ts). */
const AFTER_GLIDE_MS = [150, 300, 900];

/**
 * Place a box the ring just landed on going Up clear of the dock and the question box: once now, after the
 * focus, and again once Steam's own glide is over, for as long as the ring stays on it. Steam glides after
 * the press, and the dock lift leaves answer sections to the walk, so nothing else puts a box back: on the
 * Deck (plan79-P79-UP-MIRRORS-DOWN-NEWEST-CLOSED.json) Up into an older answer from its Read aloud row left
 * its last section 0% visible behind the question box, and the section above it 67% behind the dock. Only a
 * box that fits the band: a taller one is read by scrolling and runs past the dock on purpose.
 */
export function settleBoxGoingUp(section: HTMLElement, scroll: HTMLElement): void {
  settleUpLanding(section, scroll);
  const fits = () => section.getBoundingClientRect().bottom - section.getBoundingClientRect().top <= bandHeightOf(scroll);
  if (!fits()) return;
  for (const ms of AFTER_GLIDE_MS) {
    setTimeout(() => {
      if (section.isConnected && uiGamepadFocusElement() === section && fits()) settleUpLanding(section, scroll);
    }, ms);
  }
}
