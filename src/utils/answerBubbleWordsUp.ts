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
 * Gotcha: when Up comes into a tall section on its box because no word of it was on screen yet, its words
 * follow the box (box first, then words last to first), not the strict reverse of Down; `boxLanded` keeps
 * the box from being landed on a second time. The tests' answers do not hit this.
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

/** The last word of `section` on screen and before `from`, or null. */
function lastWordGoingUp(bubble: HTMLElement, section: HTMLElement, from: HTMLElement | null, scroll: HTMLElement) {
  return findNextDrgGlossaryTermChipInView(
    bubble, (el) => section.contains(el) && elementIsWithinViewportOf(el, scroll), "up", from,
  );
}

/**
 * Up with the ring in `section` (on it, or on a word in it), or in no section at all: land on a word or on
 * the section's box, as the header describes. True when the ring moved. With no section, any word on
 * screen before the ring, as before this file (the ring on the bubble itself, or outside the sections).
 */
export function wordStepUp(bubble: HTMLElement, section: HTMLElement | undefined, scroll: HTMLElement): boolean {
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
  /* On the box with no memory, the box is the section's first stop: nothing of it is before the ring. */
  if (ring === section && !upWalk) return false;
  const from = ring === section ? upWalk!.from : ring;
  const word = lastWordGoingUp(bubble, section, from, scroll);
  if (word && focusDrgGlossaryTermChip(word)) {
    upWalk = { section, from: word, boxLanded: upWalk?.boxLanded ?? false };
    return true;
  }
  /* On the section's first word: its box, the first stop Down made there, once its top is on screen
     (until then the press reads the section upward), and not when Up already landed on it coming in. */
  const topShows = section.getBoundingClientRect().top >= scroll.getBoundingClientRect().top - CUT_TOLERANCE_PX;
  if (!onWord || upWalk?.boxLanded || !topShows || !focusAnswerStop(section)) return false;
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
  settleUpLanding(section, scroll);
  /* A tall section holding a word, its end only a sliver under the header: its end comes down to the dock,
     so its last word can show (settling only ever lifts an end from under the dock). */
  const rect = section.getBoundingClientRect();
  const lift = readableBottomOf(scroll) - rect.bottom;
  if (rect.bottom - rect.top > bandHeightOf(scroll) && lift > 4 && lift <= bandHeightOf(scroll) &&
      findNextDrgGlossaryTermChipInView(bubble, (el) => section.contains(el), "up", null)) {
    scroll.scrollTop = Math.max(0, scroll.scrollTop - lift);
  }
  const word = lastWordGoingUp(bubble, section, null, scroll);
  if (word && focusDrgGlossaryTermChip(word)) {
    upWalk = { section, from: word, boxLanded: false };
    revealBelowDock(word, scroll);
    return true;
  }
  if (!focusAnswerStop(section)) return false;
  upWalk = { section, from: null, boxLanded: true };
  settleBoxGoingUp(section, scroll);
  return true;
}

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
