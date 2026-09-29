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
 *   - There is no "already offered" flag any more (plan 76 lane 3). It was set when the highlight
 *     landed on a cover and never cleared, so a walk UP that had parked on a cover made every later
 *     walk DOWN skip it and land on the section around it, where A does nothing (Deck, Hollow
 *     Knight Soul Sanctum: docs/test-evidence/plan76-P76-M-COVER-ONLY.json and
 *     plan74-REPLY-STOPS-MIRROR-01-r2.json — every run began with an Up walk). Which cover Down
 *     offers is worked out fresh on every press from where the ring is, the way glossary chips
 *     are (drgGlossaryTermRegistry.ts): the cover the ring is on is never offered again, and one
 *     the ring has moved past is not either, so nothing can trap the walk.
 */

import { elementHasFocus, rememberUiDocument } from "./uiDocument";

type FenceEntry = {
  el: HTMLElement;
  /** Opens the cover the way A on it does, so A on the section around it can too. */
  reveal?: () => void;
};

const fences = new Map<string, FenceEntry>();

/**
 * Ref callback: element on mount, null on unmount or once the fence opens. `reveal` is the fence's own
 * "open me" (what A on it calls), handed over here so nothing has to hunt for its button in the page.
 */
export function registerSpoilerFence(id: string, el: HTMLElement | null, reveal?: () => void): void {
  if (el) {
    rememberUiDocument(el);
    fences.set(id, { el, reveal });
  } else {
    fences.delete(id);
  }
}

/**
 * The first still-masked fence inside `bubble` that is on screen and lies ahead of `ring`.
 *
 * `ring` is where the walk is: the element the ring sits on, or the inline stop it was just moved off
 * (answerBubbleNavigation.ts, `walkAnchor`). Ahead means: the ring is on a container that holds the
 * fence (the bubble, or the section around it), or the fence comes after the ring in the page. The
 * fence the ring is on, and every fence before it, are never offered, so a second Down walks on
 * instead of landing on the same cover again. No ring, or one outside the bubble, offers everything
 * in view.
 *
 * Containment is checked against registered elements rather than looked up with a selector, per
 * `AGENTS.md (Decky focus graph)` — a DOM query for a focus target misses under Decky.
 */
export function findNextSpoilerFenceInView(
  bubble: HTMLElement,
  isInView: (el: HTMLElement) => boolean,
  ring: HTMLElement | null,
): HTMLElement | null {
  const relevantRing = ring && bubble.contains(ring) ? ring : null;
  let best: HTMLElement | null = null;
  for (const entry of fences.values()) {
    const el = entry.el;
    if (!bubble.contains(el)) continue;
    if (relevantRing) {
      if (el === relevantRing || el.contains(relevantRing)) continue;
      const where = relevantRing.compareDocumentPosition(el);
      if (!(where & (Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_CONTAINED_BY))) continue;
    }
    if (!isInView(el)) continue;
    /* The nearest one, in reading order: registration order is not reading order once a fence remounts. */
    if (!best || best.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) best = el;
  }
  return best;
}

/**
 * The last still-masked fence inside `section` that is on screen, whether or not Down already
 * parked on it -- for Up (plan 74 lane 3). Up has no trap to avoid: from a fence it steps on to the
 * section above. Last in reading order, since Up arrives from below.
 */
export function findLastSpoilerFenceIn(
  section: HTMLElement,
  isInView: (el: HTMLElement) => boolean,
): HTMLElement | null {
  let last: HTMLElement | null = null;
  for (const entry of fences.values()) {
    if (!section.contains(entry.el) || !isInView(entry.el)) continue;
    if (!last || last.compareDocumentPosition(entry.el) & Node.DOCUMENT_POSITION_FOLLOWING) last = entry.el;
  }
  return last;
}

/**
 * The first still-masked fence inside `section` that is on screen: what A on the section itself opens
 * (answerBubbleNavigation.ts, `openHiddenCoverIn`), so a cover the ring did not land on can still be
 * opened from the section around it.
 */
export function findFirstSpoilerFenceIn(
  section: HTMLElement,
  isInView: (el: HTMLElement) => boolean,
): HTMLElement | null {
  let first: HTMLElement | null = null;
  for (const entry of fences.values()) {
    if (!section.contains(entry.el) || !isInView(entry.el)) continue;
    if (!first || first.compareDocumentPosition(entry.el) & Node.DOCUMENT_POSITION_PRECEDING) first = entry.el;
  }
  return first;
}

/** Open a registered fence the way A on it does. False when it is not registered or cannot open. */
export function revealSpoilerFence(el: HTMLElement): boolean {
  for (const entry of fences.values()) {
    if (entry.el === el && entry.reveal) {
      entry.reveal();
      return true;
    }
  }
  return false;
}

/**
 * Focus a fence. Returns true only when focus actually landed.
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
  return elementHasFocus(el);
}

/** Test-only reset. */
export function resetSpoilerFenceRegistry(): void {
  fences.clear();
}
