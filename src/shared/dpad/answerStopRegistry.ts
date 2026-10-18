/**
 * Title: The stops inside one reply, in order
 *
 * Purpose: A long AI reply is broken into sections on screen — separate headings, paragraphs, code
 * blocks. Before this file existed, the whole reply was one single thing the D-pad could land on, so
 * Down just scrolled the box by a fixed amount and there was no way to land the ring on a particular
 * section. This file keeps an ordered note of every section inside one reply — called a "stop" — so
 * pressing Down or Up can walk from one section to the next, the way reading a strategy answer on a
 * controller needs.
 *
 * Used for: buildAnswerBubbleElement, which notes each section down as it draws it, and
 * answerBubbleNavigation, which walks between them.
 *
 * Solves: without this, a long reply had no way to be read section by section with a controller —
 * Down just scrolled by a fixed step.
 *
 * Does not: decide where one section ends and the next begins — that is decided elsewhere, by
 * whatever splits the reply into chunks as it renders. Nor does it own the separate diversion that
 * lets Down stop briefly on a hidden ("masked") spoiler — that lives in its own file and runs first.
 *
 * Named after the reply rather than the stream of text on purpose: a reply loaded back from an
 * earlier saved chat registers its sections here too, so walking through it with the D-pad works
 * exactly the same whether the reply just streamed in live or was reopened from history.
 *
 * Gotchas:
 *   - Section order comes from whichever part of the screen is drawing the sections, not by comparing
 *     on-screen boxes to each other — the drawing code already knows the order, and the project's
 *     rule for D-pad walks is to avoid asking the page itself a question like that (see AGENTS.md's
 *     Decky focus graph section). Re-noting a section under the same position just replaces the old
 *     box with the new one, which is what happens on every re-draw.
 *   - `orderedAnswerStops` double-checks that every section it returns is still actually inside the
 *     bubble it was asked about. That check is not just caution: a reply can get a new internal id
 *     partway through (when a live, still-streaming reply becomes a finished one saved to history),
 *     and for one moment the old bubble's sections can still be noted down. Trying to focus one of
 *     those leftover sections fails silently — the press just does nothing.
 *   - `focusedAnswerStopIndex` asks where Steam's own highlight ring is, not the browser's ordinary
 *     "focused element." Nothing calls `.focus()` before this runs — it is a plain "where is the
 *     player right now" question — and on the Steam Deck the browser's answer to that question is a
 *     different, often wrong one. Asking it the wrong way found a real bug (tracked as MICRO-04): the
 *     browser's idea of what was focused pointed at some other, stale section, so Down moved to the
 *     section *after* that stale one — not the one next to where the player actually was — or fell
 *     off the end of the list entirely and let Steam handle the press on its own.
 *   - `focusAnswerStop` is allowed to use a plain `.focus()` call, unlike the cross-bubble jump in
 *     answerBubbleElRegistry.ts — because a stop sits inside the same navigation area the ring is
 *     already in. Moving *within* one area works with a plain `.focus()`; only moving *into* a
 *     different area needs the special hand-off call. It also never overwrites a `tabindex` Decky
 *     already put on the element, and it checks that focus actually landed by asking the section's
 *     own page for its focused element, not the browser's global one — the same two details
 *     `focusSpoilerFence` relies on, for the same reason.
 */

import { elementHasFocus, rememberUiDocument, uiGamepadFocusElement } from "./uiDocument";

/**
 * One map per answer, keyed by the section's position in the rendered stack.
 *
 * Position comes from the renderer rather than from comparing DOM nodes: the renderer already knows
 * it, and `AGENTS.md (Decky focus graph)` rules out reaching for the document to answer a
 * focus question. Re-registering with the same index simply replaces the element, which is what a
 * re-render does.
 */
const stopsByAnswer = new Map<string, Map<number, HTMLElement>>();

/**
 * Ref callback: element on mount, null on unmount.
 *
 * The call site passes an inline arrow, so React detaches (null) and re-attaches on every render of
 * that section. That is deliberate — it is how a stop whose index shifted (the live tail moves down
 * as closed blocks accumulate) gets its new position without an effect.
 */
export function registerAnswerStop(
  answerKey: string,
  index: number,
  el: HTMLElement | null,
): void {
  const existing = stopsByAnswer.get(answerKey);
  if (el) {
    rememberUiDocument(el);
    if (existing) existing.set(index, el);
    else stopsByAnswer.set(answerKey, new Map([[index, el]]));
    return;
  }
  if (!existing) return;
  existing.delete(index);
  if (existing.size === 0) stopsByAnswer.delete(answerKey);
}

/**
 * This answer's stops in render order, restricted to the ones actually inside `bubble`.
 *
 * The containment check is not paranoia: a turn that is re-keyed (live → history id) can leave the
 * previous bubble's entries behind for a commit, and focusing a detached node silently swallows the
 * press.
 */
export function orderedAnswerStops(answerKey: string, bubble: HTMLElement): HTMLElement[] {
  const entries = stopsByAnswer.get(answerKey);
  if (!entries) return [];
  return [...entries.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, el]) => el)
    .filter((el) => bubble.contains(el));
}

/**
 * Position in `stops` of the stop the gamepad ring currently sits in, or -1 when it is elsewhere
 * (the bubble itself, a spoiler fence's own Focusable, or another turn).
 *
 * `contains` is the right test rather than identity: focus may sit on a control nested inside the
 * stop, and that still means "the user is in this section".
 *
 * Reads the ring, not `activeElement`. This is the MICRO-04 defect: nobody calls `.focus()` before
 * this, so there is no landing to check — it is a pure "where is the user" question, and on device
 * `activeElement` answers a different one. A stale `activeElement` inside some other stop makes
 * `at` a real but wrong index, so Down goes to `stops[at + 1]` — a section the user is not next to,
 * or `undefined`, which drops the whole chain and yields the press to Steam.
 */
export function focusedAnswerStopIndex(stops: HTMLElement[]): number {
  const active = uiGamepadFocusElement();
  if (!active) return -1;
  return stops.findIndex((el) => el === active || el.contains(active));
}

/**
 * Focus a stop. Returns true only when focus actually landed.
 *
 * Same two load-bearing details as `focusSpoilerFence`, for the same reasons: never overwrite the
 * `tabindex` Decky put there, and verify with `elementHasFocus` (the element's own document) rather
 * than the global `document.activeElement`, which under Decky describes a different page entirely.
 *
 * A plain `focus()` is legal here because a stop is inside the bubble's navigation container — the
 * rule that requires `navRef.current.TakeFocus(true)` applies to *leaving* a container.
 */
export function focusAnswerStop(el: HTMLElement | null): boolean {
  if (!el) return false;
  try {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {
      /* ignore — a detached stop simply fails to claim focus */
    }
  }
  return elementHasFocus(el);
}

/** Test-only reset. */
export function resetAnswerStopRegistry(): void {
  stopsByAnswer.clear();
}
