/**
 * Title: Letting the D-pad walk park on a glossary term chip in passing
 *
 * Purpose: A reply can contain a highlighted game-term chip the player can open for a definition (see
 * drgGlossaryTermMatch.ts for how those terms are found). The whole reply is one single thing the
 * D-pad already moves through top to bottom, so a chip drawn part-way down it would normally be
 * skipped over entirely — its own separate spot never gets a turn on its own. This file is what lets
 * Down or Up pause the ring on a chip on the way past: it keeps a note of every chip currently drawn
 * on screen, and works out which one, if any, sits between where the ring is now and where the press
 * is heading.
 *
 * Used for: DrgGlossaryTermChip, which adds itself to the note as it is drawn, and
 * answerBubbleNavigation, which asks this file for the detour on every Down/Up press.
 *
 * Solves: without this, a term chip drawn inside a long reply would never be reachable by D-pad at
 * all, because the reply around it is what actually owns vertical movement.
 *
 * Does not: decide whether a chip is showing a short peek or its full definition, or whether the
 * player has dismissed it — the chip itself owns that.
 *
 * Gotchas:
 *   - An earlier version only offered each chip once per reply, using a flag that got set the moment
 *     the ring passed it. That backfired: walking past a chip going Down made it permanently
 *     unreachable for the rest of that viewing, and Up could never reach it at all (reported directly
 *     by the maintainer, 2026-08-28: a chip needs to be reachable by D-pad every time, not once). The
 *     flag is gone. Whether a chip counts now is worked out fresh on every single press, purely from
 *     where things are on screen: Down only offers a chip below the ring, Up only one above it. Once
 *     the ring has actually landed on a chip, that same chip is excluded because it *is* the ring's
 *     own position — so the very next press naturally moves past it, with nothing to remember and
 *     nothing to get stuck on.
 *   - Which chip counts as "above" or "below" comes from comparing each chip's actual on-screen
 *     position to the ring's, not from asking the page which element comes first in its markup — the
 *     same rule that governs every other D-pad helper in this project (see AGENTS.md's Decky focus
 *     graph section): the ordinary page most code can query is not the one the reply is actually drawn
 *     into here.
 *   - `focusDrgGlossaryTermChip` moves the ring with a plain `.focus()` call once a chip is chosen,
 *     which only works because a term chip sits inside the same navigation area the ring is already
 *     in — moving *within* one area is fine with a plain call; moving *into* a different one needs the
 *     stronger hand-off call used elsewhere (see answerBubbleElRegistry.ts). It never overwrites a
 *     `tabindex` already on the chip, and it checks whether the move actually worked by asking the
 *     chip's own page for its focused element, not the browser's ordinary global one.
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
