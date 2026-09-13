/**
 * Title: DRG glossary term chip registry
 * Purpose: Track mounted DRG glossary term chips so D-pad Down/Up can park the ring on one in passing.
 * Used for: DrgGlossaryTermChip (registration) and answerBubbleNavigation (the diversions).
 * Solves: The reply bubble is a single Focusable that owns vertical movement, so a term chip's own
 *         nested Focusable never receives focus without an explicit park-on-it diversion — the same
 *         problem spoilerFenceRegistry solves for masked spoiler fences.
 * Does not: Decide peek/full/dismiss state — the chip owns that.
 *
 * Unlike the spoiler registry this one has NO visited flag, on purpose. Visited-once made a chip
 * reachable exactly once per mount: walk past it and no later pass could ever land on it again,
 * and Up could never reach it at all ("consistently dpad focusable", maintainer 2026-08-28).
 * Eligibility is reading-order geometry instead — Down offers only chips *after* the ring, Up only
 * chips *before* it — which is what makes every pass see the chip without any flag to trap on:
 * from the chip itself, the chip is excluded by identity, so the same press that used to need the
 * flag simply moves on.
 */
import { elementHasFocus, rememberUiDocument, uiGamepadFocusElement } from "./uiDocument";

const chips = new Map<string, HTMLElement>();

/** Two rects whose tops differ by less than this sit on the same text line. */
const SAME_LINE_TOLERANCE_PX = 4;

/** Ref callback: element on mount, null on unmount. */
export function registerDrgGlossaryTermChip(id: string, el: HTMLElement | null): void {
  if (el) {
    rememberUiDocument(el);
    chips.set(id, el);
  } else {
    chips.delete(id);
  }
}

/** True when `a` comes before `b` in reading order (above, or same line and further left). */
function beforeInReadingOrder(a: DOMRect, b: DOMRect): boolean {
  if (Math.abs(a.top - b.top) < SAME_LINE_TOLERANCE_PX) return a.left < b.left;
  return a.top < b.top;
}

/**
 * The nearest on-screen term chip in `direction` from where the ring is now, or null.
 *
 * Three eligibility cases, in order:
 * - the ring is on or inside the chip → never eligible (that is where we already are);
 * - the ring is on an *ancestor* of the chip (the bubble itself, or the section containing it) →
 *   eligible going Down (its content is ahead of us), never going Up (arriving up at a container
 *   means the user is on their way out — same asymmetry `handleAnswerBubbleMoveUp` documents);
 * - otherwise → plain reading-order comparison of the two rects. This includes a ring *outside*
 *   the bubble: the reply-actions row below it calls this going Up, and every chip in the bubble
 *   is before that ring in reading order, which is exactly right.
 *
 * No ring at all behaves like the ancestor case: Down offers the first chip, Up nothing.
 */
export function findNextDrgGlossaryTermChipInView(
  bubble: HTMLElement,
  isInView: (el: HTMLElement) => boolean,
  direction: "down" | "up",
): HTMLElement | null {
  const ring = uiGamepadFocusElement();
  const ringRect = ring ? ring.getBoundingClientRect() : null;

  let best: { el: HTMLElement; rect: DOMRect } | null = null;
  for (const el of chips.values()) {
    if (!bubble.contains(el)) continue;
    if (!isInView(el)) continue;
    if (ring && (el === ring || el.contains(ring))) continue;

    const rect = el.getBoundingClientRect();
    const ringIsAncestor = !ring || ring.contains(el);
    if (ringIsAncestor) {
      if (direction === "up") continue;
    } else {
      const after = beforeInReadingOrder(ringRect!, rect);
      if (direction === "down" ? !after : after) continue;
    }

    if (
      best === null ||
      (direction === "down"
        ? beforeInReadingOrder(rect, best.rect)
        : beforeInReadingOrder(best.rect, rect))
    ) {
      best = { el, rect };
    }
  }
  return best?.el ?? null;
}

/**
 * Focus a term chip. Returns true only when focus actually landed.
 *
 * Same two load-bearing details as `focusSpoilerFence`: never overwrite an existing `tabindex`
 * (Decky already put `0` there), and verify with `elementHasFocus`, which asks the chip's own
 * document rather than SharedJSContext's shell (`AGENTS.md (Decky focus graph)`).
 */
export function focusDrgGlossaryTermChip(el: HTMLElement | null): boolean {
  if (!el) return false;
  try {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {
      /* ignore — a detached chip simply fails to claim focus */
    }
  }
  return elementHasFocus(el);
}

/** Test-only reset. */
export function resetDrgGlossaryTermRegistry(): void {
  chips.clear();
}
