/**
 * Title: Reply stop registry
 * Purpose: Keep a live map of Main-tab reply feedback buttons so D-pad navigation can focus them by id.
 * Used for: Strategy/Ask reply chrome focus graphs on Steam Deck.
 * Solves: Focus targets miss when looked up with document.querySelector under Decky.
 * Does not: Own button layout, styling, or feedback RPC — only register and focus mounted nodes.
 */

import { elementHasFocus } from "./uiDocument";

export type ReplyStopId = "helpful" | "not-really" | "retry" | "show-details" | "copy" | "read-aloud";

/**
 * Reading order down the reply, top to bottom.
 *
 * These no longer sit in one grid. After D76 and D77 the button row is gone: `retry` is an icon on
 * the question bubble above the answer, `copy` an icon in the answer bubble's bottom-right corner,
 * `helpful` and `not-really` the two buttons under it, and `show-details` the line below them.
 * `read-aloud` is a line of the same shape as `show-details`, sitting just above it (plan 42 step 3).
 * The order below is the order a person walks them, which is what the "which stop has focus?"
 * lookups want; it is not a claim about layout.
 */
export const REPLY_STOP_ORDER: readonly ReplyStopId[] = [
  "retry",
  "copy",
  "helpful",
  "not-really",
  "read-aloud",
  "show-details",
];

const stops = new Map<ReplyStopId, HTMLElement>();

export function registerReplyStop(id: ReplyStopId, el: HTMLElement | null): void {
  if (el) stops.set(id, el);
  else stops.delete(id);
}

export function getReplyStop(id: ReplyStopId): HTMLElement | null {
  return stops.get(id) ?? null;
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
