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
 *       1. an unrevealed spoiler already on screen  -> offer it
 *       2. a glossary-term chip already on screen   -> offer it
 *       3. the next section, but only if it is already on screen
 *       4. otherwise, scroll the panel and try again on the next press
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
import { elementHasFocus, getUiDocument } from "./uiDocument";

import {
  findUnvisitedSpoilerFenceInView,
  focusSpoilerFence,
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
  if (last && focusAnswerStop(last)) {
    /* Coming into the answer from below — Up out of the Show details line — lands here, and it is
       the one entry point that skipped the dock check (measured 2026-09-06). */
    const scroll = findScrollablePanel(el);
    if (scroll) revealBelowDock(last, scroll);
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
   * Only fences already on screen are eligible, and each is offered once: press A to reveal, or
   * press Down again to scroll on. Without the visited flag a fence you chose not to open would
   * trap Down forever.
   *
   * The first two attempts at this diversion never ran at all: `bubble` could not resolve, because
   * both routes to it asked the global `document` (uiDocument.ts). Everything below this point was
   * dead code on device, which is why the instrumentation added for it logged nothing.
   */
  const fence = findUnvisitedSpoilerFenceInView(bubble, (el) =>
    elementIsWithinViewportOf(el, scroll),
  );
  if (fence && focusSpoilerFence(fence)) return true;

  /*
   * Same diversion, same reason, for a DRG Survivor glossary term chip (roadmap: tap-to-define
   * jargon). The term chip is a nested Focusable inside plain reply prose, not a stop of its own,
   * so without this it is as unreachable by D-pad as a masked spoiler fence was before the block
   * above existed. Runs after the fence check so a fence still wins if both are in view at once;
   * order between the two diversions has no other significance since they can never overlap in the
   * same reply (spoilers are Strategy-mode only, the glossary is DRG Survivor only).
   *
   * Unlike the fence, eligibility is geometric (chips *after* the ring) rather than visited-once,
   * so every pass down the reply can land on the chip again — see drgGlossaryTermRegistry.ts.
   */
  const termChip = findNextDrgGlossaryTermChipInView(
    bubble,
    (el) => elementIsWithinViewportOf(el, scroll),
    "down",
  );
  if (termChip && focusDrgGlossaryTermChip(termChip)) return true;

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
    const inView = (el: HTMLElement) => elementIsWithinViewportOf(el, scroll);
    const at = focusedAnswerStopIndex(stops);
    const next = at >= 0 ? stops[at + 1] : stops.find(inView);
    if (next && inView(next) && focusAnswerStop(next)) {
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
  if (max > 0 && panelStepDown(bubble)) {
    return true;
  }
  return tryGeometryPanelScroll(bubble, "down");
}

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
   * No fence equivalent exists on Up — fences keep their shipped Down-only, visited-once shape.
   */
  const termChip = findNextDrgGlossaryTermChipInView(
    bubble,
    (el) => elementIsWithinViewportOf(el, scroll),
    "up",
  );
  if (termChip && focusDrgGlossaryTermChip(termChip)) return true;

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
    if (prev && elementIsWithinViewportOf(prev, scroll) && focusAnswerStop(prev)) {
      /* Same as the Down path: landing on it is not enough if it runs under the dock. */
      revealBelowDock(prev, scroll);
      return true;
    }
  }

  /* Mirror down: only scroll while bubble content remains above the viewport. */
  if (!chunkHasContentAboveViewport(bubble, scroll)) {
    return false;
  }

  if (scroll.scrollTop <= 0) {
    return tryGeometryPanelScroll(bubble, "up");
  }
  return panelStepUp(bubble);
}
