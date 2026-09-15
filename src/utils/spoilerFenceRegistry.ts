/**
 * Title: Letting the D-pad land on a hidden spoiler instead of scrolling past it
 *
 * Purpose: Reply text can contain a "spoiler" that starts out hidden until a person chooses to
 * reveal it. Normally the whole reply is one connected area for the controller's Down button to
 * scroll through, so a hidden spoiler inside it never gets its own stop — Down just scrolls past
 * it, and with no touchscreen there is no other way to reach it. This file keeps a live list of
 * every hidden spoiler currently on screen, so Down can check that list and land the controller's
 * highlight on one of them instead of scrolling past.
 *
 * Used for: `MainTabBonsaiAiMarkdownChunk` (registers each spoiler when it mounts) and
 * `answerBubbleNavigation` (decides that Down should land there instead of scrolling on).
 *
 * Solves: a hidden spoiler had no way to be reached at all without a touchscreen, because the
 * whole reply is one connected area for focus purposes and the spoiler's own element never
 * received the controller's highlight on its own.
 *
 * Does not: decide what counts as hidden, or reveal it — the spoiler element itself owns whether
 * it is open.
 *
 * Gotchas:
 *   - Unlike the cross-area jumps elsewhere in this project (see `navFocusRegistry.ts`), a plain
 *     `.focus()` call here does move Steam's own highlight, not just the browser's idea of what
 *     is focused — confirmed on device 2026-08-04. That is because the spoiler sits inside the
 *     same connected area as the rest of the reply, rather than in a separate one; the
 *     cross-area trick that other file exists for is not needed here. This code never overwrites
 *     an existing `tabindex` for the same reason that trick's target rows have to be handled with
 *     care: this element already carries `tabindex="0"` from how the screen is built, and forcing
 *     it to `-1` would take it back out of Steam's list of controller-reachable things.
 *   - A spoiler is only marked as "already offered" (`markSpoilerFenceVisited`) once the highlight
 *     actually lands there, confirmed with `elementHasFocus`. Marking it earlier meant a single
 *     failed attempt permanently skipped that spoiler for the rest of the reply's time on screen,
 *     with no way to reach it afterward.
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
