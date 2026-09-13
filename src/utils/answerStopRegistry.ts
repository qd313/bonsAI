/**
 * Title: Answer stop registry
 * Purpose: Track the focusable sections inside one answer bubble, in order, so D-pad Down/Up can walk them.
 * Used for: buildAnswerBubbleElement (registration) and answerBubbleNavigation (the walk).
 * Solves: The bubble is a single Focusable, so a long reply was one stop — Down scrolled the panel by
 *         a fixed step and there was no way to land on a section, which is what reading a strategy
 *         answer on a controller needs.
 * Does not: Decide what a section is (see prepareStreamMarkdown / splitResponseIntoChunks), or own
 *           the masked-spoiler diversion, which stays in spoilerFenceRegistry and runs first.
 *
 * Named for the answer rather than the stream on purpose: history turns register here too, so that
 * navigation is identical whether or not a turn streamed.
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
