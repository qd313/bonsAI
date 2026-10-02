/**
 * Title: Answer bubble navigation
 *
 * Purpose: Decides what Up and Down do while the ring is sitting inside one
 * AI answer. An answer is cut into sections — stops the D-pad can walk down
 * one at a time (see the reply-bubble file for why) — and this file works
 * out whether a press should move to the next section, scroll the panel to
 * bring an off-screen section into view, stop on a hidden spoiler or a
 * glossary-term chip that happens to be in the way, or give up and let Steam
 * move the ring on to whatever sits outside the bubble entirely.
 *
 *     Pressing Down, in order:
 *       1. a hidden spoiler cover on screen and ahead of the ring  -> land on the cover
 *       2. a glossary-term chip on screen, ahead of the ring and in the ring's own section -> land on
 *          the chip (both are lifted clear of the dock if it covers them); a word in the next section
 *          waits for that section's box (step 4), as its first stop
 *       3. the ring is on the LAST hidden cover of its section and text runs on below it
 *          -> land on the section's box (`boxAfterLastCover`), once per walk
 *       4. the next section, but only if it is already on screen (a section that is only its
 *          cover lands on the cover instead: the box stands in for it). When the ring's section
 *          is already fully read (its bottom is inside the band) and the next one starts below the
 *          dock, the panel is first set so the next one's top sits under the header
 *          (`hopToSectionBelow`), so the press lands instead of only scrolling. A section still
 *          running past the dock keeps its scroll-only presses: that is reading it. A hidden cover
 *          with only its own margin after it counts as its section there (`readPartOf`).
 *       5. otherwise, scroll the panel and try again on the next press; if that scroll carries
 *          the stop the ring is on off the screen (a cover, an opened cover's "tap to hide"
 *          line, an underlined word), the ring moves to the section that holds it, and when that
 *          stop sat in the section's first screenful the panel is set so the section's top sits
 *          just under the tab header (`revealSectionInBand`): a landing is never left half hidden
 *          (Deck, 2026-09-29: the box sat 67% visible, its cover under the header)
 *
 *     Pressing Up is the mirror, and lands on the same stops in reverse:
 *       1. an underlined word of the ring's own section, on screen and before the ring -> land on it;
 *          from the section's first word, its box (`wordStepUp`, answerBubbleWordsUp.ts)
 *       2. a hidden cover in the ring's own section, wholly on screen and before the ring
 *          (`coverToLandOnGoingUp`); one cut off at the top is scrolled into view first when
 *          that is no more than a screen's scroll
 *       3. the section above (its last word on screen, if it has one: `landGoingUpInto`) -- or, when
 *          that section holds a hidden cover: the section's box if it
 *          has a box stop, brought under the tab header (`stepUpIntoSection`; the cover follows on
 *          the next press), else the cover (`focusCoverGoingUp`); the walk enters an answer from
 *          below the same way, into its last section
 *          When the ring's section has been read from its top and the one above is wholly above the
 *          header, the panel is first set so that one's bottom sits at the dock (`hopToSectionAbove`).
 *          A section taller than the screen is entered from its end: its bottom edge is brought
 *          just above the dock (`revealTallFromItsEnd`), also when the ring comes into the answer
 *          from below.
 *       4. otherwise, scroll the panel up, with the same ring-follows-the-section step as Down
 *
 *     The stops, in one line: every section, and inside a section every hidden cover and every
 *     underlined word, once each. A section that holds a hidden cover and has text below the last
 *     one (`hasBoxStop`, worked out from the page's own boxes, not from what is on screen) has its
 *     box as a stop too: Down goes cover, then the box, then on; Up goes the box, then the cover,
 *     then on. So a walk Down and a walk Up visit the same stops (the maintainer's call,
 *     2026-09-29; before it Down stopped on that box only when a scroll happened to cut the cover
 *     off, and Up never did). A section that is only its cover, or ends with it, has no box stop in
 *     either direction. A on a section that holds a hidden cover on screen opens it
 *     (`openHiddenCoverIn`), so a cover can be opened from wherever the ring lands. Which cover is
 *     "ahead" is worked out from where the ring is on every press, never remembered across walks:
 *     an earlier flag set on landing made a walk Down skip every cover a walk Up had parked on
 *     (Deck, 2026-09-28).
 *
 *     The memory a walk Down does keep is inside a section: the last cover or word the ring was on
 *     there (`walkAnchor`), which is what stops a cover and its section trading the ring for ever
 *     (Deck, 2026-09-29): the stop and everything before it are never offered again until the ring
 *     leaves the section, whatever Steam then does to the panel. And the one section whose box it
 *     has landed on (`boxLandedIn`), so a cover deep inside a tall section does not send the ring
 *     back to a box it entered on. Going Up, every step among covers moves the ring to an EARLIER
 *     stop of its section (the box, then its covers last to first), so covers need no memory; words
 *     do, the last one passed (`upWalk` in answerBubbleWordsUp.ts), because Up reads a section's
 *     words before its box and a scroll can move the ring onto the box in between.
 *
 *     Known limits, on purpose: a cover deep inside a section taller than the screen is entered on
 *     the box first going Down and may not be offered going Up (a cover cut off at the bottom of
 *     the screen is never offered, or the ring would trade with the box for ever); and words are
 *     not given a box stop.
 *
 * Used for: the answer bubble's own Up/Down handlers, and the wider chat
 * screen's movement between turns.
 *
 * Solves: One place that works out section movement and panel scrolling
 * together, since an answer taller than the screen needs both — moving to
 * the next section is not enough on its own if that section is still
 * off-screen afterwards.
 *
 * Does not: Move between the buttons below a reply — Copy, Retry, the
 * thumbs row — see buildReplyActionsElement and replyStopRegistry for that.
 *
 * How it works: One press goes through `handleAnswerBubbleMoveDown()` or
 * `handleAnswerBubbleMoveUp()`, which do the same four things in this order.
 *   1. Find the answer bubble and the panel that scrolls it (`resolveAnswerBubbleEl()`). With
 *      no bubble or no scrolling panel, return false and leave the press to Steam.
 *   2. Try each stop in the order of the drawing above. A stop that qualifies takes the ring
 *      and the panel is nudged so the stop can be read; the press is then used up.
 *   3. If no stop qualifies and the answer's text (not the bubble's 9 px frame: `answerTextEdge()`)
 *      still runs past the edge, scroll the panel one step
 *      (`panelStepDown()` / `panelStepUp()`), then let `keepRingOnScreen()` move the ring to
 *      its section when the scroll pushed a small stop off the screen.
 *   4. If the bubble has nothing further in that direction, return false so Steam moves the
 *      ring to whatever lies outside the answer.
 * The two small memories a walk Down keeps (`walkAnchor()` and the box it last landed on) are
 * module variables and are cleared by `forgetWalk()` whenever the ring enters the answer or
 * a walk Up starts; the walk Up's word memory is cleared on entry and by every Down press.
 *
 * Gotchas:
 * - Several functions here go out of their way not to move focus with a
 *   plain call. A plain focus() only moves the browser's own idea of what is
 *   focused; Steam's own ring can be left behind, disagreeing with it — the
 *   exact trap this repo has lost fixes to before. That is why
 *   focusFirstAnswerChunk(), focusLastAnswerChunk(), and focusPanelEl() ask
 *   for Steam's own focus transfer first, and check whether the ring
 *   actually followed, rather than assuming a successful DOM call means it
 *   did.
 * - The order in the drawing above is deliberate, and only a section that is
 *   already visible is allowed to take focus next. See the comments inside
 *   handleAnswerBubbleMoveDown() for the on-device bugs each of those rules
 *   was added to fix.
 */
import {
  chunkHasContentAboveViewport,
  chunkHasContentBelowViewport,
  findScrollablePanel,
  panelScrollMax,
  readableBottomOf,
  tryGeometryPanelScroll,
} from "./chatPanelScroll";
import {
  getRegisteredAnswerBubble,
  registerAnswerBubbleEl,
  resolveFocusedAnswerBubble,
  takeAnswerBubbleNavFocus,
} from "./answerBubbleElRegistry";
import { elementHasFocus, getUiDocument, uiGamepadFocusElement } from "./uiDocument";
import { refocusPanelWindowIfLost } from "./navFocusRegistry";

import {
  CUT_TOLERANCE_PX, SECTION_TOP_PAD_PX, bandHeightOf, elementIsWithinViewportOf,
  hasBoxStop, hopToSectionAbove, hopToSectionBelow, isCoverAtHead, isCoverOnly, lastHiddenCoverIn, panelStepDown,
  panelStepUp, revealBelowDock, revealSectionInBand,
} from "./answerBubbleBandGeometry";

/** Still reached through this file by the reply-buttons code, the tests and the test walk. */
export { elementIsWithinViewportOf, revealBelowDock };

import {
  findFirstSpoilerFenceIn,
  findLastSpoilerFenceIn,
  findNextSpoilerFenceInView,
  focusSpoilerFence,
  revealSpoilerFence,
} from "./spoilerFenceRegistry";

import {
  findNextDrgGlossaryTermChipInView,
  focusDrgGlossaryTermChip,
} from "./drgGlossaryTermRegistry";

import {
  focusAnswerStop,
  focusedAnswerStopIndex,
  orderedAnswerStops,
} from "./answerStopRegistry";

import { coverToLandOnGoingUp, stepUpIntoSection } from "./answerBubbleCoverUp";
import { forgetUpWalk, landGoingUpInto, wordStepUp } from "./answerBubbleWordsUp";

/** The section a walk Down is in and the last small stop in it the ring has been on; see `walkAnchor`. */
let walk: { section: HTMLElement; passed: HTMLElement | null } | null = null;

/**
 * The section whose box a walk Down has already landed on, so `boxAfterLastCover` does not offer it
 * a second time: a tall section whose cover is deep inside it is entered on its box first, and the
 * cover then would send the ring back to that box. Only Down reads it. Every walk Up, and every entry
 * into the answer, clears it (`forgetWalk`), so walking Down again after a walk Up offers the box
 * again; a stale value can only hide a box stop, never cause a loop.
 */
let boxLandedIn: HTMLElement | null = null;

/** Down's memory only; a landing going Up keeps the Up walk's own (answerBubbleWordsUp.ts). */
function forgetDownWalk(): void {
  walk = null;
  boxLandedIn = null;
}

function forgetWalk(): void {
  forgetDownWalk();
  forgetUpWalk();
}

/** The section of this answer the ring is in (on it, or on a cover or word inside it), if any. */
function ringSection(bubble: HTMLElement, answerKey: string | undefined): HTMLElement | undefined {
  const stops = answerKey ? orderedAnswerStops(answerKey, bubble) : [];
  return stops[focusedAnswerStopIndex(stops)];
}

/**
 * The edge of the answer's text a press must still read past: its last section going Down, its first going
 * Up, not the bubble around them. The bubble's own frame (8 px of padding and a 1 px border) runs 9 px past
 * both, so asked of the bubble, a last section whose bottom sat on the dock still had empty frame under it:
 * the next Down only scrolled the panel 80 px, ring left in place, and the press after it left the answer
 * (Deck: plan77-P77-WALK-COVERS-MIRROR-R2.json, plan77-P77-FINAL-SMOKE.json). The registered stops, not a
 * page search, as everywhere else in the walk. With the ring on a cover at that edge that has only its
 * margin past it, the cover (`readPartOf`).
 */
function answerTextEdge(bubble: HTMLElement, answerKey: string | undefined, dir: "down" | "up"): HTMLElement {
  const stops = answerKey ? orderedAnswerStops(answerKey, bubble) : [];
  const edge = dir === "down" ? stops[stops.length - 1] : stops[0];
  return edge ? readPartOf(edge, dir) : bubble;
}

/** A cover's own margin inside its section: less than this between them is no text (`hasBoxStop`'s rule). */
const COVER_MARGIN_MAX_PX = 24;

/**
 * The part of `section` a press checks has been read before it moves past it (a hop to the next section,
 * `hopToSectionBelow` / `hopToSectionAbove`, or leaving the answer, `answerTextEdge`): the section, or, with
 * the ring on a hidden cover that has nothing after it (Down) or before it (Up) but its own margin, that
 * cover. The margin is 8 px on the Deck (a 55 px cover in a 71 px section), and a landing lifts the cover
 * clear of the dock, not its margin, so asking about the section left 8 px of empty margin "unread" under
 * the dock and the next press only scrolled the panel 80 px, ring left on the cover.
 */
function readPartOf(section: HTMLElement, dir: "down" | "up"): HTMLElement {
  const ring = uiGamepadFocusElement();
  if (!ring || ring === section || !section.contains(ring)) return section;
  if (findLastSpoilerFenceIn(section, (el) => el === ring) !== ring) return section;
  const r = ring.getBoundingClientRect();
  const s = section.getBoundingClientRect();
  return (dir === "down" ? s.bottom - r.bottom : r.top - s.top) <= COVER_MARGIN_MAX_PX ? ring : section;
}

/** Walk turn slots. Must query the UI document, not SharedJSContext's shell — see uiDocument.ts. */
function findAnswerBubbleByKey(answerKey: string): HTMLElement | null {
  const registered = getRegisteredAnswerBubble(answerKey);
  if (registered) return registered;

  const focused = resolveFocusedAnswerBubble();
  if (focused) {
    const key = focused.querySelector(`[data-bonsai-answer-key="${answerKey}"]`);
    if (key) return focused;
  }

  for (const slot of getUiDocument().querySelectorAll(".bonsai-chat-turn-slot")) {
    const isLive = answerKey === "live";
    const hasLiveHeader = Boolean(slot.querySelector(".bonsai-chat-turn-row-header--live"));
    const hasTurnMarker = Boolean(slot.querySelector(`[data-bonsai-turn-id="${answerKey}"]`));
    if (isLive ? hasLiveHeader : hasTurnMarker) {
      const bubble = slot.querySelector(".bonsai-chat-ai-bubble") as HTMLElement | null;
      if (bubble) return bubble;
    }
  }
  return null;
}

/**
 * Focus the `.Panel.Focusable` Decky navigates by, and report whether focus actually landed.
 *
 * `elementHasFocus` asks the element's own document; the previous `contains(document.activeElement)`
 * asked SharedJSContext's shell and so returned false on every successful move (uiDocument.ts).
 * An existing `tabindex` is left alone — overwriting Decky's `0` with `-1` drops the node out of
 * Steam's navigation graph for subsequent presses.
 */
function focusPanelEl(el: HTMLElement): boolean {
  const panel = (
    el.matches(".Panel.Focusable") ? el : el.closest(".Panel.Focusable")
  ) as HTMLElement | null;
  const target = panel ?? el;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (elementHasFocus(target)) return true;
  el.focus({ preventScroll: true });
  return elementHasFocus(el);
}

/**
 * Hand the ring into this bubble from outside it (the turn header's Down, or the bubble's own Up
 * when parked on a spoiler fence going back to the top) and land on its first section, not the
 * bare bubble.
 *
 * `takeAnswerBubbleNavFocus` first: the bubble is a different navigation container from the header
 * (confirmed by its own `navRef` — see answerBubbleElRegistry.ts), so a plain `focus()` across that
 * boundary moves `activeElement` while Steam's ring stays on the header, the same failure mode
 * `upIntoGlossaryChip` in buildReplyActionsElement.tsx already works around for the reply row's own
 * hop into this bubble. Best-effort by design — `focusPanelEl` right after is what actually lands
 * and verifies focus, on whichever element is correct once inside.
 *
 * Before this fix the fallback focused the bubble itself (`el`), which is a stop of its own: Down
 * from the header parked there, and only a second Down descended into `.bonsai-answer-stop` — one
 * wasted press per reply, filed 2026-09-02 ("Down from the chat slot lands on the whole reply
 * before its first section"). The masked-spoiler-first check above this is unchanged: an unrevealed
 * fence anywhere in the bubble still wins over the first section, exactly as before.
 */
export function focusFirstAnswerChunk(answerKey: string): boolean {
  forgetWalk();
  const el =
    resolveFocusedAnswerBubble() ??
    getRegisteredAnswerBubble(answerKey) ??
    findAnswerBubbleByKey(answerKey);
  if (!el) return false;
  registerAnswerBubbleEl(answerKey, el);
  takeAnswerBubbleNavFocus(answerKey);
  // Registered handles, not a page query — same registry the section walk itself reads.
  const stops = orderedAnswerStops(answerKey, el);
  /*
   * A masked spoiler wins over the first section only when it sits inside that first section (or
   * there is no section list yet to compare it against). Grabbing ANY spoiler in the bubble
   * regardless of position — the previous rule — skipped every paragraph ahead of a spoiler that
   * rendered as a LATER section: measured on device 2026-09-05
   * (docs/test-evidence/round35-spoiler-block-down-and-up.json), Down from the question went
   * straight to a hidden spoiler block and never stopped on either paragraph before it. A spoiler
   * further down is still reached in its own turn, by the ordinary per-press walk in
   * handleAnswerBubbleMoveDown below. And only when it is at the head of that section (`isCoverAtHead`):
   * a cover 383 px into a 446 px section took the ring straight from the line above, its opening never on
   * screen (docs/test-evidence/plan78-P78-TALL-SECTION-LOOP-BEFORE.json). The section is entered instead
   * and read down to it.
   */
  const scroll = findScrollablePanel(el);
  const spoiler = el.querySelector<HTMLElement>(".bonsai-spoiler-reveal-target");
  const first = stops[0];
  if (
    spoiler &&
    (!first || (first.contains(spoiler) && (!scroll || isCoverAtHead(first, spoiler, scroll)))) &&
    focusPanelEl(spoiler)
  ) {
    return true;
  }
  if (first && focusAnswerStop(first)) {
    boxLandedIn = first; // as Down's own landing on a section: a cover deep in it does not send the ring back here
    /*
     * Placed the way Down's own landing places a section: its bottom just above the dock (one taller
     * than the band keeps its top edge). Left where it was, mostly behind the dock, the section was
     * placed by the plugin's lift off the dock, whose scroll ends 86 px above the dock: on the Deck a
     * 180 px first section landed at y 24 to 204, its top 64 px above the panel
     * (docs/test-evidence/plan78-P78-DOWN-SHORT-SECTION.json). Coming in from below already does this.
     */
    if (scroll) {
      revealBelowDock(first, scroll);
      revealSectionInBand(first, scroll);
    }
    return true;
  }
  return focusPanelEl(el);
}

/**
 * Up with the ring on a spoiler cover (plan 74 lane 3): step to the section above the cover's own,
 * or that section's own cover, exactly as Up from any section does; from the first section, yield
 * the way the first section does, so the ring leaves the answer upward. This used to send the ring
 * back to the top of the answer, which skipped every section between and, from a cover in the first
 * section, landed on that same cover again. A cover outside every section, or one whose step up
 * cannot run (the section above off screen with nothing left to scroll), keeps that old way back.
 */
export function handleUpFromSpoilerCover(
  bubbleEl: HTMLElement | null,
  chunkTotal: number,
  answerKey: string
): boolean {
  const bubble = resolveAnswerBubbleEl(answerKey, bubbleEl);
  if (!bubble) return false;
  const at = focusedAnswerStopIndex(orderedAnswerStops(answerKey, bubble));
  if (at < 0) return focusFirstAnswerChunk(answerKey);
  if (handleAnswerBubbleMoveUp(bubble, { current: 0 }, chunkTotal, answerKey)) return true;
  return at > 0 ? focusFirstAnswerChunk(answerKey) : false;
}

/**
 * The reverse of `focusFirstAnswerChunk`, for entering from below: the reply-actions row's Up, once
 * refinement chips and — for the utility row (Retry / Show details) — the opposite thumbs column
 * have declined, and a glossary chip in view has also declined (buildReplyActionsElement.tsx). The
 * thumbs row (Helpful / Not really) never claimed the press first at all — its own `onMoveUp` was a
 * bare `() => false` — so on a normal reply, which always has a thumbs row, this fallback used to be
 * unreachable: Up yielded straight to Steam's own geometry move, which landed on the bare bubble
 * rather than its last section. Measured on device 2026-09-04 (build f9a4c17, CHAT-REPLY-ENTRY-01):
 * ring on Helpful, Up landed on `.bonsai-chat-ai-bubble`, never the last `.bonsai-answer-stop`. Both
 * the thumbs row's and the utility row's chains now end here. Same TakeFocus-then-focus shape; see
 * `focusFirstAnswerChunk`'s comment for why the transfer is needed.
 */
export function focusLastAnswerChunk(answerKey: string): boolean {
  forgetWalk();
  const el =
    resolveFocusedAnswerBubble() ??
    getRegisteredAnswerBubble(answerKey) ??
    findAnswerBubbleByKey(answerKey);
  if (!el) return false;
  registerAnswerBubbleEl(answerKey, el);
  takeAnswerBubbleNavFocus(answerKey);
  // Registered handles, not a page query — same registry the section walk itself reads.
  const stops = orderedAnswerStops(answerKey, el);
  const last = stops[stops.length - 1];
  const scroll = findScrollablePanel(el);
  /* A hidden cover in the last section: as Up into any section (`stepUpIntoSection`), its box first when
     text runs on under the cover, the stop Down made after the cover. Going straight to the cover skipped
     that box (plan 79, plan79-QA-FREE-PLAY-01-NOGAME-b3a.json: Up from choice A landed on cover 2). */
  if (last && scroll && stepUpIntoSection(last, scroll)) return true;
  /* Coming into the answer from below — Up out of the Show details line — lands here, and it is
     the one entry point that skipped the dock check (measured 2026-09-06). The section's last word
     comes first when it has one on screen: a walk Down left the answer from it. */
  if (last && scroll && landGoingUpInto(el, last, scroll)) return true;
  if (last && focusAnswerStop(last)) return true;
  return focusPanelEl(el);
}

/**
 * Put the ring back on a specific section, by its position rather than the element itself — used
 * when a turn's whole bubble subtree has just been replaced by a new one (the live answer becoming
 * an archived turn; see the comment on this in MainTabChatTranscript.tsx). The old stop is gone, so
 * there is nothing to hand focus from; this is the same "enter this bubble's own section" shape as
 * `focusFirstAnswerChunk`, only landing on `stops[index]` instead of `stops[0]`.
 *
 * Clamped to the last stop: a finished answer can split into fewer sections than the streaming
 * version did (different chunking function — see buildAnswerBubbleElement.tsx), so the remembered
 * index can point past the end of the new list.
 *
 * Looks the bubble up by its key only, unlike `focusFirstAnswerChunk`: the element that held the
 * ring was just destroyed, so "the bubble around the ring" can only name the old, detached one.
 */
export function focusAnswerChunkAtIndex(answerKey: string, index: number): boolean {
  forgetWalk();
  if (index < 0) return false;
  const el = findAnswerBubbleByKey(answerKey);
  if (!el) return false;
  registerAnswerBubbleEl(answerKey, el);
  takeAnswerBubbleNavFocus(answerKey);
  const stops = orderedAnswerStops(answerKey, el);
  if (!stops.length) return focusPanelEl(el);
  const target = stops[Math.min(index, stops.length - 1)]!;
  if (focusAnswerStop(target)) {
    const scroll = findScrollablePanel(el);
    if (scroll) revealBelowDock(target, scroll);
    return true;
  }
  return focusPanelEl(el);
}

export function resolveAnswerBubbleEl(
  answerKey?: string,
  hint?: HTMLElement | null
): HTMLElement | null {
  if (hint) return hint;
  const fromFocused = resolveFocusedAnswerBubble();
  if (fromFocused) return fromFocused;
  if (answerKey) {
    const registered = getRegisteredAnswerBubble(answerKey);
    if (registered) return registered;
    return findAnswerBubbleByKey(answerKey);
  }
  return null;
}

/*
 * Down and Up press on: keep the ring on something that is still on the screen.
 *
 * A cover, a revealed cover's "tap to hide" line and an underlined game word are stops the ring can
 * sit on INSIDE a section, and they are small. When a press has nothing to step to and scrolls the
 * panel instead, the ring stays where it is while its stop slides away under it. The Deck measured it
 * both ways (docs/test-evidence/plan76-P76-M-GLOSSARY-STICK.json, plan76-P76-M-COVER-SCROLL.json): on
 * a word five presses in a row scrolled it 300 px above the screen with the ring still on it, and a
 * cover was left with a third of it cut off at the top.
 *
 * So after the scroll, if the inline stop the ring is on is cut off at the edge the scroll pushed it
 * toward (its top above the pane going Down, its bottom below the readable band going Up), the ring
 * moves to the section that holds it. That section is still on screen, the scroll has already
 * happened, and reading a tall section by scrolling goes on exactly as before. Measured after the
 * scroll rather than predicted, so the answer is right whatever step the panel actually took.
 *
 * `focusAnswerStop` is a plain focus() between two Focusables of the same answer: the same call the
 * walk already makes from a cover or a word to the next section, and Steam invokes the press handler
 * that got us here (a section's onMoveDown/onMoveUp, reached from the inline stop because it has none
 * of its own). It moves nothing across containers.
 *
 * The walk remembers the last small stop the ring was on in a section (`walkAnchor`), so that when
 * the ring is moved up to the section the stop is not offered to it again. See there.
 */

/**
 * Where a walk Down is, for choosing the next cover or word: the ring itself, except when the ring is
 * on a section that holds small stops it has already been on. Then it is the LAST of them, so the
 * section around a cover the ring has been on (or was moved off by a scroll) does not count that
 * cover, or any stop before it, as still ahead.
 *
 * Without this the first version looped on the Deck (docs/test-evidence/plan76-P76-WALK-COVERS.json):
 * the ring went from cover 1 to its section, Steam then glided the panel so the cover was fully on
 * screen again, and a rule that only remembered the cover while it was cut off forgot it; the cover,
 * which sits inside its section, counted as ahead of the section, so Down landed on it again, the
 * next scroll cut it off, the ring moved to the section, and so on for ever.
 *
 * So the memory belongs to the section, not to any geometry: it is kept for as long as the ring stays
 * in that section, and dropped the moment a press finds the ring in another one, or the ring lands
 * on something new (`walk = null`). Nothing here moves the ring.
 */
function walkAnchor(bubble: HTMLElement, answerKey: string | undefined): HTMLElement | null {
  const ring = uiGamepadFocusElement();
  const section = ringSection(bubble, answerKey);
  if (!ring || !section) {
    walk = null;
    return ring;
  }
  if (!walk || walk.section !== section) walk = { section, passed: null };
  const passed = walk.passed;
  if (ring !== section && (!passed || passed.compareDocumentPosition(ring) & Node.DOCUMENT_POSITION_FOLLOWING)) {
    walk.passed = ring;
  }
  return ring === section && walk.passed ? walk.passed : ring;
}

/**
 * Down, with the ring on a hidden cover: the section whose box is the next stop, or null. That is the
 * case when the cover is the last one in its section, text runs on below it (`hasBoxStop`), and the
 * walk has not already been on that box (`boxLandedIn`). Never for a word, a revealed cover's hide
 * line or the box itself.
 */
function boxAfterLastCover(bubble: HTMLElement, answerKey: string): HTMLElement | null {
  const ring = uiGamepadFocusElement();
  if (!ring) return null;
  const section = ringSection(bubble, answerKey);
  if (!section || section === ring || !section.contains(ring) || boxLandedIn === section) return null;
  if (findLastSpoilerFenceIn(section, (el) => el === ring) !== ring) return null;
  if (lastHiddenCoverIn(section) !== ring || !hasBoxStop(section)) return null;
  return section;
}

function keepRingOnScreen(
  bubble: HTMLElement,
  answerKey: string | undefined,
  scroll: HTMLElement,
  direction: "down" | "up"
): void {
  if (!answerKey) return;
  const ring = uiGamepadFocusElement();
  if (!ring || !bubble.contains(ring)) return;
  const section = ringSection(bubble, answerKey);
  /* On the section itself (or on nothing inside one): reading it by scrolling is the design. */
  if (!section || section === ring) return;
  const rect = ring.getBoundingClientRect();
  const cut =
    direction === "down"
      ? rect.top < scroll.getBoundingClientRect().top - CUT_TOLERANCE_PX
      : rect.bottom > readableBottomOf(scroll) + CUT_TOLERANCE_PX;
  if (cut && focusAnswerStop(section) && direction === "down") {
    boxLandedIn = section;
    /*
     * The ring is now on a box whose top, where the cover or word sits, the scroll has just carried
     * under the tab header (the Deck, docs/test-evidence/plan76-P76-WALK-COVERS-try2.json: 67% of the
     * box showing). Bring the box's top back into the band, when the stop the ring left sits in the
     * first screenful of the box (a cover at the head of a section). That un-cuts the small stop, which
     * is fine: `walkAnchor` remembers it, so it is not offered again. Steam's own glide, if it comes,
     * finds the box already on screen and has nothing to do. A word deep in a long section is left
     * alone: the box's top is a long way up and reading it by scrolling is the design.
     */
    const sectionTop = section.getBoundingClientRect().top;
    if (rect.bottom - sectionTop + SECTION_TOP_PAD_PX <= bandHeightOf(scroll)) {
      revealSectionInBand(section, scroll);
    }
  }
}

/**
 * A on a section that holds a cover the ring never landed on: open the first hidden cover inside it
 * that is on screen, the way A on the cover itself does (plan 76 lane 3). A section's own A used to
 * do nothing there. Walking Down onto a cover-only section landed on the section, not the cover
 * (docs/test-evidence/plan74-REPLY-STOPS-MIRROR-01-r2.json), and A on it left the cover hidden; the
 * walk now lands on the cover itself, and this keeps the section a fair place to press A from too.
 * Calls the cover's own reveal, which also hands the ring to its "tap to hide" line, exactly as A on
 * the cover does.
 */
export function openHiddenCoverIn(section: HTMLElement): boolean {
  const scroll = findScrollablePanel(section);
  if (!scroll) return false;
  const cover = findFirstSpoilerFenceIn(section, (el) => elementIsWithinViewportOf(el, scroll));
  return cover ? revealSpoilerFence(cover) : false;
}

/*
 * In: the answer bubble element (or null, if the caller has to ask this file
 * to find it), how many sections the answer has, and the answer's own key.
 * Out: true when this press was handled and should stop here, false to let
 * Steam fall through to whatever move it would have made on its own.
 *
 * The order this checks things in matters and is deliberate: first, whether a
 * spoiler that is still hidden is sitting on screen — press Down again to
 * scroll past it, or A to reveal it. Then the same idea for a glossary-term
 * chip. Then the next section, but only if it is already visible; jumping to
 * one further down would skip the reader past text they have not scrolled to
 * yet. Only after all of that does it scroll the panel, and even then, only
 * while this particular bubble still has more content below.
 *
 * What can go wrong: a spoiler or glossary chip below the fold is correctly
 * skipped here — it becomes reachable once scrolling brings it into view on a
 * later press. Two real bugs already found through this exact path are noted
 * inline below: a masked spoiler that a touchless Deck could never reach at
 * all, and a whole branch of this function that ran against the wrong
 * document and did nothing, silently, until that was found and fixed.
 */
export function handleAnswerBubbleMoveDown(
  bubbleEl: HTMLElement | null,
  focusedChunkRef: { current: number },
  chunkTotal: number,
  answerKey?: string
): boolean {
  const bubble = resolveAnswerBubbleEl(answerKey, bubbleEl);
  if (!bubble || uiGamepadFocusElement() !== bubble) {
    return moveDownInAnswer(bubbleEl, focusedChunkRef, chunkTotal, answerKey);
  }
  /*
   * Steam's ring is on the whole bubble, not on one of its sections (the ★★★ trap of 2026-10-02: one
   * tall ring the width of the answer, Down dead until Steam restarted). The step below hops into a
   * section with a plain focus(), and while the panel's page is without the browser's focus (Quick
   * Access back from another of its tabs; plan 76, plan76-P76-TRAP-SPLIT.json) that hop moves the page's
   * focus and leaves Steam's ring where it was. The press was still reported as used, so every Down did
   * the same nothing. So: ask for the panel's focus first, which lets the hop take the ring; and if the
   * hop still left the ring behind (the page's focus went in, the ring did not), decline the press, so
   * the bubble's own Down goes on to the row under the answer by Steam's own transfer. A press that only
   * scrolled the panel, the ring and the page's focus both still on the bubble, is a press that moved.
   */
  refocusPanelWindowIfLost();
  if (!moveDownInAnswer(bubble, focusedChunkRef, chunkTotal, answerKey)) return false;
  if (uiGamepadFocusElement() !== bubble) return true;
  const sections = answerKey ? orderedAnswerStops(answerKey, bubble) : [];
  return !sections.some((section) => elementHasFocus(section));
}

/** One Down press inside the answer: the order in the drawing at the top of this file. */
function moveDownInAnswer(
  bubbleEl: HTMLElement | null,
  _focusedChunkRef: { current: number },
  chunkTotal: number,
  answerKey?: string
): boolean {
  const bubble = resolveAnswerBubbleEl(answerKey, bubbleEl);
  if (!bubble || chunkTotal <= 0) return false;
  if (answerKey) registerAnswerBubbleEl(answerKey, bubble);

  const scroll = findScrollablePanel(bubble);
  if (!scroll) return false;
  forgetUpWalk(); // a walk Down keeps its own memory (`walk`)

  /*
   * Park on a masked spoiler before scrolling past it.
   *
   * The bubble is a single Focusable and the chunks inside are plain divs, so the fence's own
   * Focusable never received focus — masked strategy text was unreachable without a touchscreen
   * (reported 2026-08-04). Diverting here rather than restructuring the bubble keeps the scroll-step
   * logic intact, which the roadmap explicitly says not to disturb without on-Deck proof.
   *
   * Only fences already on screen and ahead of the ring are eligible: press A to reveal, or press
   * Down again to walk on. The cover the ring is on is not "ahead", so a cover you chose not to
   * open cannot trap Down. That used to be a flag set on landing and never cleared, which made a
   * walk Down skip every cover an earlier walk Up had parked on (plan 76 lane 3: it landed on the
   * section around the cover instead, where A does nothing).
   *
   * The first two attempts at this diversion never ran at all: `bubble` could not resolve, because
   * both routes to it asked the global `document` (uiDocument.ts). Everything below this point was
   * dead code on device, which is why the instrumentation added for it logged nothing.
   */
  const inView = (el: HTMLElement) => elementIsWithinViewportOf(el, scroll);
  const anchor = walkAnchor(bubble, answerKey);
  /* True when the walk is somewhere other than where the ring sits (the ring is on a section, see walkAnchor). */
  const anchored = anchor !== uiGamepadFocusElement();
  const fence = findNextSpoilerFenceInView(bubble, inView, anchor);
  if (fence && focusSpoilerFence(fence)) {
    walk = null;
    /* A cover half behind the dock is not a landing a person can read; lift it clear, as for a section. */
    revealBelowDock(fence, scroll);
    return true;
  }

  /*
   * Same diversion, same reason, for a DRG Survivor glossary term chip (roadmap: tap-to-define
   * jargon). The term chip is a nested Focusable inside plain reply prose, not a stop of its own,
   * so without this it is as unreachable by D-pad as a masked spoiler fence was before the block
   * above existed. Runs after the fence check so a fence still wins if both are in view at once;
   * order between the two diversions has no other significance since they can never overlap in the
   * same reply (spoilers are Strategy-mode only, the glossary is DRG Survivor only).
   *
   * Like the fence, eligibility is geometric (chips *after* the ring) rather than visited-once,
   * so every pass down the reply can land on the chip again — see drgGlossaryTermRegistry.ts. When
   * the ring was moved up to a section from a small stop in it (`keepRingOnScreen`), "the ring" for
   * this purpose is that stop (`walkAnchor`), so it and the ones before it are not offered again.
   * Only words of the ring's own section: a word in the next section comes after that section's box,
   * which Down skipped when the word was already on screen (plan 79 helper AC; the Deck,
   * plan78-QA-FREE-PLAY-01-GAME-try3.json, went from the last word of section 1 to the first of 2).
   */
  const own = ringSection(bubble, answerKey);
  const termChip = findNextDrgGlossaryTermChipInView(
    bubble,
    (el) =>
      inView(el) && (!own || own.contains(el)) &&
      (!anchored || Boolean(anchor!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
    "down",
  );
  if (termChip && focusDrgGlossaryTermChip(termChip)) {
    walk = null;
    revealBelowDock(termChip, scroll);
    return true;
  }

  /*
   * The ring is on the last hidden cover of its section and text runs on below it: the section's box
   * is the next stop (`boxAfterLastCover`), the mirror of Up landing on the box before the cover.
   */
  const box = answerKey ? boxAfterLastCover(bubble, answerKey) : null;
  if (box && focusAnswerStop(box)) {
    boxLandedIn = box;
    /* Placed as any landing: clear of the dock, a box taller than the band up to the header. The lift
       used to do the second half and now leaves sections to the walk (useDockClearanceOnFocus.ts). */
    revealBelowDock(box, scroll);
    revealSectionInBand(box, scroll);
    return true; // the walk keeps its memory: the cover the ring just left is not offered again
  }

  /*
   * Then step section by section, before scrolling.
   *
   * Only a stop that is already on screen is eligible, which is the same rule the fence diversion
   * uses and it is what keeps the two composable: when the next section is below the fold this falls
   * through to the scroll below, and the press after that lands on it. Chasing an off-screen stop
   * instead would scroll and focus in one press and lose the intervening text.
   *
   * With focus still on the bubble itself there is no current section, so Down enters the chain at
   * the first stop *in view* rather than at stop 0 — after the user has scrolled down, stop 0 is
   * above the fold and would never become eligible, leaving the chain permanently unreachable.
   */
  if (answerKey) {
    const stops = orderedAnswerStops(answerKey, bubble);
    const at = focusedAnswerStopIndex(stops);
    const next = at >= 0 ? stops[at + 1] : stops.find(inView);
    /* A fully read section with the next one below the dock: bring the next under the header (`hopToSectionBelow`). */
    if (next && at >= 0 && !inView(next) && hopToSectionBelow(readPartOf(stops[at]!, "down"), next, scroll)) {
      /* A cover at the head of that section still comes before its box, as it does whenever the box is on screen first. */
      const head = findNextSpoilerFenceInView(bubble, inView, anchor);
      if (head && next.contains(head) && isCoverAtHead(next, head, scroll) && focusSpoilerFence(head)) {
        walk = null;
        revealBelowDock(head, scroll);
        return true;
      }
    }
    /*
     * A section that is only its cover has no box stop, in either direction. When its box is on screen
     * but its cover, a few px lower, is not yet, land on the cover, not on the box that stands in for it.
     */
    const onlyCover = next ? lastHiddenCoverIn(next) : null;
    if (next && onlyCover && inView(next) && isCoverOnly(next, onlyCover) && focusSpoilerFence(onlyCover)) {
      walk = null;
      revealBelowDock(onlyCover, scroll);
      return true;
    }
    if (next && inView(next) && focusAnswerStop(next)) {
      walk = null;
      boxLandedIn = next;
      /* Landing on it is not enough — if it runs under the dock, bring it out (down to the last pixel:
         a sliver left behind the dock is what makes Steam's own glide shove the section off the screen). */
      revealBelowDock(next, scroll);
      revealSectionInBand(next, scroll);
      return true;
    }
  }

  /*
   * Only scroll while THIS answer's text still extends below the viewport (its text, not the bubble's
   * frame: `answerTextEdge`). Previously we scrolled TabContentsScroll until max (past branches/thumbs to
   * Save chat), so D-pad Down never yielded to live-turn focus peers (MICRO-04).
   */
  if (!chunkHasContentBelowViewport(answerTextEdge(bubble, answerKey, "down"), scroll)) {
    return false;
  }

  const max = panelScrollMax(scroll);
  if ((max > 0 && panelStepDown(bubble, ringSection(bubble, answerKey))) || tryGeometryPanelScroll(bubble, "down")) {
    keepRingOnScreen(bubble, answerKey, scroll, "down");
    return true;
  }
  return false;
}

/**
 * Up with the ring inside the answer: mirror of `handleAnswerBubbleMoveDown` (the drawing at the top
 * of this file). A chip before the ring, then the section above (or the cover inside it), then a
 * scroll up, after which the ring follows its section if the scroll cut its inline stop off.
 * True when the press was handled here; false lets Steam move the ring out of the answer.
 */
export function handleAnswerBubbleMoveUp(
  bubbleEl: HTMLElement | null,
  _focusedChunkRef: { current: number },
  chunkTotal: number,
  answerKey?: string
): boolean {
  const bubble = resolveAnswerBubbleEl(answerKey, bubbleEl);
  if (!bubble || chunkTotal <= 0) return false;

  const scroll = findScrollablePanel(bubble);
  if (!scroll) return false;

  /*
   * Up-direction glossary chip diversion — the other half of "consistently D-pad focusable"
   * (maintainer, 2026-08-28): without it, a chip walked past was unreachable until remount. Only
   * chips strictly *before* the ring in reading order are eligible, and the registry's ancestor
   * rule keeps the exit intact: with the ring on the bubble itself, no chip is "before" it, so
   * heading out to the header stays one press, exactly like the stop-walk asymmetry below.
   * Fences are not diverted to here: going Up, a hidden cover takes the ring when its own section
   * would (the section step below), not from anywhere in view.
   *
   * With the ring in a section, only that section's own words count, before the ring or, with the ring
   * moved onto the section by a scroll, before the last word passed (`upWalk`): Down reads a section's
   * box, then its words, then the next section, so Up goes the next section, these words last to first,
   * then the box (plan 79 helper AC; the Deck skipped every word going Up,
   * plan78-QA-FREE-PLAY-01-GAME-try3.json). Words of the section above are reached through it.
   */
  if (wordStepUp(bubble, ringSection(bubble, answerKey), scroll)) {
    forgetDownWalk();
    return true;
  }

  /*
   * Step back through the sections, and note the asymmetry with Down: Up walks only when a stop
   * already holds focus. Down enters the chain from the bubble because that is how you arrive —
   * header, then bubble, then into the answer. Up arriving at the bubble means the user is on their
   * way out to the header, so diving into the last visible section would trap them one press short.
   *
   * `at > 0` rather than `at >= 0`: from the first section, Up falls through to the scroll below and
   * then yields, which is what hands focus back to the turn header.
   */
  if (answerKey) {
    const stops = orderedAnswerStops(answerKey, bubble);
    const at = focusedAnswerStopIndex(stops);
    /* A cover on this very section, wholly on screen and before the ring, comes first (see `coverToLandOnGoingUp`). */
    const before = at >= 0 ? coverToLandOnGoingUp(stops[at]!, scroll) : null;
    if (before && focusSpoilerFence(before)) {
      forgetWalk();
      return true;
    }
    const prev = at > 0 ? stops[at - 1] : undefined;
    /*
     * The stop the ring is on has been read from its top (its top edge is in the band) and the section
     * above sits wholly above the header: bring that section's bottom to the dock, so the press lands
     * on it instead of only scrolling. The mirror of the same step going Down.
     */
    if (prev && !elementIsWithinViewportOf(prev, scroll)) hopToSectionAbove(readPartOf(stops[at]!, "up"), prev, scroll);
    /* A hidden cover in that section takes the ring first (plan 74 lane 3; `stepUpIntoSection`). */
    if (prev && elementIsWithinViewportOf(prev, scroll) && stepUpIntoSection(prev, scroll)) {
      forgetWalk();
      return true;
    }
    /* Placed as on the Down path (not under the dock, nor the header); its last word on screen first. */
    if (prev && elementIsWithinViewportOf(prev, scroll) && landGoingUpInto(bubble, prev, scroll)) {
      forgetDownWalk();
      return true;
    }
  }

  /* Mirror down: only scroll while the answer's text remains above the viewport. */
  if (!chunkHasContentAboveViewport(answerTextEdge(bubble, answerKey, "up"), scroll)) {
    return false;
  }

  const scrolled =
    scroll.scrollTop <= 0 ? tryGeometryPanelScroll(bubble, "up") : panelStepUp(bubble, ringSection(bubble, answerKey));
  if (scrolled) keepRingOnScreen(bubble, answerKey, scroll, "up");
  return scrolled;
}
