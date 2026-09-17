/**
 * Title: Moving the controller's highlight between a reply's small buttons
 *
 * Purpose: An Ask or Strategy reply on the Main tab has several small controls around it — Retry,
 * Copy, the Helpful / Not really buttons, Read aloud, and Show details — and a person using a
 * controller needs to move the highlight between them with the D-pad. This file keeps a live map
 * from each control's name to the actual on-screen element currently mounted for it, and can move
 * the controller's highlight to any of them by name.
 *
 * Used for: the Ask and Strategy reply D-pad controls on the Main tab, Steam Deck only.
 *
 * Solves: looking a control up with a page-wide element search (`document.querySelector`)
 * sometimes misses it under this plugin's panel setup; registering the real element when it
 * mounts is reliable where a page search is not.
 *
 * Does not: decide where these controls sit on screen, how they look, or send the actual
 * helpful / not-really feedback to the back end. It only remembers which element is which and
 * moves the highlight.
 *
 * Gotchas:
 *   - The order in `REPLY_STOP_ORDER` is the order a person walks the controls with the D-pad,
 *     not a description of where they sit on screen. After two earlier redesigns the controls are
 *     no longer in one row: Retry sits on the question above the answer, Copy sits in the corner
 *     of the answer itself, Helpful and Not really are two buttons below that, and Read aloud and
 *     Show details are two lines under those.
 *   - `ensureFocusable()` only marks an element as reachable by the D-pad (`tabindex="-1"`) when
 *     it actually needs it — a plain button already works without this. Measured on device
 *     2026-08-04: an earlier version stamped that attribute onto every target including the Retry
 *     button itself, and that attribute is what made Retry stop responding to the D-pad in the
 *     first place, because it takes a button out of Steam's own list of controller-reachable
 *     things.
 *   - A greyed control (Helpful / Not really on a stopped reply) stays mounted and registered —
 *     hiding it would lose the "still visible, just not ratable" shape the roadmap calls for — so
 *     `focusRegisteredReplyStop` cannot tell a greyed stop apart from a live one just by trying to
 *     focus it: on the Deck a "disabled" button still takes the D-pad ring (measured 2026-09-16,
 *     plan56-GREYED-STEP-OVER-01-thumbs.json), unlike a browser's native `disabled` attribute,
 *     which refuses focus outright. `setReplyStopUnavailable` is the caller's own answer instead —
 *     the same shape `buildTurnHeaderElement.tsx`'s `retryDisabled` guard already used for Retry
 *     alone, generalised here so every caller of `focusRegisteredReplyStop` gets it for free.
 */

import { elementHasFocus } from "./uiDocument";

export type ReplyStopId =
  | "helpful"
  | "not-really"
  | "retry"
  | "show-details"
  | "show-reasoning"
  | "copy"
  | "read-aloud";

/**
 * Reading order down the reply, top to bottom.
 *
 * These no longer sit in one grid. After D76 and D77 the button row is gone: `retry` is an icon on
 * the question bubble above the answer, `copy` an icon in the answer bubble's bottom-right corner,
 * `helpful` and `not-really` the two buttons under it, and `show-details` the line below them.
 * `read-aloud` is a line of the same shape as `show-details`, sitting just above it (plan 42 step 3).
 * The order below is the order a person walks them, which is what the "which stop has focus?"
 * lookups want; it is not a claim about layout.
 *
 * `show-reasoning` is the one stop that is NOT below the answer: it is the Show reasoning line
 * between the question and the answer, on a turn whose model thought first (plan 57). It sits
 * between `retry` and `copy` because that is where a person meets it walking down — Retry is on
 * the question above it, and Copy is in the answer below it. Only one turn is ever open at a
 * time, so only one such row is ever mounted, which is what lets this single registry hold it.
 */
export const REPLY_STOP_ORDER: readonly ReplyStopId[] = [
  "retry",
  "show-reasoning",
  "copy",
  "helpful",
  "not-really",
  "read-aloud",
  "show-details",
];

const stops = new Map<ReplyStopId, HTMLElement>();
const unavailableStops = new Set<ReplyStopId>();

export function registerReplyStop(id: ReplyStopId, el: HTMLElement | null): void {
  if (el) stops.set(id, el);
  else stops.delete(id);
}

export function getReplyStop(id: ReplyStopId): HTMLElement | null {
  return stops.get(id) ?? null;
}

/**
 * Marks a stop temporarily unavailable to the D-pad walk, without unregistering it — see the
 * "greyed control" gotcha above. `focusRegisteredReplyStop` treats an unavailable stop exactly
 * like one that was never mounted: it returns `false` and leaves the caller's own fallback chain
 * to try the next stop. A caller re-renders every time its own disabled state might have changed,
 * so this is meant to be called unconditionally on every render — passing the same value again is
 * harmless.
 */
export function setReplyStopUnavailable(id: ReplyStopId, unavailable: boolean): void {
  if (unavailable) unavailableStops.add(id);
  else unavailableStops.delete(id);
}

/**
 * Make `el` focusable without disturbing how Steam navigates to it.
 *
 * `tabindex="-1"` takes an element out of Steam's navigation graph. The previous version of this
 * helper stamped it on **every** target it touched, including the reply row and the `<button>`
 * itself, so navigating *into* Retry was what made Retry stop responding to a D-pad press
 * (measured on device 2026-08-04: `tabindex="-1"` on both the utility row and the Retry button).
 * Buttons are focusable natively and need nothing; Steam manages the attribute on its own nodes.
 */
function ensureFocusable(el: HTMLElement): void {
  if (el.hasAttribute("tabindex")) return;
  if (el.matches?.("button, a, input, select, textarea")) return;
  el.setAttribute("tabindex", "-1");
}

/**
 * Feature: Main-tab reply D-pad (the question's Retry, the answer's Copy, Helpful / Not really,
 * and the Show details line).
 * Input: stop id. Output: true if that stop is mounted and focus actually landed.
 *
 * The registered node is the Decky `Button`'s own `<button>`, which is the nav node — try it first
 * and stop as soon as focus lands, rather than focusing three elements in sequence and reporting
 * success either way.
 */
export function focusRegisteredReplyStop(id: ReplyStopId): boolean {
  if (unavailableStops.has(id)) return false;
  const el = stops.get(id);
  if (!el) return false;
  const button = (el.matches?.("button") ? el : el.querySelector?.("button")) as HTMLElement | null;
  const panel = (
    el.matches?.(".Panel.Focusable") ? el : el.closest?.(".Panel.Focusable")
  ) as HTMLElement | null;
  for (const target of [button, el, panel].filter(Boolean) as HTMLElement[]) {
    ensureFocusable(target);
    try {
      target.focus({ preventScroll: true });
    } catch {
      continue;
    }
    if (elementHasFocus(target)) return true;
  }
  return false;
}
