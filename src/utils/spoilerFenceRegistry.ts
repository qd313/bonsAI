/**
 * Title: Spoiler fence registry
 * Purpose: Track mounted, still-masked spoiler fences so D-pad Down can focus one instead of scrolling past it.
 * Used for: MainTabBonsaiAiMarkdownChunk (registration) and answerBubbleNavigation (the diversion).
 * Solves: A masked spoiler was unreachable without a touchscreen — the reply bubble is a single
 *         Focusable that owns vertical movement, so the fence's own Focusable never received focus.
 * Does not: Decide what is masked, or reveal it — the fence owns its open state.
 */

import { elementHasFocus, rememberUiDocument } from "./uiDocument";

type FenceEntry = {
  el: HTMLElement;
  /** Set once Down has parked focus here, so a second Down scrolls on instead of trapping the user. */
  visited: boolean;
};

const fences = new Map<string, FenceEntry>();

/** Ref callback: element on mount, null on unmount or once the fence opens. */
export function registerSpoilerFence(id: string, el: HTMLElement | null): void {
  if (el) {
    rememberUiDocument(el);
    fences.set(id, { el, visited: false });
  } else {
    fences.delete(id);
  }
}

/**
 * The first still-masked fence inside `bubble` that is on screen and has not been parked on yet.
 *
 * Containment is checked against registered elements rather than looked up with a selector, per
 * `AGENTS.md (Decky focus graph)` — a DOM query for a focus target misses under Decky.
 */
export function findUnvisitedSpoilerFenceInView(
  bubble: HTMLElement,
  isInView: (el: HTMLElement) => boolean,
): HTMLElement | null {
  for (const entry of fences.values()) {
    if (entry.visited) continue;
    if (!bubble.contains(entry.el)) continue;
    if (!isInView(entry.el)) continue;
    return entry.el;
  }
  return null;
}

/** Mark a fence as parked-on so the next Down continues scrolling rather than re-focusing it. */
export function markSpoilerFenceVisited(el: HTMLElement): void {
  for (const entry of fences.values()) {
    if (entry.el === el) {
      entry.visited = true;
      return;
    }
  }
}

/**
 * Focus a fence and mark it visited. Returns true only when focus actually landed.
 *
 * The fence element is itself the `.Panel.Focusable` Decky renders for our `<Focusable>`, and a
 * plain `.focus()` on it moves Steam's own gamepad ring onto it — verified on device over CEF
 * remote debugging (2026-08-04): `gpfocus gpfocuswithin` appeared on the fence one tick later.
 *
 * Two details are load-bearing:
 *  - Do not overwrite an existing `tabindex`. Decky gives the node `tabindex="0"`; forcing `-1`
 *    takes it back out of Steam's navigation graph for the presses that follow.
 *  - Verify with `elementHasFocus`, which asks the fence's own document. The earlier
 *    `contains(document.activeElement)` shape asked SharedJSContext's shell document and returned
 *    false even when the focus move had succeeded.
 */
export function focusSpoilerFence(el: HTMLElement | null): boolean {
  if (!el) return false;
  try {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {
      /* ignore — a detached fence simply fails to claim focus */
    }
  }
  /*
   * Mark visited only once focus actually landed.
   *
   * Marking first meant a single failed attempt burned the fence's one offer: `visited` stayed true,
   * `findUnvisitedSpoilerFenceInView` skipped it from then on, and the masked text became
   * unreachable by D-pad for the rest of that mount — the same "no touchscreen, no spoiler" hole
   * this registry exists to close.
   */
  if (!elementHasFocus(el)) return false;
  markSpoilerFenceVisited(el);
  return true;
}

/** Test-only reset. */
export function resetSpoilerFenceRegistry(): void {
  fences.clear();
}
