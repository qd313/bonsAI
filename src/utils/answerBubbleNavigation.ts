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
 *       2. a glossary-term chip on screen and ahead of the ring    -> land on the chip
 *       3. the next section, but only if it is already on screen
 *       4. otherwise, scroll the panel and try again on the next press; if that scroll carries
 *          the stop the ring is on off the screen (a cover, an opened cover's "tap to hide"
 *          line, an underlined word), the ring moves to the section that holds it
 *
 *     Pressing Up is the mirror, and lands on the same stops in reverse:
 *       1. a glossary-term chip on screen and before the ring      -> land on the chip
 *       2. the section above -- or, when that section holds a hidden cover, the cover
 *          (`focusCoverGoingUp`), which is also how the walk enters an answer from below
 *       3. otherwise, scroll the panel up, with the same ring-follows-the-section step as Down
 *
 *     The stops, in one line: every section, and inside a section every hidden cover and every
 *     underlined word, once each. A cover is what the ring lands on, in both directions, whenever
 *     it is on screen when its section is reached, so the section's own box is only a stop when
 *     the cover is not yet visible (the box of a tall section, read by scrolling). A on a section
 *     that holds a hidden cover on screen opens it (`openHiddenCoverIn`), so a cover can be opened
 *     from wherever the ring lands. Which cover is "ahead" is worked out from where the ring is on
 *     every press, never remembered across walks: an earlier flag set on landing made a walk Down
 *     skip every cover a walk Up had parked on (Deck, 2026-09-28).
 *
 *     The one memory a walk Down does keep is inside a section: the last cover or word the ring was
 *     on there (`walkAnchor`). When a scroll moves the ring from that stop up to its section, the
 *     stop and everything before it are never offered again until the ring leaves the section,
 *     whatever Steam then does to the panel. That is what stops a cover and its section trading the
 *     ring for ever (Deck, 2026-09-29). It also means a section whose text runs on past the screen
 *     shows Down one stop more than Up: cover, then the section's box once a scroll has moved the
 *     ring up to it, then the next section; Up goes next section, cover.
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
  scrollTabContentsByStep,
  tryGeometryPanelScroll,
} from "./chatPanelScroll";
import {
  getRegisteredAnswerBubble,
  registerAnswerBubbleEl,
  resolveFocusedAnswerBubble,
  takeAnswerBubbleNavFocus,
} from "./answerBubbleElRegistry";
import { elementHasFocus, getUiDocument, uiGamepadFocusElement } from "./uiDocument";

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

/** The section a walk Down is in and the last small stop in it the ring has been on; see `walkAnchor`. */
let walk: { section: HTMLElement; passed: HTMLElement | null } | null = null;

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
  walk = null;
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
   * handleAnswerBubbleMoveDown below.
   */
  const spoiler = el.querySelector<HTMLElement>(".bonsai-spoiler-reveal-target");
  if (spoiler && (!stops.length || stops[0]!.contains(spoiler)) && focusPanelEl(spoiler)) {
    return true;
  }
  if (stops.length && focusAnswerStop(stops[0]!)) return true;
  return focusPanelEl(el);
}

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
  walk = null;
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
  if (last && focusCoverGoingUp(last, findScrollablePanel(el))) return true;
  if (last && focusAnswerStop(last)) {
    /* Coming into the answer from below — Up out of the Show details line — lands here, and it is
       the one entry point that skipped the dock check (measured 2026-09-06). */
    const scroll = findScrollablePanel(el);
    if (scroll) revealBelowDock(last, scroll);
    return true;
  }
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
  walk = null;
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

/** Scroll QAM panel down; true only when scrollTop increases. */
function panelStepDown(bubbleEl: HTMLElement): boolean {
  const scroll = findScrollablePanel(bubbleEl);
  if (!scroll) return false;
  const before = scroll.scrollTop;
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

/** Scroll QAM panel up; true only when scrollTop decreases. */
function panelStepUp(bubbleEl: HTMLElement): boolean {
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
  if (scrollTabContentsByStep(bubbleEl, "up")) {
    return scroll.scrollTop < before;
  }
  const step = Math.max(80, Math.floor(scroll.clientHeight * 0.35));
  scroll.scrollTop = Math.max(0, before - step);
  return scroll.scrollTop < before;
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

/** A pixel or two of an edge is rounding, not a cut. */
const CUT_TOLERANCE_PX = 1;

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
  const stops = answerKey ? orderedAnswerStops(answerKey, bubble) : [];
  const section = stops[focusedAnswerStopIndex(stops)];
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

function keepRingOnScreen(
  bubble: HTMLElement,
  answerKey: string | undefined,
  scroll: HTMLElement,
  direction: "down" | "up"
): void {
  if (!answerKey) return;
  const ring = uiGamepadFocusElement();
  if (!ring || !bubble.contains(ring)) return;
  const stops = orderedAnswerStops(answerKey, bubble);
  const section = stops[focusedAnswerStopIndex(stops)];
  /* On the section itself (or on nothing inside one): reading it by scrolling is the design. */
  if (!section || section === ring) return;
  const rect = ring.getBoundingClientRect();
  const cut =
    direction === "down"
      ? rect.top < scroll.getBoundingClientRect().top - CUT_TOLERANCE_PX
      : rect.bottom > readableBottomOf(scroll) + CUT_TOLERANCE_PX;
  if (cut) focusAnswerStop(section);
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
  _focusedChunkRef: { current: number },
  chunkTotal: number,
  answerKey?: string
): boolean {
  const bubble = resolveAnswerBubbleEl(answerKey, bubbleEl);
  if (!bubble || chunkTotal <= 0) return false;
  if (answerKey) registerAnswerBubbleEl(answerKey, bubble);

  const scroll = findScrollablePanel(bubble);
  if (!scroll) return false;

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
   */
  const termChip = findNextDrgGlossaryTermChipInView(
    bubble,
    (el) => inView(el) && (!anchored || Boolean(anchor!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
    "down",
  );
  if (termChip && focusDrgGlossaryTermChip(termChip)) {
    walk = null;
    return true;
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
    if (next && inView(next) && focusAnswerStop(next)) {
      walk = null;
      /* Landing on it is not enough — if it runs under the dock, bring it out. */
      revealBelowDock(next, scroll);
      return true;
    }
  }

  /*
   * Only scroll while THIS bubble still extends below the viewport.
   * Previously we scrolled TabContentsScroll until max (past branches/thumbs to Save chat),
   * so D-pad Down never yielded to live-turn focus peers (MICRO-04).
   */
  if (!chunkHasContentBelowViewport(bubble, scroll)) {
    return false;
  }

  const max = panelScrollMax(scroll);
  if ((max > 0 && panelStepDown(bubble)) || tryGeometryPanelScroll(bubble, "down")) {
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
   */
  const termChip = findNextDrgGlossaryTermChipInView(
    bubble,
    (el) => elementIsWithinViewportOf(el, scroll),
    "up",
  );
  if (termChip && focusDrgGlossaryTermChip(termChip)) {
    walk = null;
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
    const prev = at > 0 ? stops[at - 1] : undefined;
    /* A hidden cover in that section takes the ring first (plan 74 lane 3; focusCoverGoingUp). */
    if (prev && elementIsWithinViewportOf(prev, scroll) && focusCoverGoingUp(prev, scroll)) {
      walk = null;
      return true;
    }
    if (prev && elementIsWithinViewportOf(prev, scroll) && focusAnswerStop(prev)) {
      walk = null;
      /* Same as the Down path: landing on it is not enough if it runs under the dock. */
      revealBelowDock(prev, scroll);
      return true;
    }
  }

  /* Mirror down: only scroll while bubble content remains above the viewport. */
  if (!chunkHasContentAboveViewport(bubble, scroll)) {
    return false;
  }

  const scrolled =
    scroll.scrollTop <= 0 ? tryGeometryPanelScroll(bubble, "up") : panelStepUp(bubble);
  if (scrolled) keepRingOnScreen(bubble, answerKey, scroll, "up");
  return scrolled;
}
